# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server (with hot-reload)
npm start

# Format code
npx prettier --write .
```

No test runner is configured. There is no build step — this runs directly with Node.js.

## Architecture

This is a **Node.js/Express REST API** for a task management app, using ES6 modules (`"type": "module"`). It follows a Controller-Route-Model pattern.

**Request lifecycle:**
```
Route → Validator middleware → asyncHandler → Controller → Model → ApiResponse/ApiError
```

**Key utilities in `src/utils/`:**
- `asyncHandler.js` — wraps async route handlers to forward errors to Express
- `api-error.js` / `api-response.js` — standardized error and response classes used in all controllers
- `constants.js` — enums for `UserRolesEnum` (`admin`, `project_admin`, `member`) and `TaskStatusEnum` (`todo`, `in_progress`, `done`)
- `mail.js` — Nodemailer + Mailgen for transactional emails (verification, password reset)

**Authentication flow:**
- JWT access tokens are read from the `accessToken` cookie or `Authorization: Bearer` header via `src/middlewares/auth.middleware.js`
- `verifyJWT` middleware attaches `req.user` to the request
- `validateProjectPermission(...roles)` middleware enforces role-based access within a project by checking the `ProjectMember` collection
- OAuth (Google/GitHub) is handled via Passport.js strategies in `src/config/passport.config.js`, configured in `src/index.js`, with callbacks in `src/controllers/oauth.controllers.js`

**Route mounting (in `src/index.js`):**
- `/api/v1/users` — auth (register, login, email verification, password reset, logout)
- `/api/v1/auth` — OAuth (Google, GitHub)
- `/api/v1/projects` — project CRUD + member management
- `/api/v1/projects/:projectId/tasks` — tasks + subtasks (nested under projects)
- `/api/v1/projects/:projectId/notes` — notes (nested under projects)

**Validation:** All input validation rules are defined in `src/validators/index.js` using `express-validator`, processed by `src/middlewares/validator.middleware.js`.

**File uploads:** Multer (`src/middlewares/multer.middleware.js`) stores files in `public/images/` with a 1MB size limit.

## Environment Variables

```
PORT=8000
NODE_ENV=development
SERVER_URL=http://localhost:8000
FRONT_END_URL=http://localhost:3000
MONGO_URL=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MAILTRAP_SMTP_HOST=
MAILTRAP_SMTP_PORT=
MAILTRAP_SMTP_USER=
MAILTRAP_SMTP_PASS=
```
