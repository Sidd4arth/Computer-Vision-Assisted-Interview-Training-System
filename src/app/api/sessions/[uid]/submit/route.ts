import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, questions, submissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Force Node.js runtime — needed for child_process
export const runtime = "nodejs";

/** Run a process using exec() with a shell command string.
 *  Using exec avoids Turbopack's broken static analysis of spawn(dynamicVar). */
function runProcess(
  shellCmd: string,
  input: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; timedOut: boolean; exitCode: number | null }> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { exec } = require("child_process") as typeof import("child_process");
    const child = exec(shellCmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if ((error as any)?.killed) {
        resolve({ stdout, stderr, timedOut: true, exitCode: null });
      } else {
        resolve({ stdout, stderr, timedOut: false, exitCode: (error as any)?.code ?? 0 });
      }
    });
    try {
      child.stdin?.write(input);
      child.stdin?.end();
    } catch (_) { /* stdin may already be closed */ }
  });
}

async function runSingleTestCase(
  language: string,
  code: string,
  input: string,
  expectedOutput: string,
  tempDir: string
): Promise<{ passed: boolean; output: string; error?: string; timeMs: number }> {
  const fileId = Math.random().toString(36).substring(2, 9);
  const start = Date.now();

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  if (language === "python") {
    const filePath = path.join(tempDir, `solution_${fileId}.py`);
    fs.writeFileSync(filePath, code);

    const result = await runProcess(`python "${filePath}"`, input, 5000);
    try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }

    if (result.timedOut) return { passed: false, output: "Time Limit Exceeded", error: "Time Limit Exceeded", timeMs: Date.now() - start };
    if (result.exitCode !== 0) return { passed: false, output: result.stderr || result.stdout, error: "Runtime Error", timeMs: Date.now() - start };

    const cleanOutput = result.stdout.trim().replace(/\r\n/g, "\n");
    const cleanExpected = expectedOutput.trim().replace(/\r\n/g, "\n");
    return { passed: cleanOutput === cleanExpected, output: result.stdout, timeMs: Date.now() - start };

  } else if (language === "javascript") {
    const filePath = path.join(tempDir, `solution_${fileId}.js`);
    const jsWrapper = `const fs = require('fs');\nconst __input = fs.readFileSync(0,'utf-8').split(/\\r?\\n/);\nlet __lineIdx=0;\nfunction readline(){return __input[__lineIdx++];}\n${code}`;
    fs.writeFileSync(filePath, jsWrapper);

    const result = await runProcess(`node "${filePath}"`, input, 5000);
    try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }

    if (result.timedOut) return { passed: false, output: "Time Limit Exceeded", error: "Time Limit Exceeded", timeMs: Date.now() - start };
    if (result.exitCode !== 0) return { passed: false, output: result.stderr || result.stdout, error: "Runtime Error", timeMs: Date.now() - start };

    const cleanOutput = result.stdout.trim().replace(/\r\n/g, "\n");
    const cleanExpected = expectedOutput.trim().replace(/\r\n/g, "\n");
    return { passed: cleanOutput === cleanExpected, output: result.stdout, timeMs: Date.now() - start };

  } else if (language === "cpp") {
    const cppPath = path.join(tempDir, `solution_${fileId}.cpp`);
    const binPath = path.join(tempDir, `solution_${fileId}.exe`);
    fs.writeFileSync(cppPath, code);

    const compile = await runProcess(`g++ -O2 "${cppPath}" -o "${binPath}"`, "", 10000);
    if (compile.exitCode !== 0 || compile.timedOut) {
      try { fs.unlinkSync(cppPath); } catch (_) { /* ignore */ }
      return { passed: false, output: compile.stderr || "Compilation Error", error: "Compilation Error", timeMs: 0 };
    }

    const result = await runProcess(`"${binPath}"`, input, 5000);
    try { fs.unlinkSync(cppPath); } catch (_) { /* ignore */ }
    try { fs.unlinkSync(binPath); } catch (_) { /* ignore */ }

    if (result.timedOut) return { passed: false, output: "Time Limit Exceeded", error: "Time Limit Exceeded", timeMs: Date.now() - start };
    if (result.exitCode !== 0) return { passed: false, output: result.stderr || result.stdout, error: "Runtime Error", timeMs: Date.now() - start };

    const cleanOutput = result.stdout.trim().replace(/\r\n/g, "\n");
    const cleanExpected = expectedOutput.trim().replace(/\r\n/g, "\n");
    return { passed: cleanOutput === cleanExpected, output: result.stdout, timeMs: Date.now() - start };

  } else if (language === "java") {
    const javaDir = path.join(tempDir, `java_${fileId}`);
    fs.mkdirSync(javaDir, { recursive: true });
    const javaFile = path.join(javaDir, "Main.java");
    fs.writeFileSync(javaFile, code);

    const compile = await runProcess(`javac "${javaFile}"`, "", 10000);
    if (compile.exitCode !== 0 || compile.timedOut) {
      try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
      return { passed: false, output: compile.stderr || "Compilation Error", error: "Compilation Error", timeMs: 0 };
    }

    const result = await runProcess(`java -cp "${javaDir}" Main`, input, 5000);
    try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }

    if (result.timedOut) return { passed: false, output: "Time Limit Exceeded", error: "Time Limit Exceeded", timeMs: Date.now() - start };
    if (result.exitCode !== 0) return { passed: false, output: result.stderr || result.stdout, error: "Runtime Error", timeMs: Date.now() - start };

    const cleanOutput = result.stdout.trim().replace(/\r\n/g, "\n");
    const cleanExpected = expectedOutput.trim().replace(/\r\n/g, "\n");
    return { passed: cleanOutput === cleanExpected, output: result.stdout, timeMs: Date.now() - start };
  }

  return { passed: false, output: "Unsupported language", error: "Runtime Error", timeMs: 0 };
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
