# Computer Vision Assisted Interview Training System

## Local Setup and Run Guide

### Prerequisites

Ensure the following software is installed on your system:

* Node.js (v18 or later recommended)
* npm
* Docker Desktop
* Git

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/Sidd4arth/Computer-Vision-Assisted-Interview-Training-System.git
cd Computer-Vision-Assisted-Interview-Training-System
```

---

## Step 2: Configure Environment Variables

Create a file named `.env.local` in the project root directory.

Add the required environment variables:

```env
API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
```

### Example

```env
API_KEY=xxxxxxxxxxxxxxxxxxxx

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db
```

> Note: The `.env.local` file contains sensitive information and should never be committed to version control.

---

## Step 3: Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

---

## Step 4: Start PostgreSQL Database

Launch PostgreSQL using Docker:

```bash
docker run --name mockprep-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:15
```

Verify that the container is running:

```bash
docker ps
```

---

## Step 5: Push Database Schema

Create the required database tables using Drizzle ORM:

```bash
npx drizzle-kit push
```

---

## Step 6: Start the Development Server

Run the application locally:

```bash
npm run dev
```

---

## Step 7: Access the Application

Open your browser and navigate to:

```text
http://localhost:3000
```

The application should now be running locally.

---

## Common Commands

### Stop Database Container

```bash
docker stop mockprep-db
```

### Start Existing Database Container

```bash
docker start mockprep-db
```

### Remove Database Container

```bash
docker rm -f mockprep-db
```

### Reinstall Dependencies

```bash
rm -rf node_modules
npm install
```

---

## Troubleshooting

### Port 5432 Already in Use

Check for another PostgreSQL instance running on your machine and stop it, or modify the Docker port mapping.

### Environment Variables Not Loaded

Ensure:

* `.env.local` exists in the project root.
* Variable names are spelled correctly.
* The development server is restarted after making changes.

### Database Connection Errors

Verify:

* Docker container is running.
* `DATABASE_URL` matches the PostgreSQL credentials.
* Database schema has been pushed using:

```bash
npx drizzle-kit push
```

---

## Project Workflow

```bash
npm install
docker run --name mockprep-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:15
npx drizzle-kit push
npm run dev
```

After completing these steps, the Computer Vision Assisted Interview Training System will be available locally for development and testing.
