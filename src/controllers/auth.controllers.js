import { asyncHandler } from "../utils/async-handler.js";
import { User } from "../models/user.models.js";
import {
  forgotPasswordMailgenContent,
  sendEmail,
  emailVerificationMailgenContent,
} from "../utils/mail.js";
import { ApiResponse } from "../utils/api-response.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/api-error.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateRefreshAccessTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Something went wrong while generating access token");
  }
};


// register user

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, fullName } = req.body;
  if (!email || !username || !password) {
    throw new ApiError(400, "Email, username and password are required");
  }
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  const newUser = await User.create({
    username,
    email,
    password,
    fullName,
    isEmailVerified: false,
  });

  const { unHashedToken, hashedToken, tokenExpiry } = newUser.generateTemporaryToken();
  newUser.emailVerificationToken = hashedToken;
  newUser.emailVerificationExpiry = tokenExpiry;
  await newUser.save({ validateBeforeSave: false });

  const verificationUrl = `${process.env.FRONT_END_URL}/auth/verify-email/${unHashedToken}`;

  const mailgenContent = emailVerificationMailgenContent(
    newUser.username,
    verificationUrl,
  );

  await sendEmail({
    email: newUser.email,
    subject: "Please verify your email",
    mailgenContent,
  });

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdUser },
        "User registered successfully. Verification email sent.",
      ),
    );
});

// verify email

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new ApiError(400, "Email verification token is missing");
  }
  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }
  user.isEmailVerified = true;
  user.emailVerificationExpiry = undefined;
  user.emailVerificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email verified successfully"));
});

// login user

const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(400, "User does not exist");
  }
  const isPasswordMatch = await user.isPasswordCorrect(password);

  if (!isPasswordMatch) {
    throw new ApiError(400, "Invalid credentials");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  const { accessToken, refreshToken } = await generateRefreshAccessTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  const accessCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000, // 1 day — matches ACCESS_TOKEN_EXPIRY
    sameSite: "Lax",
    path: "/",
  };

  const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days — matches REFRESH_TOKEN_EXPIRY
    sameSite: "Lax",
    path: "/",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Login successful",
      ),
    );
});

// get current user

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// logout user

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: "" } },
    { new: true },
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
  };

  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out"));
});

// forgot password

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Please provide email");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const { hashedToken, unHashedToken, tokenExpiry } = user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  const resetPasswordURL = `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`;

  const mailgenContent = forgotPasswordMailgenContent(user.username, resetPasswordURL);

  await sendEmail({
    email: user.email,
    subject: "Reset your password",
    mailgenContent,
  });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset link sent to your email"));
});

// reset password

const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword, confPassword } = req.body;

  if (!resetToken || !newPassword || !confPassword) {
    throw new ApiError(400, "All fields are required");
  }
  if (newPassword !== confPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.password = newPassword;
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  await user.save({ validateBeforeSave: true });

  res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});

// refresh access token

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
    };

    const { accessToken, refreshToken: newRefreshToken } = await generateRefreshAccessTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed"));
  } catch (err) {
    throw new ApiError(401, err?.message || "Invalid or expired refresh token");
  }
});

// change password

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Please provide both the fields");
  }
  const userId = req.user?._id;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const isMatch = await user.isPasswordCorrect(oldPassword);
  if (!isMatch) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

// resend email verification

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(400, "User does not exist");
  }
  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }

  const { hashedToken, unHashedToken, tokenExpiry } = user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${process.env.FRONT_END_URL}/auth/verify-email/${unHashedToken}`;
  const mailgenContent = emailVerificationMailgenContent(user.username, verificationUrl);

  await sendEmail({
    email: user.email,
    subject: "Verify your email",
    mailgenContent,
  });
  res.status(200).json(new ApiResponse(200, {}, "Verification email sent again"));
});

// delete account

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  await User.findByIdAndDelete(userId);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
  };
  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json(new ApiResponse(200, null, "Account deleted successfully"));
});

// update avatar

const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete old avatar file if it exists
  if (user.avatar?.localpath) {
    const oldPath = path.join(__dirname, "..", user.avatar.localpath);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  user.avatar = {
    url: `${process.env.SERVER_URL}/images/${req.file.filename}`,
    localpath: `public/images/${req.file.filename}`,
  };
  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );

  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

export {
  generateRefreshAccessTokens,
  registerUser,
  verifyEmail,
  login,
  logout,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  resendVerificationEmail,
  deleteAccount,
  getCurrentUser,
  changePassword,
  updateAvatar,
};
