# Client Ops Dashboard

A real-time project dashboard for a small agency to manage client projects, track task progress, and monitor team activity. It has three roles with API-enforced access, a live WebSocket activity feed filtered by role, and in-app notifications.

- **Live app:** https://client-ops-dashboard-frontend-zeta.vercel.app
- **API:** https://client-ops-dashboard-backend.onrender.com (`/health` for a status check)
- **Repository:** <your-repo-url>

> The API runs on Render's free tier, which sleeps after ~15 minutes idle. The first request after a pause can take 30-60 seconds.

## Test Accounts

All seeded accounts use the password `password123`.

| Role | Email |
|---|---|
| Admin | admin@velozity.com |
| Project Manager | priya@velozity.com |
| Project Manager | marcus@velozity.com |
| Developer | ravi@velozity.com |
| Developer | sara@velozity.com |
| Developer | tom@velozity.com |
| Developer | nina@velozity.com |

Public registration is available on `/register` and always creates a **Developer**. Admin and PM accounts exist only through the seed script, so nobody can self-assign an elevated role.

## Features by Role

| | Admin | Project Manager | Developer |
|---|---|---|---|
| Projects | See all, create | See and manage only projects they created, create | See projects containing a task assigned to them |
| Tasks | See all, create | See and create tasks only in their own projects | See only their assigned tasks |
| Update task status | Any task | Tasks in their own projects | Their own tasks |
| Activity feed | Global feed, all projects | Only their own projects | Only tasks assigned to them |
| Dashboard | Tasks by status, overdue count, live online-user count | Tasks by priority, tasks due this week | Assigned tasks sorted by priority, then due date |
| Notifications | Yes | Notified when a task in their project moves to In Review | Notified when assigned a task |

Every task list supports filtering by status, priority, and due-date range through URL query parameters (for example `/dashboard?status=IN_PROGRESS&priority=HIGH`), so filtered views can be shared as links.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS, React Router, Axios, socket.io-client |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 6 |
| Real-time | Socket.io |
| Background jobs | node-cron |
| Validation | Zod |
| Auth | JWT access + refresh tokens, bcryptjs |
| Hosting | Vercel (frontend), Render (backend), Neon (database) |

## Architectural Decisions

**Socket.io over native WebSocket.** The role-filtered feed maps directly onto Socket.io rooms. On connect, each socket joins `user-<id>` for personal notifications, plus `admin-global` (Admins), one `project-<id>` per project they created (PMs), or `developer-<id>` (Developers). Broadcasting an event to the right audience is then a single `io.to(room).emit(...)` call instead of manually looping over connections and checking roles. Socket.io also handles reconnection and shares the same HTTP server as Express.

**Express over Fastify.** Fastify is faster in benchmarks, but raw throughput isn't the bottleneck for an internal agency tool. Express has the most mature middleware ecosystem (`cors`, `cookie-parser`), integrates directly with Socket.io through a shared `http.Server`, and Express 5 forwards errors from async handlers to the error middleware natively. That made the role and ownership middleware chain simple to reason about.

**node-cron over Bull.** The overdue check is one periodic, idempotent scan (every 5 minutes) with no need for retries, delayed jobs, or a distributed queue. Bull would add Redis as an infrastructure dependency for no benefit here. `node-cron` runs in-process with zero extra services.

**Token storage.** The access token (15 minutes) lives only in React memory and is sent as a `Bearer` header, so it is never persisted where injected scripts could read it. The refresh token (7 days) is an `HttpOnly` cookie, unreachable from JavaScript. A SHA-256 hash of each issued refresh token is stored in the `RefreshToken` table, so logout can revoke a session server-side, which stateless JWTs can't do alone. On page load the frontend silently calls `/auth/refresh` followed by `/auth/me` to restore the session. In production the cookie uses `SameSite=None; Secure` because the frontend and API are on different domains.

**Two-layer authorization.** `requireAuth` verifies the token and `requireRole` blocks whole routes by role. Data-dependent rules such as "a PM can only manage projects they created" and "a Developer can only update their own tasks" are checked inside each handler against the database record. Listing endpoints build their `where` clause from the caller's role on the server, so query parameters can never widen access.

**Persisted, DB-backed activity.** Every status change is written to `TaskActivity` (who, old status, new status, timestamp) before it is broadcast. When a socket connects, the last 20 relevant events are queried fresh from the database, scoped by role, and sent to that socket only. Nothing is cached in memory.

## Database Schema

Seven models with foreign keys throughout:

- **User**: name, unique email, passwordHash, role (`ADMIN | PM | DEVELOPER`)
- **Client**: name; has many Projects
- **Project**: name, description, status (`ACTIVE | ARCHIVED`); belongs to a Client and a creator (User)
- **Task**: title, description, status (`TODO | IN_PROGRESS | IN_REVIEW | DONE`), priority (`LOW | MEDIUM | HIGH | CRITICAL`), dueDate, isOverdue; belongs to a Project and an assignee (User)
- **TaskActivity**: action, oldStatus, newStatus, createdAt; belongs to a Task, a Project, and a User
- **Notification**: message, isRead, createdAt; belongs to a User and optionally a Task
- **RefreshToken**: tokenHash (unique), expiresAt, revoked; belongs to a User

### Indexes

