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
import oauthRouter from "./routes/oauth.routes.js";
import cors from "cors";
import passport from "./config/passport.config.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 8000;

// Required on Render/other reverse proxies so secure cookies are honored.
app.set("trust proxy", 1);

// CORS — allow frontend origin with credentials
app.use(
    cors({
        origin: process.env.FRONT_END_URL || "http://localhost:3000",
        credentials: true,
    }),
);

// Passport
app.use(passport.initialize());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Serve uploaded files
app.use("/images", express.static(path.join(__dirname, "../public/images")));

// Routes
app.use("/api/v1/users", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/projects/:projectId/tasks", taskRouter);
app.use("/api/v1/projects/:projectId/notes", noteRouter);
app.use("/api/v1/auth", oauthRouter);

// Global error handler (must be last)
app.use(errorHandler);

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err);
        process.exit(1);
    });
