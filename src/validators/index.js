import { body } from "express-validator";

const userRegisterValidator = () => {
    return [
        body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email is invalid"),
        
        body("username")
        .trim
        .notEmpty()
        .withMessage("Username is required")
        .isLowercase()
        .withMessage("Username must be lowercase")
        .isLenght({min: 3})
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
        .withMessage("Fullname is required")
        
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
        .withMessage("Password is required")

    ]
}