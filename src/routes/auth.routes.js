import { Router } from "express";
import { registerUser } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import {userRegistrationValidator} from "../validators/index.js";

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
} from "../controllers/auth.controllers.js";

import {
    userChangeCurrentPasswordValidator,
    userForgotPasswordValidator,
    userLoginValidator,
    userRegisterValidator,
    userResetPasswordValidator
} from "../validators/index.js";



const router = Router();

router.route("/register")
.post(userRegistrationValidator(), validate, asyncHandler(registerUser));

export default router;


