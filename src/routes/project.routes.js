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
} from "../controllers/project.controllers.js";

import {addMemberToProjectValidator, createProjectValidator} from "../validators/index.js";
import {UserRolesEnum, AvailableUserRoles} from "../utils/constants.js"
import { validate } from "../middlewares/validator.middleware.js";
import { validateProjectPermission, verifyJWT } from "../middlewares/auth.middleware.js";




const projectRouter = Router();

projectRouter.use(verifyJWT);

projectRouter
.route("/")
.get(getProjects)
.post(createProjectValidator(), validate, createProject);

projectRouter
.route("/:projectId")
.get(validateProjectPermission(AvailableUserRoles),getProjectById)
.put(validateProjectPermission([UserRolesEnum.ADMIN]), createProjectValidator(), validate, updateProject)
.delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteProject);

projectRouter
.route("/:projectId/members")
.get(getProjectMembers)
.post(validateProjectPermission([UserRolesEnum.ADMIN]), addMemberToProjectValidator(), validate, addMemberToProject);

projectRouter
.route("/:projectId/members/userId")
.put(validateProjectPermission([UserRolesEnum.ADMIN]), validate, updateMemberRole)
.delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteMember);

export default projectRouter;