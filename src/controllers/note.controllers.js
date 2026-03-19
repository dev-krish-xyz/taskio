import mongoose from "mongoose";
import { ProjectNote } from "../models/note.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { Project } from "../models/project.models.js";

const getNotes = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const notes = await ProjectNote.find({
        project: new mongoose.Types.ObjectId(projectId),
    }).populate("createdBy", "username fullName avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, notes, "Notes fetched successfully"));
});

const createNote = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { content } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const note = await ProjectNote.create({
        project: new mongoose.Types.ObjectId(projectId),
        content,
        createdBy: new mongoose.Types.ObjectId(req.user._id),
    });

    const populatedNote = await ProjectNote.findById(note._id).populate(
        "createdBy",
        "username fullName avatar",
    );

    return res
        .status(201)
        .json(new ApiResponse(201, populatedNote, "Note created successfully"));
});

const deleteNote = asyncHandler(async (req, res) => {
    const { noteId } = req.params;

    const note = await ProjectNote.findByIdAndDelete(noteId);
    if (!note) {
        throw new ApiError(404, "Note not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note deleted successfully"));
});

const updateNote = asyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const { content } = req.body;

    const existingNote = await ProjectNote.findById(noteId);
    if (!existingNote) {
        throw new ApiError(404, "Note not found");
    }

    const note = await ProjectNote.findByIdAndUpdate(
        noteId,
        { content },
        { new: true },
    ).populate("createdBy", "username fullName avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note updated successfully"));
});

const getNoteById = asyncHandler(async (req, res) => {
    const { noteId } = req.params;

    const note = await ProjectNote.findById(noteId).populate(
        "createdBy",
        "username fullName avatar",
    );

    if (!note) {
        throw new ApiError(404, "Note not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note fetched successfully"));
});

export { getNoteById, getNotes, createNote, updateNote, deleteNote };
