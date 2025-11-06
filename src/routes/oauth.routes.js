import { Router } from "express";
import passport from "passport";
import {
  googleCallback,
  githubCallback,
  unlinkOauthProvider,
} from "../controllers/oauth.controllers";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { ExpressValidator } from "express-validator";

const oauthRouter = Router();

// google routes

oauthRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false, //using jwt not sessions
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

//github routes

oauthRouter.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user.email"],
    session: false,
  }),
);


oauthRouter.get("/github/callback",
    passport.authenticate("github", {
        session: false,
        failureRedirect: `${process.env.FRONT_END_URL}/auth/error`
    }),
    githubCallback
 )


 //unlink auth provider


 oauthRouter.post("/unlink-oauth", verifyJWT, unlinkOauthProvider);


 export default oauthRouter;