- `User.role`: role-scoped lookups such as listing all developers.
- `Project.creatorId`, `Project.clientId`: a PM's "my projects" query and client lookups.
- `Task.projectId`, `Task.assigneeId`, `Task.status`, `Task.dueDate`: tasks by project, a developer's own tasks, status filters and counts, and the overdue scan plus due-this-week queries.
- `TaskActivity.projectId`: deliberately denormalized (also reachable through the task) so a PM's feed and catch-up query filter directly on an indexed column without joining through `Task`.
- `TaskActivity.taskId`, `userId`, `createdAt`: per-task history, per-user lookups, and time-ordered feed queries.
- `Notification(userId, isRead)` composite: the unread badge count and unread list.
- `RefreshToken.userId`, plus a unique index on `tokenHash` for token lookup.

Dashboard counts use Prisma `groupBy`, so aggregation runs in Postgres rather than in application code.

## API Overview

All errors return JSON as `{ "error": "message" }`, with `details` for validation failures. Stack traces are never sent to the client.

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/refresh`, `/logout` | Public (refresh/logout use the cookie) |
| GET | `/api/auth/me` | Authenticated |
| GET, POST | `/api/projects` | Role-scoped list; create is Admin/PM |
| GET, PATCH, DELETE | `/api/projects/:id` | Ownership enforced for PMs |
| GET, POST | `/api/tasks` | Role-scoped list with filters; create is Admin/PM |
| PATCH | `/api/tasks/:id/status` | Assignee, owning PM, or Admin |
| GET | `/api/dashboard/stats` | Role-scoped aggregates |
| GET | `/api/notifications`; PATCH `/:id/read`, `/read-all` | Own notifications only |
| GET | `/api/users/developers`, `/api/users/online-count` | Admin/PM; online count is Admin |
| GET, POST | `/api/clients` | Admin/PM |

Socket events: the server emits `activity`, `missed-events`, `notification`, and `presence-count`. The socket handshake is authenticated with the same access token.

## Local Setup

**Prerequisites:** Node.js 22 or newer and a PostgreSQL database (Neon free tier or local). Docker is not included; see Known Limitations.

```bash
# Backend
cd Backend
npm install
```

Create `Backend/.env`:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
PORT=5000
NODE_ENV=development
JWT_ACCESS_SECRET=<random string>
JWT_REFRESH_SECRET=<a different random string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:5173
```

Generate each secret with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.

```bash
npx prisma migrate deploy
npx prisma db seed        # run once on an empty database
npm run dev               # http://localhost:5000
```

```bash
# Frontend (in a second terminal)
cd Frontend
npm install
```

Create `Frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

```bash
npm run dev               # http://localhost:5173
```

## Seed Data

`npx prisma db seed` creates 1 Admin, 2 PMs, 4 Developers, 3 clients, 3 projects with 5 tasks each in mixed statuses, 2 tasks already flagged overdue, and activity log entries so the feed is populated on first load.

## Deployment

- **Backend (Render):** root directory `Backend`, build command `npm install && npx prisma generate && npm run build`, start command `npm run start`. Environment variables as above, with `NODE_ENV=production` and `CLIENT_URL` set to the exact Vercel URL (no trailing slash).
- **Frontend (Vercel):** root directory `Frontend`, framework preset Vite, `VITE_API_URL` set to the Render URL. Vite bakes this in at build time, so redeploy after changing it.
- The generated Prisma client is git-ignored; Render generates it during the build.

## Known Limitations

- **No automated tests.** Behavior was verified manually across all three roles.
- **No Docker setup.** Setup is manual, as described above.
- **Render cold starts.** The free tier sleeps when idle, so the first request can be slow.
- **PM socket rooms are joined at connect time.** A project a PM creates during an open session won't push live events to that PM until they reconnect or refresh.
- **Catch-up is "last 20 events", not "since last seen".** The last 20 relevant events are sent on every connect rather than only the ones missed since disconnecting.
- **Overdue flag is one-way.** The cron job sets `isOverdue` but never clears it, so a task finished late keeps the flag and still counts in overdue totals.
- **Presence counts unique users, not tabs.** Closing one of a user's two tabs removes them from the online count until they reconnect.
- **Refresh tokens aren't rotated,** and expired token rows aren't purged.
- **Filter query parameters aren't schema-validated.** Request bodies are validated with Zod, but an invalid `status` or `priority` filter value produces a generic server error rather than a 400.
- **Limited management UI.** There is no UI for editing or deleting projects and tasks, no Admin user management, and "New Task" adds to the first project in the list. The corresponding project routes exist on the API.
- **Seed script is not idempotent.** Re-running it against a populated database fails on unique emails.

## Project Structure

```
Backend/
  prisma/            schema, migrations, seed script
  src/
    routes/          auth, projects, tasks, notifications, dashboard, users, clients
    middleware/      auth, role, error handling
    utils/           jwt, password hashing, token hashing, prisma client
    jobs/            overdue task checker (node-cron)
    socket.ts        Socket.io auth, rooms, presence, catch-up
Frontend/
  src/
    pages/           Login, Register, Dashboard
    components/      ActivityFeed, NotificationsDropdown, stats, filters, modals
    context/         AuthContext (in-memory access token, session restore)
    hooks/           useSocket
    api/             Axios client with automatic token refresh
```
