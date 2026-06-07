import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  serial,
  varchar,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Interview sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 36 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  role: text("role").notNull(),
  lpa: text("lpa").notNull(),
  duration: integer("duration").notNull(), // in minutes: 30/45/60/90
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, generating, ready, in_progress, completed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // AI feedback after session
  aiFeedback: text("ai_feedback"),
});

// Questions generated for a session
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  questionIndex: integer("question_index").notNull(), // 0-based order
  title: text("title").notNull(),
  difficulty: varchar("difficulty", { length: 10 }).notNull(), // Easy, Medium, Hard
  description: text("description").notNull(),
  examples: jsonb("examples").notNull(), // [{input, output, explanation}]
  testCases: jsonb("test_cases").notNull(), // [{input, expected_output, is_hidden}]
  starterCode: jsonb("starter_code").notNull(), // {python, cpp, java, javascript}
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Code submissions per question
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 20 }).notNull(),
  code: text("code").notNull(),
  submissionType: varchar("submission_type", { length: 10 }).notNull(), // run or submit
  results: jsonb("results"), // [{test_case_index, passed, output, expected, time_ms, memory_kb}]
  totalPassed: integer("total_passed").default(0),
  totalTests: integer("total_tests").default(0),
  verdict: varchar("verdict", { length: 20 }), // Accepted, Wrong Answer, TLE, RE, CE
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Webcam event logs
export const webcamLogs = pgTable("webcam_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  events: jsonb("events").notNull(), // [{timestamp, type, message, severity}]
  postureScore: integer("posture_score"),
  gazeScore: integer("gaze_score"),
  totalWarnings: integer("total_warnings").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
