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


<img width="1918" height="907" alt="Screenshot 2026-06-15 030159" src="https://github.com/user-attachments/assets/b269d913-e766-4b5c-ae86-45b8582729fd" />
<img width="1918" height="910" alt="Screenshot 2026-06-15 030231" src="https://github.com/user-attachments/assets/04542348-5d28-4304-9eb4-3d7e0fc99a98" />
<img width="1917" height="902" alt="Screenshot 2026-06-15 030250" src="https://github.com/user-attachments/assets/a56c6d94-a8fe-45e9-9ade-762570d43154" />
<img width="1918" height="910" alt="Screenshot 2026-06-15 030304" src="https://github.com/user-attachments/assets/cd5cf08e-cdba-4020-9387-7791592c26a7" />
<img width="1918" height="887" alt="Screenshot 2026-06-15 030332" src="https://github.com/user-attachments/assets/24890365-c4c4-4b85-9f9e-317034c6a1eb" />
<img width="1918" height="912" alt="Screenshot 2026-06-15 030344" src="https://github.com/user-attachments/assets/4a902688-0764-44f8-84fa-01c1d26a981c" />
<img width="1918" height="907" alt="Screenshot 2026-06-15 030354" src="https://github.com/user-attachments/assets/ff79b90a-5e75-4aa4-875b-20cda585d3a5" />
<img width="1918" height="900" alt="Screenshot 2026-06-15 030404" src="https://github.com/user-attachments/assets/9ed5a5e2-42c2-49b2-9b24-3d67711d7cac" />
<img width="1918" height="906" alt="Screenshot 2026-06-15 030423" src="https://github.com/user-attachments/assets/b04469f1-0270-4175-9889-06e661fe6f9a" />
<img width="1918" height="906" alt="Screenshot 2026-06-15 030441" src="https://github.com/user-attachments/assets/551a9043-81a2-40d3-af00-0080b9be1acc" />
<img width="1918" height="901" alt="Screenshot 2026-06-15 030501" src="https://github.com/user-attachments/assets/40e75470-c932-4dd4-92cc-e305649ad2c7" />
<img width="1918" height="657" alt="Screenshot 2026-06-15 030512" src="https://github.com/user-attachments/assets/61d56edc-7ce5-4047-8514-89306c93d702" />
<img width="1918" height="907" alt="Screenshot 2026-06-15 030518" src="https://github.com/user-attachments/assets/218cdee3-6c1f-43fc-bb26-9ce0deb6cc25" />
