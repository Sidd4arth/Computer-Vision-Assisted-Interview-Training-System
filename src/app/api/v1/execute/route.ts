import { NextRequest, NextResponse } from "next/server";
import { wrapCode } from "@/lib/code-wrappers";

export const runtime = "nodejs";

const JUDGE0_URL = "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";

const JUDGE0_LANG_IDS: Record<string, number> = {
  python: 100,
  cpp: 105,
  java: 91,
  javascript: 97,
};

function detectFunctionName(code: string, language: string): string {
  if (language === "javascript") {
    const match = code.match(/(?:function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/);
    return match ? (match[1] || match[2]) : "solve";
  }
  if (language === "python") {
    const match = code.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
    return match ? match[1] : "solve";
  }
  return "solve";
}

function wrapJavaScript(
  userCode: string,
  expectedFunctionName: string,
  testCases: Array<{ input: string; expectedOutput: string }>
): string {
  const testCalls = testCases.map((tc) => {
    let inputStr = "";
    try {
      const inputArray = JSON.parse(tc.input);
      if (Array.isArray(inputArray)) {
        inputStr = inputArray.map((arg: any) => JSON.stringify(arg)).join(', ');
      } else {
        inputStr = JSON.stringify(inputArray);
      }
    } catch(e) {
      inputStr = tc.input;
    }
    return `{ input: ${tc.input}, output: ${expectedFunctionName}(${inputStr}) }`;
  }).join(',\n  ');

  return `
${userCode}

// Auto-generated test harness
const __testResults = [
  ${testCalls}
];

console.log("---JSON_START---" + JSON.stringify(__testResults) + "---JSON_END---");
  `.trim();
}

function wrapPython(
  userCode: string,
  expectedFunctionName: string,
  testCases: Array<{ input: string; expectedOutput: string }>
): string {
  const testCalls = testCases.map((tc) => {
    let inputStr = "";
    try {
      const inputArray = JSON.parse(tc.input);
      if (Array.isArray(inputArray)) {
        inputStr = inputArray.map((arg: any) => {
          if (typeof arg === 'string') return `"${arg}"`;
          return JSON.stringify(arg);
        }).join(', ');
      } else {
        inputStr = JSON.stringify(inputArray);
      }
    } catch(e) {
      inputStr = tc.input;
    }
    return `(${tc.input}, ${expectedFunctionName}(${inputStr}))`;
  }).join(',\n  ');

  return `
${userCode}

# Auto-generated test harness
__test_results = [
  ${testCalls}
]

import json
print("---JSON_START---" + json.dumps(__test_results) + "---JSON_END---")
  `.trim();
}

async function runWithJudge0(
  languageId: number,
  code: string,
  stdin: string
): Promise<{ passed: boolean; output: string; error?: string; timeMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(JUDGE0_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const timeMs = Date.now() - start;

    if (!res.ok) {
      return {
        passed: false,
        output: `Execution service error (${res.status})`,
        error: "Runtime Error",
        timeMs,
      };
    }

    const data = await res.json() as {
      stdout?: string;
      stderr?: string;
      compile_output?: string;
      message?: string;
      time?: string;
      status: { id: number; description: string };
    };

    // Compilation error
    if (data.status.id === 6) {
      return {
        passed: false,
        output: data.compile_output || "Compilation failed",
        error: "Compilation Error",
        timeMs,
      };
    }

    // Runtime error
    if (data.status.id >= 7 && data.status.id <= 12) {
      let errorName = "Runtime Error";
      if (data.status.id === 11) errorName = "Time Limit Exceeded";
      return {
        passed: false,
        output: data.stderr || data.message || data.status.description || "Runtime Error",
        error: errorName,
        timeMs: data.time ? Math.round(parseFloat(data.time) * 1000) : timeMs,
      };
    }

    const stdout = data.stdout || "";
    return {
      passed: false,
      output: stdout,
      timeMs: data.time ? Math.round(parseFloat(data.time) * 1000) : timeMs,
    };
  } catch (err: any) {
    const timeMs = Date.now() - start;
    if (err.name === "AbortError") {
      return { passed: false, output: "Time Limit Exceeded", error: "Time Limit Exceeded", timeMs };
    }
    return { passed: false, output: err.message || "Execution failed", error: "Runtime Error", timeMs };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, testCases } = body;

    if (!code || !language || !testCases || !Array.isArray(testCases)) {
      return NextResponse.json({
        status: "error",
        error: "Missing or invalid required fields (code, language, testCases)"
      }, { status: 400 });
    }

    const languageId = JUDGE0_LANG_IDS[language];
    if (!languageId) {
      return NextResponse.json({
        status: "error",
        error: `Unsupported language: ${language}`
      }, { status: 400 });
    }

    // --- BATCH MODE FOR JS AND PYTHON ---
    if (language === "javascript" || language === "python") {
      const fnName = detectFunctionName(code, language);
      const wrapped = language === "javascript" 
        ? wrapJavaScript(code, fnName, testCases)
        : wrapPython(code, fnName, testCases);

      const runResult = await runWithJudge0(languageId, wrapped, "");

      if (runResult.error === "Compilation Error") {
        return NextResponse.json({
          status: "success",
          data: {
            compilationStatus: "error",
            compileError: runResult.output,
            testResults: [],
            totalTime: runResult.timeMs
          }
        });
      }

      if (runResult.error) {
        return NextResponse.json({
          status: "error",
          error: runResult.output
        });
      }

      // Parse output format: ---JSON_START---[...]---JSON_END---
      const output = runResult.output;
      const startTag = "---JSON_START---";
      const endTag = "---JSON_END---";
      const startIndex = output.indexOf(startTag);
      const endIndex = output.indexOf(endTag);

      if (startIndex === -1 || endIndex === -1) {
        return NextResponse.json({
          status: "error",
          error: `Output parser error: Could not find test results signature. Raw output:\n${output}`
        });
      }

      const jsonStr = output.substring(startIndex + startTag.length, endIndex);
      let parsedResults: any[] = [];
      try {
        parsedResults = JSON.parse(jsonStr);
      } catch (err: any) {
        return NextResponse.json({
          status: "error",
          error: `Failed to parse execution JSON: ${err.message}. Raw output:\n${output}`
        });
      }

      const testResults = testCases.map((tc, idx) => {
        let actualVal: any = "";
        let passed = false;

        if (language === "javascript") {
          // JS wrapper output format: [{ input: ..., output: ... }]
          const res = parsedResults[idx];
          actualVal = res ? res.output : undefined;
        } else {
          // Python wrapper output format: [[input, output]]
          const res = parsedResults[idx];
          actualVal = res ? res[1] : undefined;
        }

        const cleanActual = String(actualVal).trim().replace(/\r\n/g, "\n");
        const cleanExpected = String(tc.expectedOutput).trim().replace(/\r\n/g, "\n");
        passed = cleanActual === cleanExpected;

        return {
          passed,
          testInput: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: JSON.stringify(actualVal) || String(actualVal),
          executionTime: Math.round(runResult.timeMs / testCases.length)
        };
      });

      return NextResponse.json({
        status: "success",
        data: {
          compilationStatus: "success",
          testResults,
          totalTime: runResult.timeMs
        }
      });
    }

    // --- SEQUENTIAL INDIVIDUAL MODE FOR JAVA AND CPP ---
    const testResults = [];
    let totalTime = 0;
    let compilationStatus: "success" | "error" = "success";
    let compileError: string | undefined;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      // Use existing code wrappers fallback mechanism
      const wrapped = wrapCode("generic", language, code);
      const runResult = await runWithJudge0(languageId, wrapped, tc.input);

      totalTime += runResult.timeMs;

      if (runResult.error === "Compilation Error") {
        compilationStatus = "error";
        compileError = runResult.output;
        break;
      }

      const cleanActual = runResult.output.trim().replace(/\r\n/g, "\n");
      const cleanExpected = tc.expectedOutput.trim().replace(/\r\n/g, "\n");
      const passed = !runResult.error && cleanActual === cleanExpected;

      testResults.push({
        passed,
        testInput: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: runResult.output,
        executionTime: runResult.timeMs,
        errorMessage: runResult.error
      });
    }

    return NextResponse.json({
      status: "success",
      data: {
        compilationStatus,
        compileError,
        testResults,
        totalTime
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message || "Failed to execute code"
    }, { status: 500 });
  }
}
