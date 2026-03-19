import { Router } from "express";
import passport from "passport";
import {
    googleCallback,
    githubCallback,
    unlinkOauthProvider,
} from "../controllers/oauth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const oauthRouter = Router();

oauthRouter.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false,
    }),
);

oauthRouter.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: `${process.env.FRONT_END_URL}/auth/error`,
    }),
    googleCallback,
);

oauthRouter.get(
    "/github",
    passport.authenticate("github", {
        scope: ["user:email"],
        session: false,
    }),
);

oauthRouter.get(
    "/github/callback",
    passport.authenticate("github", {
        session: false,
        failureRedirect: `${process.env.FRONT_END_URL}/auth/error`,
    }),
    githubCallback,
);

oauthRouter.post("/unlink-oauth", verifyJWT, unlinkOauthProvider);

export default oauthRouter;
