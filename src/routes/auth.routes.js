import { Router } from "express";
import { validate } from "../middlewares/validator.middleware.js";

import {
    registerUser,
    login,
    logout,
    verifyEmail,
    resetPassword,
    forgotPassword,
    changePassword,
    resendVerificationEmail,
    refreshAccessToken,
    getCurrentUser,
    deleteAccount,
} from "../controllers/auth.controllers.js";

import {
    userChangeCurrentPasswordValidator,
    userForgotPasswordValidator,
    userLoginValidator,
    userRegisterValidator,
    userResetPasswordValidator
} from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";



const authRouter = Router();


authRouter.route("/register")
.post(userRegisterValidator(), validate, registerUser);

authRouter.route("/login").post(userLoginValidator(), validate, login);

authRouter.route("/refresh-token").post(refreshAccessToken);

authRouter.route("/verify-email/:verificationToken").get(verifyEmail);

authRouter.route("/forgot-password").post(userForgotPasswordValidator(), validate, forgotPassword);

authRouter.route("/reset-password/:resetToken").post(userResetPasswordValidator(), validate, resetPassword);

authRouter.route("/logout").post(verifyJWT,logout);

authRouter.route("/change-password").post(verifyJWT, userChangeCurrentPasswordValidator(), validate, changePassword);

authRouter.route("/current-user").get(verifyJWT,getCurrentUser);

authRouter.route("/resend-email-verification").post(verifyJWT, resendVerificationEmail);

authRouter.route("/protected").get(verifyJWT, (req, res)=> {
    res.json({message: `hello ${req.user.username}`});
})

authRouter.route("/delete-account").post(verifyJWT,deleteAccount);

export default authRouter;


