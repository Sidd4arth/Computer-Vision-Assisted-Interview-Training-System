# Mock Interview Evaluator
Minor Project 2

1. Install Node.js dependencies
   {}
   >>>npm install

2. Start PostgreSQL
-Install Docker
  {}
   >>>docker run --name mockprep-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:15

3. Push database schema
  {}
  >>>npx drizzle-kit push

4. 4. Start the dev server
  {}
  npm run dev
