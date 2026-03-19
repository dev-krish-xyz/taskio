import mongoose, { Schema } from "mongoose";
import { TaskStatusEnum, AvailableTaskStatuses } from "../utils/constants.js";

const taskSchema = new Schema({
    title: {
        type: String,
        trim: true,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    assignedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: AvailableTaskStatuses,
        default: TaskStatusEnum.TODO,
    },
    attachments: {
        type: [
            {
                url: String,
                mimetype: String,
                size: Number,
            }
        ],
        default: [],
    }
}, {
    timestamps: true
});

export const Task = mongoose.model("Task", taskSchema);
