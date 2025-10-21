import mongoose, { mongo } from "mongoose";
import {Project} from "../models/project.models.js";
import {projectMember} from "../models/projectmember.models.js"
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum, AvailableUserRoles } from "../utils/constants.js";
import { User } from "../models/user.models.js"

const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectMember.aggregate([
    {
        $match: {
            user: new mongoose.Types.ObjectId(req.user._id),
        }
    },
    {
        $lookup: {
            from : "project",
            localField: "project",
            foreignField: "_id",
            as : "projects",
            pipeline: [
                {
                    $lookup: {
                        from : "projectmember",
                        localField: "_id",
                        foreignField: "project",
                        as: "projectmembers"
                    }
                },
                {
                    $addFields: {
                        members: {
                            $size: "projectmembers"
                        }
                    }
                },
            ]

        },
    },
    {
        $unwind : "project"
    },
    {
        $project: {
            project: {
                _id: 1,
                name: 1,
                description: 1,
                members: 1,
                createdAt: 1,
                createdBy: 1,
            },
            role: 1,
            _id: 0
        }
    }
  ])


    return res
    .status(200).json(new ApiResponse(200,projects, "Projects fetched successfully"));
})