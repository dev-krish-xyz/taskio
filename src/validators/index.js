import { body } from "express-validator";
import {
  AvailableTaskStatuses,
  AvailableUserRoles,
} from "../utils/constants.js";

const userRegisterValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),

    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .isLowercase()
      .withMessage("Username must be lowercase")
      .isLength({ min: 3 })
      .withMessage("Username must be atleast 3 characters long"),

    body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isStrongPassword()
      .withMessage("Please use a strong password"),

    body("fullName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Fullname is required"),
  ];
};

const userLoginValidator = () => {
  return [
    body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email"),

    body("username")
    .optional(),

    body("password")
    .notEmpty()
    .withMessage("Password is required"),
  ];
};

const userChangeCurrentPasswordValidator = () => {
    return [
        body("oldPassword")
        .notEmpty()
        .withMessage("Old password is required"),

        body("newPassword")
        .notEmpty()
        .withMessage("New password is required")
        .isStrongPassword()
        .withMessage("New password must be strong enough")
    ];
};

const userForgotPasswordValidator = () => {
    return [
        body("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please enter a valid email")
    ];
};

const userResetPasswordValidator = () => { 
    return [
        body("newPassword")
        .notEmpty()
        .withMessage("New password is required")
    ]
}

export {
  userRegisterValidator,
  userForgotPasswordValidator,
  userChangeCurrentPasswordValidator,
  userLoginValidator,
  userResetPasswordValidator,
}