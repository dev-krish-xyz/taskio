import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";
import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
import { SubTask } from "../models/subtask.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { UserRolesEnum } from "../utils/constants.js";

const getTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const tasks = await Task.find({
        project: new mongoose.Types.ObjectId(projectId),
    }).populate("assignedTo", "username fullName avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
    const { title, description, assignedTo, status } = req.body;
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const files = req.files || [];

    const attachments = files.map((file) => ({
        url: `${process.env.SERVER_URL}/images/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
    }));

    const task = await Task.create({
        title,
        description,
        project: new mongoose.Types.ObjectId(projectId),
        assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
        status: status || "todo",
        assignedBy: new mongoose.Types.ObjectId(req.user._id),
        attachments,
    });

    const populatedTask = await Task.findById(task._id)
        .populate("assignedTo", "username fullName avatar")
        .populate("assignedBy", "username fullName avatar");

    return res
        .status(201)
        .json(new ApiResponse(201, populatedTask, "Task created successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const task = await Task.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
            },
        },
        {
            $lookup: {
                from: "users",
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
                            email: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedBy",
                foreignField: "_id",
                as: "assignedBy",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "subtasks",
                localField: "_id",
                foreignField: "task",
                as: "subtasks",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
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
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            createdBy: { $arrayElemAt: ["$createdBy", 0] },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                assignedTo: { $arrayElemAt: ["$assignedTo", 0] },
                assignedBy: { $arrayElemAt: ["$assignedBy", 0] },
            },
        },
    ]);

    if (!task || task.length === 0) {
        throw new ApiError(404, "Task not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, task[0], "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { title, description, status, assignedTo } = req.body;

    const existingTask = await Task.findById(taskId);

    if (!existingTask) {
        throw new ApiError(404, "Task not found");
    }

    const existingAttachments = existingTask.attachments || [];
    const files = req.files || [];

    const newAttachments = files.map((file) => ({
        url: `${process.env.SERVER_URL}/images/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
    }));

    const allAttachments = [...existingAttachments, ...newAttachments];

    const updateFields = {
        attachments: allAttachments,
        assignedBy: new mongoose.Types.ObjectId(req.user._id),
    };

    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;

    if (assignedTo !== undefined) {
        updateFields.assignedTo = assignedTo
            ? new mongoose.Types.ObjectId(assignedTo)
            : undefined;
    } else if (existingTask.assignedTo) {
        updateFields.assignedTo = existingTask.assignedTo;
    }

    const task = await Task.findByIdAndUpdate(taskId, updateFields, { new: true })
        .populate("assignedTo", "username fullName avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const deletedTask = await Task.findByIdAndDelete(taskId);
    if (!deletedTask) {
        throw new ApiError(404, "Task not found");
    }

    // also delete related subtasks
    await SubTask.deleteMany({ task: taskId });

    return res
        .status(200)
        .json(new ApiResponse(200, deletedTask, "Task deleted successfully"));
});

const createSubtask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { title } = req.body;

    if (!title) {
        throw new ApiError(400, "Title is required");
    }

    const task = await Task.findById(taskId);
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const subTask = await SubTask.create({
        title,
        task: new mongoose.Types.ObjectId(taskId),
        createdBy: new mongoose.Types.ObjectId(req.user._id),
    });

    return res
        .status(201)
        .json(new ApiResponse(201, subTask, "Subtask created successfully"));
});

const updateSubtask = asyncHandler(async (req, res) => {
    const { subtaskId } = req.params;
    const { title, isCompleted } = req.body;

    const subTask = await SubTask.findById(subtaskId);

    if (!subTask) {
        throw new ApiError(404, "Subtask not found");
    }

    const canEditTitle = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(
        req?.user?.role,
    );

    const updateFields = {};
    if (isCompleted !== undefined) updateFields.isCompleted = isCompleted;
    if (title !== undefined && canEditTitle) updateFields.title = title;

    const updated = await SubTask.findByIdAndUpdate(subtaskId, updateFields, {
        new: true,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, updated, "Subtask updated successfully"));
});

const deleteSubtask = asyncHandler(async (req, res) => {
    const { subtaskId } = req.params;

    const deletedSubtask = await SubTask.findByIdAndDelete(subtaskId);

    if (!deletedSubtask) {
        throw new ApiError(404, "Subtask not found");
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
    deleteSubtask,
};
