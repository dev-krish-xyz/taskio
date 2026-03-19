# Taskio

A REST API for a project and task management application built with Node.js, Express, and MongoDB.

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Database:** MongoDB via Mongoose
- **Auth:** JWT (access + refresh tokens), OAuth 2.0 (Google, GitHub) via Passport.js
- **Email:** Resend HTTP API + Mailgen
- **File Uploads:** Multer (stored in `public/images/`, 1MB limit)
- **Validation:** express-validator

---

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB instance (local or Atlas)

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd taskio
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in the required values in `.env`:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `8000`) |
| `NODE_ENV` | `development` or `production` |
| `SERVER_URL` | Base URL of this API (e.g. `http://localhost:8000`) |
| `FRONT_END_URL` | Frontend URL for CORS and redirect links |
| `MONGO_URL` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | Secret for signing access JWTs |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh JWTs |
| `ACCESS_TOKEN_EXPIRY` | Access token TTL (e.g. `1d`) |
| `REFRESH_TOKEN_EXPIRY` | Refresh token TTL (e.g. `10d`) |
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL (default: `/api/v1/auth/google/callback`) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback URL (default: `/api/v1/auth/github/callback`) |
| `RESEND_API_KEY` | API key from Resend |
| `EMAIL_FROM` | Verified sender identity (e.g. `Taskio <onboarding@yourdomain.com>`) |
| `FORGOT_PASSWORD_REDIRECT_URL` | Frontend URL for password reset redirect |

### 3. Start the development server

```bash
npm run dev
```

Frontend starts on `http://localhost:3000` and backend API on `http://localhost:8000`.

### 4. Run backend in production mode

```bash
npm run start:prod
```

---

## Deploy (Render + Atlas)

This repo includes a Render Blueprint file: `render.yaml`.

### 1. Create MongoDB Atlas M0 cluster

- Create a free M0 cluster.
- Create a database user and add Network Access for your app IPs.
- Copy the connection string into `MONGO_URL`.

### 2. Deploy backend on Render (Web Service)

- Root directory: repository root
- Build command: `npm ci`
- Start command: `node src/index.js`
- Set env vars:
  - `NODE_ENV=production`
  - `SERVER_URL=https://<backend-service>.onrender.com`
  - `FRONT_END_URL=https://<frontend-service>.onrender.com`
  - `MONGO_URL=<atlas-connection-string>`
  - JWT secrets/expiries + OAuth creds
  - `GOOGLE_CALLBACK_URL=https://<frontend-service>.onrender.com/api/v1/auth/google/callback`
  - `GITHUB_CALLBACK_URL=https://<frontend-service>.onrender.com/api/v1/auth/github/callback`
  - `RESEND_API_KEY`, `EMAIL_FROM`
  - `FORGOT_PASSWORD_REDIRECT_URL=https://<frontend-service>.onrender.com/auth/reset-password`

### 3. Deploy frontend on Render (Static Site)

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`

Add rewrite rules in this order:

1. `/api/*` -> `https://<backend-service>.onrender.com/api/*`
2. `/*` -> `/index.html`

### 4. Configure OAuth providers

- Google callback URI: `https://<frontend-service>.onrender.com/api/v1/auth/google/callback`
- GitHub callback URI: `https://<frontend-service>.onrender.com/api/v1/auth/github/callback`

### 5. Post-deploy checks

- Register/login/logout
- Refresh token flow
- Google/GitHub OAuth login
- Forgot-password and email verification delivery
- File uploads under `/images`

> Note: Render free instances can spin down and use ephemeral disk. For production-grade file persistence, move uploads from `public/images` to object storage.

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Auth — `/api/v1/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register a new user |
| POST | `/login` | — | Login and receive tokens |
| POST | `/refresh-token` | — | Refresh access token |
| GET | `/verify-email/:token` | — | Verify email address |
| POST | `/forgot-password` | — | Send password reset email |
| POST | `/reset-password/:token` | — | Reset password with token |
| POST | `/logout` | JWT | Logout |
| POST | `/change-password` | JWT | Change current password |
| GET | `/current-user` | JWT | Get logged-in user profile |
| POST | `/resend-email-verification` | JWT | Resend verification email |
| POST | `/delete-account` | JWT | Delete account |

### OAuth — `/api/v1/auth`

| Method | Path | Description |
|---|---|---|
| GET | `/google` | Initiate Google OAuth flow |
| GET | `/google/callback` | Google OAuth callback |
| GET | `/github` | Initiate GitHub OAuth flow |
| GET | `/github/callback` | GitHub OAuth callback |

### Projects — `/api/v1/projects`

All routes require JWT auth.

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | any | List all projects for the user |
| POST | `/` | any | Create a new project |
| GET | `/:projectId` | any | Get project details |
| PUT | `/:projectId` | admin | Update project |
| DELETE | `/:projectId` | admin | Delete project |
| GET | `/:projectId/members` | any | List project members |
| POST | `/:projectId/members` | admin | Add a member |
| PUT | `/:projectId/members/:userId` | admin | Update member role |
| DELETE | `/:projectId/members/:userId` | admin | Remove a member |

### Tasks — `/api/v1/projects/:projectId/tasks`

All routes require JWT auth.

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | any | List tasks in project |
| POST | `/` | admin, project_admin | Create a task (supports file attachments) |
| GET | `/:taskId` | any | Get task details |
| PUT | `/:taskId` | admin, project_admin | Update task (supports file attachments) |
| DELETE | `/:taskId` | admin, project_admin | Delete task |
| POST | `/:taskId/subtasks` | admin, project_admin | Create a subtask |
| PUT | `/:taskId/subtasks/:subtaskId` | any | Update subtask |
| DELETE | `/:taskId/subtasks/:subtaskId` | admin, project_admin | Delete subtask |

### Notes — `/api/v1/projects/:projectId/notes`

All routes require JWT auth.

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | any | List notes in project |
| POST | `/` | admin | Create a note |
| GET | `/:noteId` | any | Get note details |
| PUT | `/:noteId` | admin | Update note |
| DELETE | `/:noteId` | admin | Delete note |

---

## Roles

| Role | Value |
|---|---|
| Admin | `admin` |
| Project Admin | `project_admin` |
| Member | `member` |

## Task Statuses

`todo` · `in_progress` · `done`

---

## Project Structure

```
src/
├── config/          # Passport OAuth strategies
├── controllers/     # Route handlers
├── db/              # MongoDB connection
├── middlewares/     # Auth, validation, multer, error handling
├── models/          # Mongoose schemas
├── routes/          # Express routers
├── utils/           # asyncHandler, ApiError, ApiResponse, constants, mail
└── validators/      # express-validator rule sets
public/
└── images/          # Uploaded file storage
```

## Code Formatting

```bash
npx prettier --write .
```
