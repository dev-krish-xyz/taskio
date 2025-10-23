import { Router } from "express";
import {
    createProject,
    deleteProject,
    updateProject,
    addMemberToProject,
    deleteMember,
    updateMemberRole,
    getProjectById,
    getProjects,
    getProjectMembers,
} from "../controllers/project.controllers";

import {addMemberToProjectValidator, createProjectValidator} from "../validators/index.js";
import {UserRolesEnum, AvailableUserRoles} from "../utils/constants.js"
import { validate } from "../middlewares/validator.middleware";




const projectRouter = Router();

projectRouter.route("/create-project").post()

export default projectRouter;