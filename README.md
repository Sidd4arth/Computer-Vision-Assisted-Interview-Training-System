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

After completing these steps, the Computer Vision Assisted Interview Training System will be available locally.

---

<img width="1918" height="907" alt="Screenshot 2026-06-15 030159" src="https://github.com/user-attachments/assets/4fbeb235-4f15-4731-81f0-4c3950742bfc" />
<img width="1918" height="910" alt="Screenshot 2026-06-15 030231" src="https://github.com/user-attachments/assets/ac3b526f-1cfb-440c-8c2f-7704d446da4f" />
<img width="1917" height="902" alt="Screenshot 2026-06-15 030250" src="https://github.com/user-attachments/assets/8d55df74-0a84-4d23-a2e1-fa2f2fbd2c85" />
<img width="1918" height="910" alt="Screenshot 2026-06-15 030304" src="https://github.com/user-attachments/assets/c8f55bed-8c07-4e03-af08-2435186679eb" />
<img width="1918" height="887" alt="Screenshot 2026-06-15 030332" src="https://github.com/user-attachments/assets/4651c7be-8e26-4130-b96a-96f84216c4aa" />
<img width="1918" height="912" alt="Screenshot 2026-06-15 030344" src="https://github.com/user-attachments/assets/ab985bb8-1dd8-4fc4-8125-296064b1e9d1" />
<img width="1918" height="907" alt="Screenshot 2026-06-15 030354" src="https://github.com/user-attachments/assets/33a13e20-272b-40e5-8a11-638e1a7c6c38" />
<img width="1918" height="900" alt="Screenshot 2026-06-15 030404" src="https://github.com/user-attachments/assets/a2ca282a-e1a6-4881-9baa-16b06de7fb93" />
<img width="1918" height="906" alt="Screenshot 2026-06-15 030423" src="https://github.com/user-attachments/assets/0b998ee1-3bbd-49b9-9e38-5738f1eb6c95" />
<img width="1918" height="906" alt="Screenshot 2026-06-15 030441" src="https://github.com/user-attachments/assets/4690f929-0177-4915-93f9-4bc170c7d120" />
<img width="1918" height="901" alt="Screenshot 2026-06-15 030501" src="https://github.com/user-attachments/assets/ef16633e-a2ef-41db-b770-f47ac2c44da2" />
<img width="1918" height="657" alt="Screenshot 2026-06-15 030512" src="https://github.com/user-attachments/assets/fef6a00a-0122-4d54-aab8-7fafcd7577d5" />
<img width="1918" height="907" alt="Screenshot 2026-06-15 030518" src="https://github.com/user-attachments/assets/dfcd509b-0a09-42e5-9eb4-cb3db568ca6c" />

