import { Router } from "express";
import {createNote,
    deleteNote,
    updateNote,
    getNoteById,
    getNotes,
}  from "../controllers/note.controllers.js";
import {createNoteValidator} from "../validators/index.js";
import {validate} from "../middlewares/validator.middleware.js";
import { AvailableUserRoles, UserRolesEnum } from "../utils/constants.js";
import {validateProjectPermission, verifyJWT} from "../middlewares/auth.middleware.js";
import router from "./healthcheck.routes.js";

const noteRouter = Router({mergeParams: true});

noteRouter.use(verifyJWT);

noteRouter
.route("/")
.get(validateProjectPermission(AvailableUserRoles), getNotes)
.post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    createNoteValidator(),
    validate,
    createNote,
)

noteRouter
.route("/:noteId")
.get(validateProjectPermission(AvailableUserRoles),
getNoteById)
.put(validateProjectPermission([UserRolesEnum.ADMIN]),
createNoteValidator(),
validate,
updateNote,
)
.delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteNote);

export default noteRouter;