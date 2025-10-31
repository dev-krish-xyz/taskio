import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./db/dbconnect.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";
import noteRouter from "./routes/note.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import cookieParser from "cookie-parser";
import express from "express";



const PORT = process.env.PORT || 8000;
dotenv.config({
    path: "./.env" // path
})

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use("/api/v1/users", authRouter); // checked succesfully
app.use("/api/v1/projects", projectRouter); // checked successfully
app.use("/api/v1/projects/:projectId/tasks", taskRouter); // checked successfully
app.use("/api/v1/projects/:projectId/notes", noteRouter); // checked successfully



app.use(errorHandler);

connectDB()
.then(()=> {
    app.listen(PORT, ()=> {
        console.log("Server is running on port", PORT);
    })
})
.catch(() =>{
    console.log("Mongodb connection error", error);
    process.exit(1);
})

