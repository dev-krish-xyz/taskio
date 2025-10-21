import mongoose, { mongo } from "mongoose";
import {Project} from "../models/project.models.js";
import {ProjectMember} from "../models/projectmember.models.js"
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum, AvailableUserRoles } from "../utils/constants.js";
import { User } from "../models/user.models.js"



// getProjects
const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
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

// getProjectsById

const getProjectById = asyncHandler(async (req, res) => {
    const {projectId} = req.params;

    const project = await Project.findById(projectId);
    
    if(!project) {
        throw new ApiError(404,"Project not found");
    }

    res
    .status(200)
    .json(new ApiResponse(200, project, "Project found successfully"))
})

//  createProject

const createProject = asyncHandler(async (req, res)=> {
    const {name, description} = req.body;

    const project = await Project.create({
        name,
        description,
        createdBy: new mongoose.Types.ObjectId(req.user._id),
    });

    await ProjectMember.create({
        user: new mongoose.Types.ObjectId(req.user._id),
        project: new mongoose.Types.ObjectId(project._id),
        role : UserRolesEnum.ADMIN,
    });

    res
    .status(200)
    .json(new ApiResponse(200,project,"Project created successfully"));
});

// deleteProject

const deleteProject = asyncHandler(async(req,res)=> {
    const {projectId} = req.params;

    const project = await Project.findByIdAndDelete(projectId);

    if(!project) {
        throw new ApiError(404,"Project not found");
    }
    res
    .status(200)
    .json(new ApiResponse(200,project, "Project deleted successfully"));
    
})

// updateProject 

const updateProject = asyncHandler(async(req, res)=> {
    const {projectId} = req.params;
    const {name, description} = req.body;

    const project = await Project.findByIdAndUpdate(
        projectId,
        {
            name,
            description
        },
        {
            new : true
        }
    );

    if(!project) {
        throw new ApiError(404,"Project not found");
    }

    res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"))
    
})

// addMemberToProject
// findOneAndUpdate (filter, update,options)
const addMemberToProject = asyncHandler(async(req,res)=> {
    const {email, username, role} = req.body;
    const {projectId} = req.params;

    const user = User.findOne({
        $or: [{username}, {email}],
    });

    if(!user){
        throw new ApiError(404, "User not found");
    }

    await ProjectMember.findOneAndUpdate(
        {
            user: new mongoose.Types.ObjectId(req.user._id),
            project: new mongoose.Types.ObjectId(projectId),
        },
        {
            user: new mongoose.Types.ObjectId(req.user._id),
            project: new mongoose.Types.ObjectId(projectId),
            role : role,
        },
        {
            upsert: true,
            new : true,
        }
    )

    res
    .status(201)
    .json(new ApiResponse(201,{},"Project member added successfully"));
})

// getProjectMembers

const getProjectMembers = asyncHandler(async(req, res) => {
    const {projectId} = req.params;
    const project = await Project.findById(projectId);
    if(!project) {
        throw new ApiError(404, "Project not found");
    }

    const projectMembers = await ProjectMember.aggregate([
        
    ])

})