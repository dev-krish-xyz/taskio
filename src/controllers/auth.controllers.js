import {asyncHandler} from "../utils/async-handler.js";
import {User} from "../models/user.models.js";
import { forgotPasswordMailgenContent, sendEmail } from "../utils/mail.js";
import { emailVerificationMailgenContent } from "../utils/mail.js";
import crypto from "crypto";
import { ApiResponse } from "../utils/api-response.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import CookieParser from "cookieparser";
import { ApiError } from "../utils/api-error.js";

// register user

const registerUser = asyncHandler(async (req, res) => {
    const {email, username, password, role} = req.body;
    if(!email || !username || !password || !role) {
        return res.status(402).json(new ApiResponse(402,null,"All fields are required"))
    }
        const existingUser = await User.findone({email});
        if(existingUser){
            return res.status(404).json(new ApiResponse(404, existingUser, "User already exist"))
        }
        const newUser = await User.create({
            username,
            email,
            password,
        })
        console.log(newUser);
        console.log(newUser.email);
        const token  = crypto.randomBytes(32).toString('hex');

        newUser.emailVerificationToken = token;
        await newUser.save();

        if(!newUser) {
           res.status(400).json(new ApiResponse(400,null,"User not registerd"))
        }
       

        const verificationUrl = `${process.env.BASE_URL}/verify-email?token = ${emailVerificationToken}`;
        
        const mailgenContent = emailVerificationMailgenContent(username, verificationUrl);

        await sendEmail({
            email : newUser.email,
            subject: "Verify your email - taskio",
            mailgenContent,
        })
       res.status(201).json(new ApiResponse(201, {userid: newUser._id, email: newUser.email},"Verification email sent successfully"));
    
    
} );

// verfiy user

const verifyUser = asyncHandler(async(req, res) => {
    const {token} = req.query;

    if(!token) {
        return res.status(400).json(new ApiResponse(400,null, "Token is missing"));
    }

    const newUser = await User.findOne({emailVerificationToken : token});

    if (!newUser) {
        return res.status(400).json(new ApiResponse(400,null,"Invalid or expired token"));
    }
    newUser.isEmailVerified = true;
    newUser.emailVerificationToken = undefined;
    await newUser.save();

    res.status(200).json(new ApiResponse(200,null,"User verified successfully"));
})

// login user

const login = asyncHandler(async (req, res) => {
    const {email, password} = req.body;

    if(!email || !password) {
        return res.status(400).json(new ApiResponse(400,null, "All fields are required"))
    }
    
    const user = await User.findone({email});
        if(!user) {
            return res.status(400).json(new ApiResponse(400,email, "Invalid user & password"))
        }
    const isMatch = user.isPasswordCorrect(password);

        console.log(isMatch);

        if(!isMatch) {
            return res.status(400).json(new ApiResponse(400, null,"Invalid password" ));
        }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    const cookieOptions = {
        httpOnly : true,
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
    }

    res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken,cookieOptions)
    .json(new ApiResponse(200,{user : {
        id: user._id,
        email : user.email,
        username: user.username,
    }},"Login successfull"))

    });

// get profile data

const getMe = asyncHandler(async(req, res) => {
    const user = User.findById(req.user.id).select('-password');
    if(!user) {
        return res.status(400).json(new ApiResponse(400,null,"User not found"));
    }
    res.status(200).json(new ApiResponse(200,user,"You are inside the account"))
})

// logout user

const logout = asyncHandler(async(req,res) => {
    const user = await User.findById(req.user._id);

    user.refreshToken = null;
    await user.save();

    res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .status(200)
    .json(new ApiResponse(200,null,"Logged out successfully"))
})

// forgot password

const forgotPassword = asyncHandler(async(req, res) => {
    const {email} = req.body;

    if(!email) {
        return res.status(400).json(400, null, "Please provide email");
    }
    const user = User.findOne({email});
    if(!user) {
        res.status(400).json(400, null,"User with this email not exist")
    }
    const {hashedToken, unHashedToken, tokenExpiry} = user.gernerateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;
    await user.save();

    const resetPasswordURL = `${process.env.BASE_URL}/api/users/reset-password?token= ${unHashedToken}`;
    console.log(`reset password link: ${resetPasswordURL}`);

    const mailgenContent = forgotPasswordMailgenContent(user.username, resetPasswordURL);

    await sendEmail({
        email : user.email,
        subject : "Reset your password through this link",
        mailgenContent,
    })

    res.status(200).json(new ApiResponse(200, null,"Password reset link sent to your email"));

});

// reset password

const resetPassword = asyncHandler(async(req, res) => {
    const {token} = req.query;
    const {newPassword, confPassword} = req.body;
    if(newPassword != confPassword) {
        return res.status(400).json(400,null,"Passwords did not match");
    }

    if(!token || !newPassword || !confPassword) {
        return res.status(400).json(400,null,"New password required");
    }
    const hashedToken = crypto.createHash("sha265").update(token).digest("hex");

    const user = User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: {$gt: Date.now()},ggoog
    })
    if(!user) {
        return res.status(400).json(new ApiResponse(400,null,"Token invalid or expired"));
    }

    // replace the old password
    user.password = newPassword;
    user.forgotPasswordExpiry = undefined;
    user.forgotPasswordToken = undefined;

    await user.save();

    res.status(200).json(new ApiResponse(200,null, "Password reset successfull"));

})

const refreshToken = asyncHandler(async(req, res) => {
  const generateRefreshToken = asyncHandler(async(req, res) => {
    const {refreshToken} = req.body;

    if(!refreshToken){
        return res.status(400).json(new ApiResponse(400, null,"No refresh token provided"));
    }
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async(err,decoded) => {
        if(err) {
            return res.status(403).json(new ApiResponse(403,null,"Invalid or expired refresh token"));
        }
    });
    
    const user = await User.findById(decoded._id);

    if(!user || user.refreshToken !== refreshToken) {
        return res.status(403).json(new ApiResponse(403,null,"Refresh token invalid"));
    }

    const newAccessToken = user.generateAccessToken();

    res.status(200).json(new ApiResponse(200,newAccessToken, "Access token sent"));

  });

});

// refresh toke 



   

export {registerUser, verifyUser, login, getMe, logout, forgotPassword, resetPassword} ;


// remaining

//login controller revamp ( access token, refresh token)
// refresh token controller
// logout controller
// change password
// resend email verification
// delete accountw