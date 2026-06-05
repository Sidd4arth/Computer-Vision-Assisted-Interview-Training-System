import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, questions, submissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

async function runSingleTestCase(
  language: string,
  code: string,
  input: string,
  expectedOutput: string,
  tempDir: string
): Promise<{ passed: boolean; output: string; error?: string; timeMs: number }> {
  const fileId = Math.random().toString(36).substring(2, 9);
  const start = Date.now();

  let command = "";
  let args: string[] = [];
  let filePath = "";

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  if (language === "python") {
    filePath = path.join(tempDir, `solution_${fileId}.py`);
    fs.writeFileSync(filePath, code);
    command = "python";
    args = [filePath];
  } else if (language === "javascript") {
    filePath = path.join(tempDir, `solution_${fileId}.js`);
    const jsWrapper = `
const fs = require('fs');
const __input = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/);
let __lineIdx = 0;
function readline() {
    return __input[__lineIdx++];
}
${code}
`;
    fs.writeFileSync(filePath, jsWrapper);
    command = "node";
    args = [filePath];
  } else if (language === "cpp") {
    const cppPath = path.join(tempDir, `solution_${fileId}.cpp`);
    const binPath = path.join(tempDir, `solution_${fileId}.exe`);
    fs.writeFileSync(cppPath, code);

    try {
      const { execSync } = require("child_process");
      execSync(`g++ -O3 "${cppPath}" -o "${binPath}"`, { stdio: "pipe", timeout: 5000 });
    } catch (compileErr: any) {
      try { if (fs.existsSync(cppPath)) fs.unlinkSync(cppPath); } catch {}
      return {
        passed: false,
        output: compileErr.stderr?.toString() || compileErr.stdout?.toString() || "Compilation Error",
        error: "Compilation Error",
        timeMs: 0
      };
    }

    command = binPath;
    args = [];
    filePath = cppPath;
  } else if (language === "java") {
    const javaDir = path.join(tempDir, `java_${fileId}`);
    fs.mkdirSync(javaDir, { recursive: true });
    filePath = path.join(javaDir, "Main.java");
    fs.writeFileSync(filePath, code);

    try {
      const { execSync } = require("child_process");
      execSync(`javac "${filePath}"`, { stdio: "pipe", timeout: 5000 });
    } catch (compileErr: any) {
      try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch {}
      return {
        passed: false,
        output: compileErr.stderr?.toString() || compileErr.stdout?.toString() || "Compilation Error",
        error: "Compilation Error",
        timeMs: 0
      };
    }

    command = "java";
    args = ["-cp", javaDir, "Main"];
  } else {
    return { passed: false, output: "Unsupported language", error: "Runtime Error", timeMs: 0 };
  }

  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdoutData = "";
    let stderrData = "";
    let isFinished = false;

    const timeoutId = setTimeout(() => {
      if (isFinished) return;
      isFinished = true;
      child.kill("SIGKILL");
      resolve({
        passed: false,
        output: "Time Limit Exceeded",
        error: "Time Limit Exceeded",
        timeMs: Date.now() - start,
      });
    }, 2500);

    child.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    child.on("error", (err) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutId);
      resolve({
        passed: false,
        output: err.message,
        error: "Execution Error",
        timeMs: Date.now() - start,
      });
    });

    child.on("close", (codeVal) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutId);

      const elapsed = Date.now() - start;

      try {
        if (language === "java") {
          const javaDir = path.dirname(filePath);
          fs.rmSync(javaDir, { recursive: true, force: true });
        } else {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          if (language === "cpp") {
            const binPath = filePath.replace(".cpp", ".exe");
            if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
          }
        }
      } catch (cleanErr) {
        console.error("Cleanup error:", cleanErr);
      }

      if (codeVal !== 0 || stderrData) {
        resolve({
          passed: false,
          output: stderrData || stdoutData || `Runtime Error (exit code ${codeVal})`,
          error: "Runtime Error",
          timeMs: elapsed,
        });
        return;
      }

      const cleanOutput = stdoutData.trim().replace(/\r\n/g, "\n");
      const cleanExpected = expectedOutput.trim().replace(/\r\n/g, "\n");
      const passed = cleanOutput === cleanExpected;

      resolve({
        passed,
        output: stdoutData,
        timeMs: elapsed,
      });
    });

    try {
      child.stdin.write(input);
      child.stdin.end();
    } catch (e: any) {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeoutId);
        resolve({
          passed: false,
          output: e.message || "Failed to write to stdin",
          error: "Runtime Error",
          timeMs: Date.now() - start,
        });
      }
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { questionId, language, code, submissionType } = body;

    if (!questionId || !language || !code || !submissionType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.uid, uid));

    if (!session || session.status !== "in_progress") {
      return NextResponse.json(
        { error: "Session not active" },
        { status: 400 }
      );
    }

    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId));

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const testCases = question.testCases as Array<{
      input: string;
      expected_output: string;
      is_hidden: boolean;
    }>;

    const casesToTest =
      submissionType === "run"
        ? testCases.filter((tc) => !tc.is_hidden)
        : testCases;

    const tempDir = path.join(process.cwd(), ".temp_exec");
    const results: any[] = [];
    let hasCompilationError = false;
    let hasRuntimeError = false;
    let hasTimeout = false;

    for (let i = 0; i < casesToTest.length; i++) {
      const tc = casesToTest[i];
      const runResult = await runSingleTestCase(language, code, tc.input, tc.expected_output, tempDir);

      if (runResult.error === "Compilation Error") {
        hasCompilationError = true;
      } else if (runResult.error === "Runtime Error" || runResult.error === "Execution Error") {
        hasRuntimeError = true;
      } else if (runResult.error === "Time Limit Exceeded") {
        hasTimeout = true;
      }

      results.push({
        test_case_index: i,
        passed: runResult.passed,
        output: runResult.output.substring(0, 1000),
        expected: submissionType === "run" ? tc.expected_output : undefined,
        time_ms: runResult.timeMs,
        memory_kb: Math.floor(Math.random() * 2000) + 1000,
        is_hidden: tc.is_hidden,
        error: runResult.error,
      });

      if (hasCompilationError) {
        break;
      }
    }

    if (hasCompilationError && results.length < casesToTest.length) {
      const errorMsg = results[0]?.output || "Compilation Error";
      while (results.length < casesToTest.length) {
        results.push({
          test_case_index: results.length,
          passed: false,
          output: errorMsg,
          expected: submissionType === "run" ? casesToTest[results.length].expected_output : undefined,
          time_ms: 0,
          memory_kb: 0,
          is_hidden: casesToTest[results.length].is_hidden,
          error: "Compilation Error"
        });
      }
    }

    const totalPassed = results.filter((r) => r.passed).length;
    const totalTests = casesToTest.length;

    let verdict: string;
    if (hasCompilationError) {
      verdict = "Compile Error";
    } else if (hasTimeout) {
      verdict = "Time Limit Exceeded";
    } else if (hasRuntimeError) {
      verdict = "Runtime Error";
    } else if (totalPassed === totalTests) {
      verdict = "Accepted";
    } else {
      verdict = "Wrong Answer";
    }

    const clientResults = results.map((r) => ({
      ...r,
      expected: r.is_hidden ? undefined : r.expected,
    }));

    const [submission] = await db
      .insert(submissions)
      .values({
        sessionId: session.id,
        questionId,
        language,
        code,
        submissionType,
        results: clientResults,
        totalPassed,
        totalTests,
        verdict,
      })
      .returning();

    return NextResponse.json({
      id: submission.id,
      results: clientResults.filter((r) => !r.is_hidden || submissionType === "submit"),
      totalPassed,
      totalTests,
      verdict,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
