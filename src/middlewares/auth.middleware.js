import jwt from "jsonwebtoken";
import {User} from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";

export const verifyJWT = asyncHandler(async(req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if(!token) {
        throw new ApiError(401, "Unauthorized request");
    }
    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log(decodedToken);
        const user = await User.findById(decodedToken?._id).safe();
        console.log(user);

        if(!user) {
            throw new ApiError(401,"Invalid access token");
        }
        req.user = user;
        next();
    }
    catch(err) {
        throw new ApiError(401,err?.message || "Invalid access token");
    }

});
