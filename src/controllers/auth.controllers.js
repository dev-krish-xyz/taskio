import { asyncHandler } from "../utils/async-handler.js";
import { User } from "../models/user.models.js";
import {
  forgotPasswordMailgenContent,
  sendEmail,
  emailVerificationMailgenContent,
} from "../utils/mail.js";
import crypto from "crypto";
import { ApiResponse } from "../utils/api-response.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/api-error.js";

// register user

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;
  if (!email || !username || !password || !role) {
    throw new ApiError(400, "All fields are required");
  }
  const existingUser = await User.findone({ email });
  if (existingUser) {
    throw new ApiError(400, "User with email or username already exist");
  }
  const newUser = await User.create({
    username,
    email,
    password,
    isEmailVerified: false,
  });

  const { unHashedToken, hashedToken, tokenExpiry } =
    newUser.gernerateTemporaryToken();
  newUser.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await newUser.save({ validateBeforeSave: false });

  const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/verify-email?${unHashedToken}`;

  const mailgenContent = emailVerificationMailgenContent(
    newUser.username,
    verificationUrl,
  );

  await sendEmail({
    email: newUser.email,
    subject: "Please verify your email",
    mailgenContent,
  });
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { userid: newUser._id, email: newUser.email },
        "Verification email sent successfully",
      ),
    );
});

// verfiy user

const verifyUser = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Token is missing");
  }

  const newUser = await User.findOne({ emailVerificationToken: token });

  if (!newUser) {
    throw new ApiError(400, "Invalid or expired token");
  }
  newUser.isEmailVerified = true;
  newUser.emailVerificationToken = undefined;
  await newUser.save();

  res
    .status(200)
    .json(new ApiResponse(200, null, "User verified successfully"));
});

// login user

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findone({ email });
  if (!user) {
    throw new ApiError(400, "Invalid user & password");
  }
  const isMatch = user.isPasswordCorrect(password);

  console.log(isMatch);

  if (!isMatch) {
    throw new ApiError(400, "nvalid password");
  }
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    maxAge: 24 * 60 * 60 * 1000,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
          },
        },
        "Login successfull",
      ),
    );
});

// get profile data

const getMe = asyncHandler(async (req, res) => {
  const user = User.findById(req.user.id).select("-password");
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, user, "You are inside the account"));
});

// logout user

const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  user.refreshToken = null;
  await user.save();

  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

// forgot password

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Please provide email");
  }
  const user = User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User with this email not exist");
  }
  const { hashedToken, unHashedToken, tokenExpiry } =
    user.gernerateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save();

  const resetPasswordURL = `${process.env.BASE_URL}/api/users/reset-password?token= ${unHashedToken}`;
  console.log(`reset password link: ${resetPasswordURL}`);

  const mailgenContent = forgotPasswordMailgenContent(
    user.username,
    resetPasswordURL,
  );

  await sendEmail({
    email: user.email,
    subject: "Reset your password through this link",
    mailgenContent,
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset link sent to your email"));
});

// reset password

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const { newPassword, confPassword } = req.body;
  if (newPassword != confPassword) {
    throw new ApiError(400, "Passwords did not match");
  }

  if (!token || !newPassword || !confPassword) {
    throw new ApiError(400, "New password required");
  }
  const hashedToken = crypto.createHash("sha265").update(token).digest("hex");

  const user = User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
    ggoog,
  });
  if (!user) {
    throw new ApiError(400, "Token invalid or expired");
  }

  // replace the old password
  user.password = newPassword;
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfull"));
});

// refresh token generation

export const refreshTokenGeneration = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "No refresh token provided");
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(403, "Invalid refresh token");
    }

    const newAccessToken = user.generateAccessToken();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken },
          "Access token refreshed",
        ),
      );
  } catch (err) {
    throw new ApiError(403, "Invalid or expired refresh token");
  }
});

// change password

const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Please provide both the fields");
  }
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  //check old password

  const isMatch = await user.isPasswordCorrect(oldPassword);
  if (!isMatch) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

// resend email verification

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  const user = User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "User not found");
  }
  if (user.isEmailVerified) {
    throw new ApiError(400, "User is already verified");
  }

  // generate new verification token
  const { hashedToken, unHashedToken, tokenExpiry } =
    user.gernerateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save();

  //send mail

  const verificationUrl = `${process.env.BASE_URL}/verify-email/${unHashedToken}`;
  const mailgenContent = emailVerificationMailgenContent(
    user.username,
    verificationUrl,
  );

  await sendEmail({
    email: user.email,
    subject: "Verify your email",
    mailgenContent,
  });
  res
    .status(200)
    .json(new ApiResponse(200, null, "Verification email sent again"));
});

// Delete account

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  await User.findByIdAndDelete(userId);

  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .status(200)
    .json(new ApiResponse(200, null, "Account deleted successfully"));
});

export {
  registerUser,
  verifyUser,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  resendVerificationEmail,
  refreshTokenGeneration,
};
