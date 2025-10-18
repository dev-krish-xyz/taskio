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
import { error } from "console";
import crypto from "crypto";
import { access } from "fs";

const generateRefreshAccessTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({validateBeforeSave: false});
    return {accessToken, refreshToken};
  }

  catch (err) {
    throw new ApiError(500,"Something went wrong while generating access token");
  }
};


// register user

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;
  if (!email || !username || !password || !role) {
    throw new ApiError(400, "All fields are required");
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User with email or username already exist");
  }
  const newUser = await User.create({
    username,
    email,
    password,
    isEmailVerified: false,
  });

  const { unHashedToken, hashedToken, tokenExpiry } = newUser.generateTemporaryToken();
  newUser.emailVerificationToken = hashedToken;
  newUser.emailVerificationExpiry = tokenExpiry;
  await newUser.save({ validateBeforeSave: false });

  const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`;

  const mailgenContent = emailVerificationMailgenContent(
    newUser.username,
    verificationUrl,
  );

  await sendEmail({
    email: newUser.email,
    subject: "Please verify your email",
    mailgenContent,
  });

  const createdUser = await User.findById(newUser._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry");
  if(!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { userid: newUser._id, email: newUser.email },
        "User registered successfully and verification mail has been sent to your email.",
      ),
    );
});

// verfiy email

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new ApiError(400, "Email verification token is missing");
  }
  let hashedToken = crypto
  .createHash("sha256")
  .update(verificationToken)
  .digest("hex");

  const newUser = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: {$gt: Date.now()},
  });

  if (!newUser) {
    throw new ApiError(400, "Token is invalid or expired");
  }
  newUser.isEmailVerified = true;
  newUser.emailVerificationExpiry = undefined;
  newUser.emailVerificationToken = undefined;
  await newUser.save({validateBeforeSave: false});

  res
    .status(200)
    .json(new ApiResponse(200, {isEmailVerified: true}, "Email verified successfully"));
});

// login user

const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "All fields are required");
  }
  if(!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({$or: [{username}, {email}]});
  if (!user) {
    throw new ApiError(400, "User does not exist");
  }
  const isPasswordMatch = await user.isPasswordCorrect(password);

  console.log(isPasswordMatch);

  if (!isPasswordMatch) {
    throw new ApiError(400, "Invalid user cradentials");
  }

  const {accessToken, refreshToken} = await generateRefreshAccessTokens(user._id);


  const loggedInUser = await User.findById(user._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry");

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "Lax",
    path: "/",
    
  };
  

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "Login successfull",
      ),
    );
});

// get profile data

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
});

// logout user

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id,
    {$set: {
      refreshToken: "",
    },
    },
    {new : true},
  )

  const cookieOptions = {
    httpOnly:true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
  }

  res
  .status(200)
  .clearCookie("accessToken", cookieOptions)
  .clearCookie("refreshToken", cookieOptions)
  .json(new ApiResponse(200, {},"User logged out"));
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
  const { hashedToken, unHashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({validateBeforeSave: false});

  const resetPasswordURL = `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`;

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
    .json(new ApiResponse(200, {}, "Password reset link sent to your email"));
});

// reset password

const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword, confPassword } = req.body;
  if (newPassword != confPassword) {
    throw new ApiError(400, "Passwords did not match");
  }

  if (!resetToken || !newPassword || !confPassword) {
    throw new ApiError(400, "New password required");
  }
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(400, "Token invalid or expired");
  }

  // replace the old password
  user.password = newPassword;
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  await user.save({validateBeforeSave: true});

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

// refresh token generation

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
    if(incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401,"Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure : process.env.NODE_ENV === "production",
    }

   const {accessToken,refreshToken : newRefreshToken} = await generateRefreshAccessTokens(user._id);

   user.refreshToken = newRefreshToken;
   await user.save();

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(new ApiResponse(200,{accessToken, refreshToken: newRefreshToken}, "Access token refreshed"));
  } catch (err) {
    console.log("Invalid or expired refresh token", err);
    throw new ApiError(401,error?.message || "Invalid or expired refresh token");
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

  //check old password

  const isMatch = await user.isPasswordCorrect(oldPassword);
  if (!isMatch) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false});

  res 
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// resend email verification

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(400, "User does not exist");
  }
  if(user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }

  // generate new verification token
  const { hashedToken, unHashedToken, tokenExpiry } = await
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({validateBeforeSave: false});

  //send mail

  const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`;
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
    .json(new ApiResponse(200, {}, "Verification email sent again"));
});

// Delete account

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
  }
  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json(new ApiResponse(200, null, "Account deleted successfully"));
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
changePassword
};
