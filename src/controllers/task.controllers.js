import mongoose, { mongo } from "mongoose";
import { asyncHandler } from "../utils/async-handler";
import {User} from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import {Task} from "../models/task.models.js";
import {subTask} from "../models/subtask.models.js";
import { ApiResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import { UserRolesEnum, AvailableUserRoles } from "../utils/constants";

const getTask = asyncHandler(async(req, res) => {
    const {projectId} = req.params;
    const project = await Project.findById(projectId);

    if(!project) {
        throw new ApiError(404,"Project not found");
    }

    const tasks = await Task.find({
        project: new mongoose.Types.ObjectId(projectId),
    }).populate("assignedTo", "username fullName avatar");

    return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});
