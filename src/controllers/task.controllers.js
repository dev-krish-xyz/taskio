import mongoose, { mongo, MongooseError } from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";
import {User} from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import {Task} from "../models/task.models.js";
import {SubTask} from "../models/subtask.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { UserRolesEnum, AvailableUserRoles } from "../utils/constants.js";
import { assign } from "nodemailer/lib/shared/index.js";
import { ExpressValidator } from "express-validator";

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
        throw new ApiError(404,"Task not found");
    }

    const existingAttachments = existingTask.attachments || [];

    const files = req.files || [];

    const newAttachments = files.map((file) => {
        return {
            url : `${process.env.SERVER_URL}/images/${file.originalname}`,
            mimetype: file.mimetype,
            size : file.size,
        }
    });

    const allAttachments = [...existingAttachments, ...newAttachments];

    const updateFields = {
        attachments: allAttachments,
        assignedBy : new mongoose.Types.ObjectId(req.user._id)
    }

    if(title !== undefined) updateFields.title = title;
    if(description !== undefined) updateFields.description = description;
    if(status !== undefined) updateFields.status = status;

    if(assignedTo !== undefined) {
        updateFields.assignedTo = assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined;
    }
    else if(existingTask.assignedTo) {
        updateFields.assignedTo = existingTask.assignedTo;
    }

    console.log("update fields: ", updateFields);

    const task = await Task.findByIdAndUpdate(taskId,
        updateFields, {
            new: true,
        }
    ).populate("assignedTo", "username fullName avatar");

    console.log("updated task: ", task);

    return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));

})

// deleteTask

const deleteTask = asyncHandler(async(req, res) => {
    const {taskId, projectId} = req.params;

    const deletedTask = await Task.findByIdAndDelete(taskId);
    if(!deletedTask) {
        throw new ApiError(404,"Task not found");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,deletedTask, "Task deleted successfully"));
})

// createSubtask

const createSubtask = asyncHandler(async(req, res) => {
    const {taskId} = req.params;
    const {title} = req.body;

    if(!title) {
        throw new ApiError(400,"Title is required");
    }

    const task = await Task.findById(taskId);
    if(!task) {
        throw new ApiError(404,"Task not found");
    }

    const subTask = await SubTask.create({
        title,
        task: new mongoose.Types.ObjectId(taskId),
        createdBy: new mongoose.Types.ObjectId(req.user._id),
    })

    return res
    .status(200)
    .json(new ApiResponse(200, subTask,"Subtask created successfully"));
})

// updateSubtask 

const updateSubtask = asyncHandler(async(req, res) => {
    const {subtaskId} = req.params;
    const {title, isCompleted} = req.body;

    let subTask = await SubTask.findById(subtaskId);

    if(!subTask) {
        throw new ApiError(404,"Subtask not found");
    }

    subTask = await SubTask.findByIdAndUpdate(
        subtaskId,
        {
            title: [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(req?.user?.role) ? title : undefined,
            isCompleted,
        },
        {
            new: true
        }
    );

    return res
    .status(200)
    .json(new ApiResponse(200,subTask,"Subtask updated successfully"));
});

// delete Subtask

const deleteSubtask = asyncHandler(async(req, res) => {
    const {subtaskId} = req.params;
    console.log(subtaskId);
    const found = await SubTask.findById(subtaskId);
    console.log(found);
    const deletedSubtask = await SubTask.findByIdAndDelete(subtaskId);

    if(!deletedSubtask) {
        throw new ApiError(404,"Subtask not found");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, deletedSubtask, "Subtask deleted successfully"));

});

export {
    createTask,
    deleteTask,
    updateTask,
    getTaskById,
    getTasks,
    createSubtask,
    updateSubtask,
    deleteSubtask
}