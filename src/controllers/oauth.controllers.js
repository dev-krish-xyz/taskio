import { asyncHandler } from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import {ApiResponse} from "../utils/api-response";
import { generateRefreshAccessTokens } from "./auth.controllers";
import { User } from "../models/user.models";
import { response } from "express";


// google Oauth callback handler

const googleCallback = asyncHandler(async(req, res) => {
    try {
        const user = req.user;
        if(!user) {
            throw new ApiError(401,"Google authentication faild");
        }

        const {accessToken, refreshToken} = await generateRefreshAccessTokens(user._id);

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge : 24 * 60 * 60 * 1000,
            sameSite: "Lax",
            path: "/",
        }

        const loggedInUser = await User.findById(user._id).safe();

        const redirectUrl = `${process.env.FRONT_END_URL}/auth/success?token=${accessToken}`;

        res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .redirect(redirectUrl);

    }

    catch(error) {

        const errorRedirectUrl = `${process.env.FRONT_END_URL}/auth/error?message=${encodeURIComponent(error.message)}`;
        res.redirect(errorRedirectUrl);

    }
})



// github callback handler

const githubCallback = asyncHandler(async(req, res) => {
    try {
        const user = req.user;
        
        if(!user) {
            throw new ApiError(401, "Github authentication failed");
        }

        const {accessToken, refreshToken} = generateRefreshAccessTokens(user._id);

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge : 24 * 60 * 60 * 1000,
            sameSite: "Lax",
            path: "/",
        }

        const loggedInUser = await User.findById(user._id).safe();

        const redirectUrl = `${process.env.FRONT_END_URL}/auth/success?token=${accessToken}`;

        res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .redirect(redirectUrl);

    }

    catch(error) {
         const errorRedirectUrl = `${process.env.FRONT_END_URL}/auth/error?message=${encodeURIComponent(error.message)}`;
        res.redirect(errorRedirectUrl);

    }
})

// unlink Oauth provider


const unlinkOauthProvider = asyncHandler(async(req, res) => {
    const {newPassword} = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if(!user) {
        throw new ApiError(404, "User not found");
    }
    if(!user.oauthProvider) {
        throw new ApiError(400, "No auth provided is linked to this account");
    }

    if(!newPassword) {
        throw new ApiError(400, "Password is required to unlink the account");
    }

    user.oauthProvider = null;
    user.oauthId = null;
    user.password = newPassword;

    await user.save({validateBeforeSave: true});

    res
    .status(200)
    .json(new ApiResponse(200, {}, "Oauth provided unlinked successfully, you can now login with email and password"));
});



export {
    googleCallback,
    githubCallback,
    unlinkOauthProvider
}