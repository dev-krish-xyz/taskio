import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import {Strategy as GithubStrategy} from "passport-github2";
import {User} from "../models/user.models.js";
import {asyncHandler} from "../utils/async-handler.js"
import {ApiError} from "../utils/api-error.js";

// Google Oauth strategy
passport.use(
    new GoogleStrategy (
        {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL : "/api/v1/auth/google/callback",
        scope: ["profile", "email"],
    },
   asyncHandler(async (accessToken, refreshToken, profile, done) => {
    let user = await User.findOne({oauthId: profile.id, oauthProvider: "google"});

    if(user) {
        return done(null, user);
    }

    user = await User.findOne({email : profile.emails[0].value});

    if(user) {
        user.oauthProvider = "google";
        user.oauthId = profile.id;
        user.isEmailVerified = true;
        user.avatar = profile.photos[0]?.value;
        await user.save({validateBeforeSave: false});
        return done(null,user);
    }

    const newUser = await User.create( {
        username : profile.emails[0].value.split("@")[0] + "_" + Date.now(),
        email: profile.emails[0].value,
        oauthProvider: "google",
        oauthId: profile.id,
        isEmailVerified: true,
        avatar: profile.photos[0]?.value,
        role: "user",
    });

    return done(null, newUser, "new user created");

   })

    )
);


// Github Oauth Strategy 

passport.use( 
    new GithubStrategy( {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/v1/auth/github/callback",
        scope:["user.email"],
    },
    asyncHandler(async(accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0].value;

        if(!email) {
            return done(new ApiError("No email found in github"), null);
        }

        let user = await User.findOne({oauthId: profile.id, oauthProvider:"github"});

        if(user) {
            return done(null, user);
        }

        user = await User.findOne({email});

        if(user) {
            user.oauthProvider = "github";
            user.oauthId = profile.id;
            user.oauthAvatar = profile.photos?.[0].value;
            user.isEmailVerified = true;
            await user.save({validateBeforeSave : false});
            return done(null, user);
        }

        const newUser = User.create({
            username: profile.username || email.split("@")[0] + "_" + Date.now(),
            email,
            oauthProvider: "github",
            oauthId: profile.id,
            isEmailVerified: true,
            avatar: profile.photosp[0].value,
            role: "user",
        });

        return done(null, newUser, "New user created successfully");
    })


)
);


// serealize user

passport.serializeUser((user, done) =>  {
    done(null,user._id);
})


//deserealize user

passport.deserializeUser((user, done) => {
    asyncHandler(async(id, done) => {
        const user = await User.findById(id).select("-password -refreshToken");
        done(null, user);
    })
})


export default passport;