# Interview Evaluation Platform – Version 2 (Dashboard & Invite Features)

## Overview
This repository implements a full‑stack interview preparation platform built with **Next.js 16**, **TypeScript**, **Drizzle ORM**, and **PostgreSQL**.  Version 2 introduces a **comprehensive analytics dashboard** and a **"Create" page** that generates unique interview‑invite links (video/audio chat integration is planned).

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Clone the Repository](#clone-the-repository)
- [Install Dependencies](#install-dependencies)
- [Environment Configuration](#environment-configuration)
- [Database Setup & Migrations](#database-setup--migrations)
- [Running the Development Server](#running-the-development-server)
- [Building for Production](#building-for-production)
- [Testing the New Features](#testing-the-new-features)
- [Git Tags & Release Workflow](#git-tags--release-workflow)
- [License](#license)

---

## Prerequisites
| Tool | Minimum Version |
|------|-----------------|
| **Node.js** | 20.x (LTS) |
| **npm** | 10.x |
| **PostgreSQL** | 15.x |
| **Git** | 2.30+ |
| **Optional** – **Docker** (for containerised DB) |

Make sure `node` and `npm` are available in your `PATH`:
```bash
node -v   # e.g. v20.12.0
npm -v    # e.g. 10.5.0
``` 

---

## Clone the Repository
```bash
git clone https://github.com/<your‑username>/interview‑evaluation-platform.git
cd interview‑evaluation-platform
```

If you need the **v2** tag specifically:
```bash
git checkout tags/v2 -b work-v2
```

---

## Install Dependencies
```bash
npm ci   # clean install based on package-lock.json
```
The command installs all production and dev dependencies (React, Next.js, Drizzle, etc.).

---

## Environment Configuration
Create a `.env.local` file at the root (it is ignored by Git). The file must contain at least the following variables:
```dotenv
# Database URL (PostgreSQL)
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/app_db

# NextAuth secret for session signing
NEXTAUTH_SECRET=your‑random‑secret

# Wandbox API endpoint (used by the compiler backend)
WANDBOX_API=https://wandbox.org/api

# (Optional) Set a custom port for the dev server
PORT=3000
```
> **Tip:** You can copy the example from `.env.example` (if present) and adjust the values.

---

## Database Setup & Migrations
1. **Create the database** (if it does not exist):
   ```bash
   createdb app_db
   ```
2. **Run Drizzle migrations** to generate the schema tables:
   ```bash
   npx drizzle-kit push   # creates tables defined in src/db/schema.ts
   ```
   > The command is idempotent; you can run it again after schema changes.
3. (Optional) Seed data for local testing:
   ```bash
   npm run seed   # you can add a script that loads sample sessions/questions
   ```

---

## Running the Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000` (or the port you defined). The server will hot‑reload on file changes.

### Verifying the new features
- **Dashboard** – navigate to `/dashboard` after signing in. You should see KPI cards, interactive charts, and a session history table.
- **Create page** – visit `/create`. Use the **Invite Your Interviewer →** button to generate a UUID‑based link.

---

## Building for Production
```bash
npm run build   # creates an optimized production bundle
npm start       # runs the compiled server
```
Make sure the `DATABASE_URL` and `NEXTAUTH_SECRET` are set in the production environment.

---

## Testing the New Features
You can run the built‑in lint and type‑check tools:
```bash
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript type check
```
For end‑to‑end verification, open a browser and:
1. Sign up / log in.
2. Complete a mock interview session.
3. Visit `/dashboard` – the charts should reflect your data.
4. Go to `/create` – generate and copy an invite link.

---

## Git Tags & Release Workflow
- **Tag `v1`** – the first basic version (no dashboard).
- **Tag `v2`** – this version with dashboard & invite page.

To create a new tag after further changes:
```bash
git commit -am "Your commit message"
# Bump the version (semantic versioning recommended)
git tag -a v3 -m "Release v3 – description"
git push origin main --tags
```
The CI/CD pipeline (if configured) can automatically publish a Docker image or deploy to Vercel based on tags.

---

## License
Distributed under the **MIT License**. See `LICENSE` for details.

---


After completing these steps, the Computer Vision Assisted Interview Training System will be available locally for development and testing.
