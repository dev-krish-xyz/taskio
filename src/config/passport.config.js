import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GithubStrategy } from "passport-github2";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";

// Google OAuth strategy — only register if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL:
                    process.env.GOOGLE_CALLBACK_URL ||
                    "/api/v1/auth/google/callback",
                scope: ["profile", "email"],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    let user = await User.findOne({
                        oauthId: profile.id,
                        oauthProvider: "google",
                    });

                    if (user) {
                        return done(null, user);
                    }

                    user = await User.findOne({ email: profile.emails[0].value });

                    if (user) {
                        user.oauthProvider = "google";
                        user.oauthId = profile.id;
                        user.isEmailVerified = true;
                        user.oauthAvatar = profile.photos?.[0]?.value;
                        await user.save({ validateBeforeSave: false });
                        return done(null, user);
                    }

                    const newUser = await User.create({
                        username:
                            profile.emails[0].value.split("@")[0] + "_" + Date.now(),
                        email: profile.emails[0].value,
                        oauthProvider: "google",
                        oauthId: profile.id,
                        isEmailVerified: true,
                        oauthAvatar: profile.photos?.[0]?.value,
                        password: profile.id + process.env.ACCESS_TOKEN_SECRET,
                    });

                    return done(null, newUser);
                } catch (err) {
                    return done(err, null);
                }
            },
        ),
    );
}

// GitHub OAuth strategy — only register if credentials are configured
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
        new GithubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL:
                    process.env.GITHUB_CALLBACK_URL ||
                    "/api/v1/auth/github/callback",
                scope: ["user:email"],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;

                    if (!email) {
                        return done(
                            new ApiError(400, "No email found in GitHub profile. Please make your email public on GitHub."),
                            null,
                        );
                    }

                    let user = await User.findOne({
                        oauthId: profile.id,
                        oauthProvider: "github",
                    });

                    if (user) {
                        return done(null, user);
                    }

                    user = await User.findOne({ email });

                    if (user) {
                        user.oauthProvider = "github";
                        user.oauthId = profile.id;
                        user.oauthAvatar = profile.photos?.[0]?.value;
                        user.isEmailVerified = true;
                        await user.save({ validateBeforeSave: false });
                        return done(null, user);
                    }

                    const newUser = await User.create({
                        username:
                            profile.username ||
                            email.split("@")[0] + "_" + Date.now(),
                        email,
                        oauthProvider: "github",
                        oauthId: profile.id,
                        isEmailVerified: true,
                        oauthAvatar: profile.photos?.[0]?.value,
                        password: profile.id + process.env.ACCESS_TOKEN_SECRET,
                    });

                    return done(null, newUser);
                } catch (err) {
                    return done(err, null);
                }
            },
        ),
    );
}

// Since we use JWT (session: false), serialize/deserialize are not needed
// but kept minimal to satisfy Passport internals
passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
        );
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
