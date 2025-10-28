import mongoose, { mongo, MongooseError } from "mongoose";
import { asyncHandler } from "../utils/async-handler";
import {User} from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import {Task} from "../models/task.models.js";
import {subTask} from "../models/subtask.models.js";
import { ApiResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import { UserRolesEnum, AvailableUserRoles } from "../utils/constants";

const getTasks = asyncHandler(async(req, res) => {
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

const createTask = asyncHandler(async(req, res)=> {
    const {title, description, assignedTo, status} = req.body;
    const {projectId} = req.params;
    
    const project = Project.findById(projectId);

    if(!project) {

        throw new ApiError(404,"Project not found");
    }

    const files = req.files || [];

    const attachments = files.map((file) => {
        return {
            url: `${process.env.SERVER_URL}/images/${file.originalname}`,
            MimeType: file.MimeType,
            size : file.size,
        }
    });

    const task = await Task.create({
        title,
        description,
        project: new mongoose.Types.ObjectId(projectId),
        assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
        status,
        assignedBy: new mongoose.Types.ObjectId(req.user._id),
        attachments,
    });

    return res
    .status(200)
    .json(new ApiResponse(200,task,"Task created successfully"));

})

// getTaskById

const getTaskById  = asyncHandler(async(req, res) => {
    const {taskId} = req.params;

    const task = await Task.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
            }
        },
        {
            $lookup: {
                from : "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedTo",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from : "subtasks",
                localField: "_id",
                foreignField: "task",
                as : "subtasks",
                pipeline: [
                    {
                        $lookup: {
                            from : "users",
                            localField: "createdBy",
                            foreignField: "_id",
                            as: "createdBy",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            createdBy: {
                                $arrayElemAt: ["$createdBy", 0],
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                assignedTo: {
                    $arrayElemAt : ["$assignedTo", 0],
                }
            }
        }

    ]);

    if(!task || task.length === 0) {
        throw new ApiError(404, "Task not found");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,task, "Task fetched successfully"));

});

// updateTask 

const updateTask = asyncHandler(async(req, res) => {
    const {taskId} = req.params;
    const {title, description, status, assignedTo} = req.body;
    
    console.log("Update task request body: ", req.body);

    const existingTask = await Task.findById(taskId);

    if(!existingTask) {
        throw new ApiError(404,"Task not found")
    }

})
