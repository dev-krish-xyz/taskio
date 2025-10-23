import jwt from "jsonwebtoken";
import {User} from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";
import { ProjectMember } from "../models/projectmember.models.js";


// verifyJWT

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


// validateProjectPermission

export const validateProjectPermission = ( roles = []) => {
    return asyncHandler(async(req, res, next) => {
        const {projectId} = req.params;

        if (!projectId) {
            throw new ApiError(404, "Project id is missing");
        } 
        const project = await ProjectMember.findOne({
            project: new mongoose.Types.ObjectId(projectId),
            user: new mongoose.Types.ObjectId(req.user._id)
        }) 

        if(!project) {
            throw new ApiError(404, "Project not found");
        }

        const givenRole = project?.role;

        req.user.role = givenRole;

        if(!roles.includes(givenRole)) {
            throw new ApiError(403,"You do not have permission to perform this action");
        }

        next();
    })
}
