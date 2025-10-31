import mongoose, { Schema } from "mongoose";
import { TaskStatusEnum, AvailableTaskStatuses } from "../utils/constants.js";

const taskSchema = new Schema({
    title: {
        type: String,
        unique: true,
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
        required: true,
    },
    assignedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: AvailableTaskStatuses,  // array
        default: TaskStatusEnum.TODO,
    },
    attachments: {
        type: [
            {
                url: String,
                mimetype:String,
                size: Number,
            }
        ],
        default: [],
    }
}, {
    timestamps: true
})


export const Task = mongoose.model("Task", taskSchema);