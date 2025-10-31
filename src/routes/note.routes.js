import { Router } from "express";
import {createNote,
    deleteNote,
    updateNote,
    getNoteById,
    getNotes,
}  from "../controllers/note.controllers.js";
const noteRouter = Router();
import {createNoteValidator} from "../validators/index.js";
import {validate} from "../middlewares/validator.middleware.js";
import { AvailableUserRoles, UserRolesEnum } from "../utils/constants.js";
import {validateProjectPermission, verifyJWT} from "../middlewares/auth.middleware.js";


noteRouter.use(verifyJWT);

noteRouter
.route("/:projectId")
.get(validateProjectPermission(AvailableUserRoles), getNotes)
.post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    createNoteValidator(),
    validate,
    createNote,
)

noteRouter
.route("/:projectId/n/:noteId")
.get(validateProjectPermission(AvailableUserRoles),
getNoteById)
.put(validateProjectPermission([UserRolesEnum.ADMIN]),
createNoteValidator(),
validate,
updateNote,
)
.delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteNote);

export default noteRouter;