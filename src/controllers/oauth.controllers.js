import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { generateRefreshAccessTokens } from "./auth.controllers.js";
import { User } from "../models/user.models.js";

const SAFE_SELECT = "-password -refreshToken -emailVerificationToken -emailVerificationExpiry";

const accessCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: "Lax",
    path: "/",
};

const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    sameSite: "Lax",
    path: "/",
};

const googleCallback = asyncHandler(async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            throw new ApiError(401, "Google authentication failed");
        }

        const { accessToken, refreshToken } = await generateRefreshAccessTokens(user._id);

        const redirectUrl = `${process.env.FRONT_END_URL}/auth/success?token=${accessToken}`;

        res
            .status(200)
            .cookie("accessToken", accessToken, accessCookieOptions)
            .cookie("refreshToken", refreshToken, refreshCookieOptions)
            .redirect(redirectUrl);
    } catch (error) {
        const errorRedirectUrl = `${process.env.FRONT_END_URL}/auth/error?message=${encodeURIComponent(error.message)}`;
        res.redirect(errorRedirectUrl);
    }
});

const githubCallback = asyncHandler(async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            throw new ApiError(401, "Github authentication failed");
        }

        const { accessToken, refreshToken } = await generateRefreshAccessTokens(user._id);

        const redirectUrl = `${process.env.FRONT_END_URL}/auth/success?token=${accessToken}`;

        res
            .status(200)
            .cookie("accessToken", accessToken, accessCookieOptions)
            .cookie("refreshToken", refreshToken, refreshCookieOptions)
            .redirect(redirectUrl);
    } catch (error) {
        const errorRedirectUrl = `${process.env.FRONT_END_URL}/auth/error?message=${encodeURIComponent(error.message)}`;
        res.redirect(errorRedirectUrl);
    }
});

const unlinkOauthProvider = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }
    if (!user.oauthProvider) {
        throw new ApiError(400, "No OAuth provider is linked to this account");
    }
    if (!newPassword) {
        throw new ApiError(400, "Password is required to unlink the account");
    }

    user.oauthProvider = null;
    user.oauthId = null;
    user.password = newPassword;

    await user.save({ validateBeforeSave: true });

    res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "OAuth provider unlinked successfully. You can now login with email and password.",
            ),
        );
});

export { googleCallback, githubCallback, unlinkOauthProvider };
