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



#Environment Configuration#

Before running the project, create a .env.local file in the project root directory.

Copy the contents from .env.example (if provided) and replace the placeholder values with your own credentials.

Example:

API_KEY=your_api_key_here

DATABASE_URL=your_database_url_here

The .env.local file stores environment-specific configuration such as API keys, database connection strings, and application settings. This file should not be committed to version control because it may contain sensitive information.

After creating the file, install dependencies and start the development server:

npm install
npm run dev
