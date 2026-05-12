# Mock Interview Evaluator
Minor Project 2

#Local Run Guide:

1. Install Node.js dependencies

npm install

3. Start PostgreSQL

docker run --name mockprep-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:15

5. Push database schema

npx drizzle-kit push

7. Start the dev server

npm run dev

.env.local

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db"UI,O./}DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db"
