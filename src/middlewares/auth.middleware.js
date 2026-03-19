import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";
import { ProjectMember } from "../models/projectmember.models.js";

const SAFE_SELECT = "-password -refreshToken -emailVerificationToken -emailVerificationExpiry";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }
    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select(SAFE_SELECT);

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }
        req.user = user;
        next();
    } catch (err) {
        throw new ApiError(401, err?.message || "Invalid access token");
    }
});

export const validateProjectPermission = (roles = []) => {
    return asyncHandler(async (req, res, next) => {
        const { projectId } = req.params;

        if (!projectId) {
            throw new ApiError(400, "Project id is missing");
        }

        const membership = await ProjectMember.findOne({
            project: new mongoose.Types.ObjectId(projectId),
            user: new mongoose.Types.ObjectId(req.user._id),
        });

        if (!membership) {
            throw new ApiError(403, "You are not a member of this project");
        }

        const givenRole = membership.role;
        req.user.role = givenRole;

        if (roles.length > 0 && !roles.includes(givenRole)) {
            throw new ApiError(403, "You do not have permission to perform this action");
        }

        next();
    });
};
