/**
 * Code wrappers to automatically append input parsing and driver execution
 * for LeetCode-style compiler experience.
 */

// Helper to normalize question titles
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

// C++ Helper Parsers
const CPP_PARSERS = `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <stack>
#include <unordered_map>
#include <algorithm>
#include <climits>

using namespace std;

vector<int> parseVector(string s) {
    vector<int> res;
    string num = "";
    for (char c : s) {
        if (c == '[' || c == ']' || c == ',' || c == ' ') {
            if (!num.empty()) {
                res.push_back(stoi(num));
                num = "";
            }
        } else {
            num += c;
        }
    }
    return res;
}

vector<vector<int>> parse2DVector(string s) {
    vector<vector<int>> res;
    vector<int> current;
    string num = "";
    bool inside = false;
    for (char c : s) {
        if (c == '[') {
            inside = true;
        } else if (c == ']') {
            if (!num.empty()) {
                current.push_back(stoi(num));
                num = "";
            }
            if (!current.empty()) {
                res.push_back(current);
                current.clear();
            }
            inside = false;
        } else if (c == ',') {
            if (inside && !num.empty()) {
                current.push_back(stoi(num));
                num = "";
            }
        } else if (isdigit(c) || c == '-') {
            num += c;
        }
    }
    return res;
}

vector<vector<char>> parse2DCharVector(string s) {
    vector<vector<char>> res;
    vector<char> current;
    bool inside = false;
    for (char c : s) {
        if (c == '[') {
            inside = true;
        } else if (c == ']') {
            if (!current.empty()) {
                res.push_back(current);
                current.clear();
            }
            inside = false;
        } else if (c == '"' || c == '\'') {
            // ignore quotes
        } else if (inside && (c == '1' || c == '0')) {
            current.push_back(c);
        }
    }
    return res;
}
`;

// Java Helper Parsers
const JAVA_PARSERS = `
import java.util.*;

class Helper {
    public static int parse_int(String s) {
        return Integer.parseInt(s.trim());
    }

    public static double parse_double(String s) {
        return Double.parseDouble(s.trim());
    }

    public static boolean parse_bool(String s) {
        s = s.trim();
        return s.equals("true") || s.equals("1");
    }

    public static int[] parseVector(String s) {
        s = s.trim().replaceAll("[\\[\\]]", "").replaceAll("\\s", "");
        if (s.isEmpty()) return new int[0];
        String[] parts = s.split(",");
        int[] res = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = Integer.parseInt(parts[i].trim());
        }
        return res;
    }

    public static int[][] parse2DVector(String s) {
        s = s.trim();
        if (s.equals("[]") || s.equals("[[]]")) return new int[0][0];
        List<int[]> list = new ArrayList<>();
        int i = 0;
        while (i < s.length()) {
            if (s.charAt(i) == '[') {
                int start = i + 1;
                int end = s.indexOf(']', start);
                if (end != -1) {
                    list.add(parseVector(s.substring(start, end)));
                    i = end;
                }
            }
            i++;
        }
        return list.toArray(new int[0][]);
    }

    public static char[][] parse2DCharVector(String s) {
        s = s.trim();
        if (s.equals("[]") || s.equals("[[]]")) return new char[0][0];
        List<char[]> list = new ArrayList<>();
        int i = 0;
        while (i < s.length()) {
            if (s.charAt(i) == '[') {
                int start = i + 1;
                int end = s.indexOf(']', start);
                if (end != -1) {
                    String sub = s.substring(start, end).replaceAll("[\"'\\\\s]", "");
                    if (!sub.isEmpty()) {
                        String[] parts = sub.split(",");
                        char[] chars = new char[parts.length];
                        for (int j = 0; j < parts.length; j++) {
                            chars[j] = parts[j].charAt(0);
                        }
                        list.add(chars);
                    }
                    i = end;
                }
            }
            i++;
        }
        return list.toArray(new char[0][]);
    }

    public static String parseString(String s) {
        s = s.trim();
        if (s.length() >= 2 && s.startsWith("\"") && s.endsWith("\"")) return s.substring(1, s.length() - 1);
        if (s.length() >= 2 && s.startsWith("'") && s.endsWith("'")) return s.substring(1, s.length() - 1);
        return s;
    }
}
`;

// --- DYNAMIC INTERPRETATION & COMPILATION UTILITIES ---

interface ParsedSignature {
  returnType: string;
  methodName: string;
  params: Array<{ type: string; name: string }>;
}

function parseCppSignature(code: string): ParsedSignature | null {
  const cleanCode = code.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
  const classMatch = cleanCode.match(/class\s+Solution\s*\{([\s\S]*)\};/);
  const body = classMatch ? classMatch[1] : cleanCode;
  
  const methodRegex = /\b([a-zA-Z0-9_<>\s*&:]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/;
  const match = methodRegex.exec(body);
  if (!match) return null;
  
  const returnType = match[1].trim();
  const methodName = match[2].trim();
  const paramsStr = match[3].trim();
  
  if (methodName === "Solution" || returnType.includes("public:") || returnType.includes("private:")) {
    return null;
  }
  
  const params = paramsStr.split(",").map(p => p.trim()).filter(Boolean).map(p => {
    const parts = p.split(/\s+/);
    const name = parts[parts.length - 1].replace(/[&*]/g, "");
    const type = p.substring(0, p.lastIndexOf(parts[parts.length - 1])).trim();
    return { type, name };
  });
  
  return { returnType, methodName, params };
}

function parseJavaSignature(code: string): ParsedSignature | null {
  const cleanCode = code.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
  const classMatch = cleanCode.match(/class\s+Solution\s*\{([\s\S]*)\}/);
  const body = classMatch ? classMatch[1] : cleanCode;
  
  const methodRegex = /\b(public|protected|private)?\s*([a-zA-Z0-9_<>\[\]]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/;
  const match = methodRegex.exec(body);
  if (!match) return null;
  
  const returnType = match[2].trim();
  const methodName = match[3].trim();
  const paramsStr = match[4].trim();
  
  if (methodName === "Solution") return null;
  
  const params = paramsStr.split(",").map(p => p.trim()).filter(Boolean).map(p => {
    const parts = p.split(/\s+/);
    const name = parts[parts.length - 1];
    const type = p.substring(0, p.lastIndexOf(parts[parts.length - 1])).trim();
    return { type, name };
  });
  
  return { returnType, methodName, params };
}

function getCppParserExpr(type: string, inputVarName: string): string {
  const norm = type.replace(/\s+/g, "").replace(/\bconst\b/g, "").replace(/[&*]/g, "");
  if (norm === "int" || norm === "long" || norm === "longlong") return `stoi(${inputVarName})`;
  if (norm === "double" || norm === "float") return `stod(${inputVarName})`;
  if (norm === "bool") return `(${inputVarName} == "true" || ${inputVarName} == "1")`;
  if (norm === "string" || norm === "std::string") {
    return `(${inputVarName}.size() >= 2 && ${inputVarName}.front() == '"' ? ${inputVarName}.substr(1, ${inputVarName}.size() - 2) : ${inputVarName})`;
  }
  if (norm === "vector<int>" || norm === "std::vector<int>") return `parseVector(${inputVarName})`;
  if (norm === "vector<vector<int>>" || norm === "std::vector<std::vector<int>>") return `parse2DVector(${inputVarName})`;
  if (norm === "vector<vector<char>>" || norm === "std::vector<std::vector<char>>") return `parse2DCharVector(${inputVarName})`;
  return `${inputVarName}`;
}

function getCppPrinterCode(type: string, varName: string): string {
  const norm = type.replace(/\s+/g, "").replace(/\bconst\b/g, "").replace(/[&*]/g, "");
  if (norm === "int" || norm === "long" || norm === "longlong" || norm === "double" || norm === "float") {
    return `cout << ${varName} << endl;`;
  }
  if (norm === "bool") {
    return `cout << (${varName} ? "true" : "false") << endl;`;
  }
  if (norm === "string" || norm === "std::string") {
    return `cout << ${varName} << endl;`;
  }
  if (norm === "vector<int>" || norm === "std::vector<int>") {
    return `cout << "[";
        for(size_t i=0; i<${varName}.size(); ++i) {
            cout << ${varName}[i] << (i+1 == ${varName}.size() ? "" : ",");
        }
        cout << "]" << endl;`;
  }
  if (norm === "vector<vector<int>>" || norm === "std::vector<std::vector<int>>") {
    return `cout << "[";
        for(size_t i=0; i<${varName}.size(); ++i) {
            cout << "[";
            for(size_t j=0; j<${varName}[i].size(); ++j) {
                cout << ${varName}[i][j] << (j+1 == ${varName}[i].size() ? "" : ",");
            }
            cout << "]" << (i+1 == ${varName}.size() ? "" : ",");
        }
        cout << "]" << endl;`;
  }
  return `cout << ${varName} << endl;`;
}

function generateCppDynamicMain(signature: ParsedSignature): string {
  let mainCode = `\nint main() {\n`;
  
  signature.params.forEach((param, index) => {
    mainCode += `    string line${index};\n`;
  });
  
  let conditions = signature.params.map((_, index) => `getline(cin, line${index})`).join(" && ");
  if (!conditions) {
    conditions = "true";
  }
  
  mainCode += `    if (${conditions}) {\n`;
  
  signature.params.forEach((param, index) => {
    const declaredType = param.type.replace(/&/g, "").replace(/\bconst\b/g, "").trim();
    const parserExpr = getCppParserExpr(param.type, `line${index}`);
    mainCode += `        ${declaredType} var${index} = ${parserExpr};\n`;
  });
  
  mainCode += `        Solution sol;\n`;
  if (signature.returnType === "void") {
    mainCode += `        sol.${signature.methodName}(${signature.params.map((_, index) => `var${index}`).join(", ")});\n`;
  } else {
    mainCode += `        ${signature.returnType} result = sol.${signature.methodName}(${signature.params.map((_, index) => `var${index}`).join(", ")});\n`;
    mainCode += `        ` + getCppPrinterCode(signature.returnType, "result") + `\n`;
  }
  
  mainCode += `    }\n`;
  mainCode += `    return 0;\n`;
  mainCode += `}\n`;
  
  return mainCode;
}

function getJavaParserExpr(type: string, inputVarName: string): string {
  const norm = type.replace(/\s+/g, "");
  if (norm === "int" || norm === "Integer") return `Helper.parse_int(${inputVarName})`;
  if (norm === "double" || norm === "Double") return `Helper.parse_double(${inputVarName})`;
  if (norm === "boolean" || norm === "Boolean") return `Helper.parse_bool(${inputVarName})`;
  if (norm === "String") return `Helper.parseString(${inputVarName})`;
  if (norm === "int[]") return `Helper.parseVector(${inputVarName})`;
  if (norm === "int[][]") return `Helper.parse2DVector(${inputVarName})`;
  if (norm === "char[][]") return `Helper.parse2DCharVector(${inputVarName})`;
  return `Helper.parseString(${inputVarName})`;
}

function getJavaPrinterCode(type: string, varName: string): string {
  const norm = type.replace(/\s+/g, "");
  if (norm === "int" || norm === "Integer" || norm === "double" || norm === "Double" || norm === "boolean" || norm === "Boolean" || norm === "String") {
    return `System.out.println(${varName});`;
  }
  if (norm === "int[]" || norm === "Integer[]" || norm === "String[]") {
    return `System.out.println(Arrays.toString(${varName}).replaceAll(" ", ""));`;
  }
  if (norm === "int[][]") {
    return `System.out.print("[");
        for (int i = 0; i < ${varName}.length; i++) {
            System.out.print(Arrays.toString(${varName}[i]).replaceAll(" ", "") + (i + 1 == ${varName}.length ? "" : ","));
        }
        System.out.println("]");`;
  }
  return `System.out.println(${varName});`;
}

function generateJavaDynamicMain(signature: ParsedSignature): string {
  let mainCode = `\npublic class Main {\n`;
  mainCode += `    public static void main(String[] args) {\n`;
  mainCode += `        Scanner sc = new Scanner(System.in);\n`;
  
  signature.params.forEach((param, index) => {
    mainCode += `        if (!sc.hasNextLine()) return;\n`;
    mainCode += `        String line${index} = sc.nextLine();\n`;
  });
  
  signature.params.forEach((param, index) => {
    const parserExpr = getJavaParserExpr(param.type, `line${index}`);
    mainCode += `        ${param.type} var${index} = ${parserExpr};\n`;
  });
  
  mainCode += `        Solution sol = new Solution();\n`;
  if (signature.returnType === "void") {
    mainCode += `        sol.${signature.methodName}(${signature.params.map((_, index) => `var${index}`).join(", ")});\n`;
  } else {
    mainCode += `        ${signature.returnType} result = sol.${signature.methodName}(${signature.params.map((_, index) => `var${index}`).join(", ")});\n`;
    mainCode += `        ` + getJavaPrinterCode(signature.returnType, "result") + `\n`;
  }
  
  mainCode += `    }\n`;
  mainCode += `}\n`;
  
  return mainCode;
}

// Detect the first method/function name from Python code (def X(...):)
function detectPythonMethod(code: string): { fnName: string; paramCount: number } | null {
  // Try class Solution method first
  const classMethodMatch = code.match(/class\s+Solution[\s\S]*?def\s+([a-z_A-Z][a-zA-Z0-9_]*)\s*\(self(?:,\s*([^)]*))?\)/);
  if (classMethodMatch) {
    const paramStr = classMethodMatch[2] || "";
    const paramCount = paramStr ? paramStr.split(",").filter(Boolean).length : 0;
    return { fnName: classMethodMatch[1], paramCount };
  }
  // Top-level function
  const funcMatch = code.match(/def\s+([a-z_A-Z][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
  if (funcMatch) {
    const paramStr = funcMatch[2] || "";
    const paramCount = paramStr.split(",").filter(p => p.trim() !== "").length;
    return { fnName: funcMatch[1], paramCount };
  }
  return null;
}

function generatePythonFallback(code: string): string {
  const detected = detectPythonMethod(code);
  if (!detected) {
    return `\nimport sys\nprint(sys.stdin.read().strip())\n`;
  }
  const { fnName, paramCount } = detected;
  const isInClass = code.includes("class Solution");

  // Generate appropriate input parsing based on param count
  let inputLines = "";
  let callArgs = "";
  
  if (paramCount === 0) {
    inputLines = ``;
    callArgs = ``;
  } else if (paramCount === 1) {
    inputLines = `
import json, sys
_raw = sys.stdin.read().strip()
try:
    _arg0 = json.loads(_raw)
except:
    _arg0 = _raw.strip('"').strip("'")
`;
    callArgs = `_arg0`;
  } else if (paramCount === 2) {
    inputLines = `
import json, sys
_lines = sys.stdin.read().splitlines()
try:
    _arg0 = json.loads(_lines[0]) if len(_lines) > 0 else None
except:
    _arg0 = _lines[0] if _lines else ""
try:
    _arg1 = json.loads(_lines[1]) if len(_lines) > 1 else None
except:
    _arg1 = _lines[1] if len(_lines) > 1 else ""
`;
    callArgs = `_arg0, _arg1`;
  } else {
    inputLines = `
import json, sys
_lines = sys.stdin.read().splitlines()
_args = []
for _line in _lines:
    try:
        _args.append(json.loads(_line))
    except:
        _args.append(_line.strip('"').strip("'"))
`;
    callArgs = `*_args`;
  }

  if (isInClass) {
    return `${inputLines}
try:
    _sol = Solution()
    _result = _sol.${fnName}(${callArgs})
    if _result is not None:
        import json
        print(json.dumps(_result) if isinstance(_result, (list, dict)) else _result)
except Exception as e:
    print(f"Error: {e}")
`;
  } else {
    return `${inputLines}
try:
    _result = ${fnName}(${callArgs})
    if _result is not None:
        import json
        print(json.dumps(_result) if isinstance(_result, (list, dict)) else _result)
except Exception as e:
    print(f"Error: {e}")
`;
  }
}

function generateJsFallback(code: string): string {
  // Detect the first function name or class method
  const classMethodMatch = code.match(/class\s+Solution[\s\S]*?([a-z_A-Z][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
  const funcMatch = code.match(/(?:function\s+([a-z_A-Z][a-zA-Z0-9_]*)|(?:const|let|var)\s+([a-z_A-Z][a-zA-Z0-9_]*)\s*=\s*(?:function|\([^)]*\)\s*=>))\s*\(([^)]*)\)/);
  
  let fnName = "solve";
  let paramCount = 1;
  
  if (classMethodMatch) {
    fnName = classMethodMatch[1];
    paramCount = classMethodMatch[2] ? classMethodMatch[2].split(",").filter(Boolean).length : 0;
  } else if (funcMatch) {
    fnName = funcMatch[1] || funcMatch[2] || "solve";
    const paramStr = funcMatch[3] || "";
    paramCount = paramStr ? paramStr.split(",").filter(Boolean).length : 0;
  }

  const isInClass = code.includes("class Solution");

  let inputParsing = "";
  let callArgs = "";

  if (paramCount === 0) {
    inputParsing = `const fs = require('fs'); fs.readFileSync(0, 'utf-8');`;
    callArgs = ``;
  } else if (paramCount === 1) {
    inputParsing = `
const fs = require('fs');
const _raw = fs.readFileSync(0, 'utf-8').trim();
let _arg0;
try { _arg0 = JSON.parse(_raw); } catch(e) { _arg0 = _raw.replace(/^["']|["']$/g, ''); }`;
    callArgs = `_arg0`;
  } else if (paramCount === 2) {
    inputParsing = `
const fs = require('fs');
const _lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
let _arg0, _arg1;
try { _arg0 = JSON.parse(_lines[0]); } catch(e) { _arg0 = _lines[0]; }
try { _arg1 = JSON.parse(_lines[1]); } catch(e) { _arg1 = _lines[1]; }`;
    callArgs = `_arg0, _arg1`;
  } else {
    inputParsing = `
const fs = require('fs');
const _lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
const _args = _lines.map(l => { try { return JSON.parse(l); } catch(e) { return l; } });`;
    callArgs = `..._args`;
  }

  if (isInClass) {
    return `${inputParsing}
const _ans = new Solution().${fnName}(${callArgs});
console.log(Array.isArray(_ans) ? JSON.stringify(_ans) : _ans);
`;
  } else {
    return `${inputParsing}
try {
    const _ans = ${fnName}(${callArgs});
    console.log(Array.isArray(_ans) ? JSON.stringify(_ans) : _ans);
} catch(e) {
    console.error('Error: ' + e.message);
}
`;
  }
}

export function wrapCode(title: string, language: string, code: string, starterCode?: string): string {
  const normTitle = normalizeTitle(title);

  // If the user already wrote a main or input reading boilerplate, run it as-is
  if (language === "python" && (code.includes("sys.stdin") || code.includes("input(") || code.includes("__main__"))) {
    return code;
  }
  if (language === "cpp" && code.includes("int main")) {
    return code;
  }
  if (language === "java" && (code.includes("public static void main") || code.includes("class Main"))) {
    return code;
  }
  if (language === "javascript" && (code.includes("readline(") || code.includes("fs.readFileSync"))) {
    return code;
  }

  // --- PYTHON WRAPPERS ---
  if (language === "python") {
    let driver = "";
    if (normTitle === "twosum") {
      driver = `
import json
import sys

# Instantiate Solution class if defined, otherwise fall back to standalone function
try:
    sol = Solution()
    two_sum_fn = sol.twoSum
except NameError:
    two_sum_fn = two_sum

lines = sys.stdin.read().splitlines()
if len(lines) >= 2:
    nums = json.loads(lines[0])
    target = int(lines[1])
    print(two_sum_fn(nums, target))
`;
    } else if (normTitle === "validparentheses") {
      driver = `
import sys
try:
    sol = Solution()
    is_valid_fn = sol.isValid
except NameError:
    is_valid_fn = is_valid

s = sys.stdin.read().strip()
# strip surrounding quotes if present
if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
    s = s[1:-1]
print(str(is_valid_fn(s)).lower())
`;
    } else if (normTitle === "maximumsubarray") {
      driver = `
import json
import sys
try:
    sol = Solution()
    max_subarray_fn = sol.maxSubArray
except NameError:
    max_subarray_fn = max_subarray

nums = json.loads(sys.stdin.read().strip())
print(max_subarray_fn(nums))
`;
    } else if (normTitle === "mergeintervals") {
      driver = `
import json
import sys
try:
    sol = Solution()
    merge_fn = sol.merge
except NameError:
    merge_fn = merge

intervals = json.loads(sys.stdin.read().strip())
print(merge_fn(intervals))
`;
    } else if (normTitle === "lrucache") {
      driver = `
import sys
lines = sys.stdin.read().splitlines()
if lines:
    capacity = int(lines[0])
    cache = LRUCache(capacity)
    for line in lines[1:]:
        parts = line.strip().split()
        if not parts:
            continue
        if parts[0] == 'get':
            print(cache.get(int(parts[1])))
        elif parts[0] == 'put':
            cache.put(int(parts[1]), int(parts[2]))
`;
    } else if (normTitle === "numberofislands") {
      driver = `
import json
import sys
try:
    sol = Solution()
    num_islands_fn = sol.numIslands
except NameError:
    num_islands_fn = num_islands

grid = json.loads(sys.stdin.read().strip())
print(num_islands_fn(grid))
`;
    } else if (normTitle === "longestsubstringwithoutrepeatingcharacters") {
      driver = `
import sys
try:
    sol = Solution()
    length_fn = sol.lengthOfLongestSubstring
except NameError:
    length_fn = length_of_longest_substring

s = sys.stdin.read().strip()
if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
    s = s[1:-1]
print(length_fn(s))
`;
    } else if (normTitle === "besttimetobuyandsellstock") {
      driver = `
import json
import sys
try:
    sol = Solution()
    max_profit_fn = sol.maxProfit
except NameError:
    max_profit_fn = max_profit

prices = json.loads(sys.stdin.read().strip())
print(max_profit_fn(prices))
`;
    } else if (normTitle === "squaresofasortedarray") {
      driver = `
import json
import sys
try:
    sol = Solution()
    sorted_squares_fn = sol.sortedSquares
except NameError:
    try:
        sol = Solution()
        sorted_squares_fn = sol.sorted_squares
    except NameError:
        sorted_squares_fn = sortedSquares

nums = json.loads(sys.stdin.read().strip())
res = sorted_squares_fn(nums)
print(json.dumps(res))
`;
    } else {
      // Generic dynamic fallback: detect method name and guess input parsing
      driver = generatePythonFallback(code);
    }
    return code + "\n" + driver;
  }

  // --- JAVASCRIPT WRAPPERS ---
  if (language === "javascript") {
    let driver = "";
    if (normTitle === "twosum") {
      driver = `
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
if (lines.length >= 2) {
    const nums = JSON.parse(lines[0]);
    const target = parseInt(lines[1]);
    
    let ans;
    if (typeof Solution !== 'undefined') {
        ans = new Solution().twoSum(nums, target);
    } else if (typeof twoSum !== 'undefined') {
        ans = twoSum(nums, target);
    }
    console.log(JSON.stringify(ans));
}
`;
    } else if (normTitle === "validparentheses") {
      driver = `
const fs = require('fs');
let s = fs.readFileSync(0, 'utf-8').trim();
if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
}
let ans = false;
if (typeof Solution !== 'undefined') {
    ans = new Solution().isValid(s);
} else if (typeof isValid !== 'undefined') {
    ans = isValid(s);
}
console.log(ans);
`;
    } else if (normTitle === "maximumsubarray") {
      driver = `
const fs = require('fs');
const nums = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
let ans = 0;
if (typeof Solution !== 'undefined') {
    ans = new Solution().maxSubArray(nums);
} else if (typeof maxSubArray !== 'undefined') {
    ans = maxSubArray(nums);
}
console.log(ans);
`;
    } else if (normTitle === "mergeintervals") {
      driver = `
const fs = require('fs');
const intervals = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
let ans = [];
if (typeof Solution !== 'undefined') {
    ans = new Solution().merge(intervals);
} else if (typeof merge !== 'undefined') {
    ans = merge(intervals);
}
console.log(JSON.stringify(ans));
`;
    } else if (normTitle === "lrucache") {
      driver = `
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
if (lines.length > 0) {
    const capacity = parseInt(lines[0]);
    const cache = new LRUCache(capacity);
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\\s+/);
        if (!parts[0]) continue;
        if (parts[0] === 'get') {
            console.log(cache.get(parseInt(parts[1])));
        } else if (parts[0] === 'put') {
            cache.put(parseInt(parts[1]), parseInt(parts[2]));
        }
    }
}
`;
    } else if (normTitle === "numberofislands") {
      driver = `
const fs = require('fs');
const grid = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
let ans = 0;
if (typeof Solution !== 'undefined') {
    ans = new Solution().numIslands(grid);
} else if (typeof numIslands !== 'undefined') {
    ans = numIslands(grid);
}
console.log(ans);
`;
    } else if (normTitle === "longestsubstringwithoutrepeatingcharacters") {
      driver = `
const fs = require('fs');
let s = fs.readFileSync(0, 'utf-8').trim();
if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
}
let ans = 0;
if (typeof Solution !== 'undefined') {
    ans = new Solution().lengthOfLongestSubstring(s);
} else if (typeof lengthOfLongestSubstring !== 'undefined') {
    ans = lengthOfLongestSubstring(s);
}
console.log(ans);
`;
    } else if (normTitle === "besttimetobuyandsellstock") {
      driver = `
const fs = require('fs');
const prices = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
let ans = 0;
if (typeof Solution !== 'undefined') {
    ans = new Solution().maxProfit(prices);
} else if (typeof maxProfit !== 'undefined') {
    ans = maxProfit(prices);
}
console.log(ans);
`;
    } else if (normTitle === "squaresofasortedarray") {
      driver = `
const fs = require('fs');
const nums = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
let ans = [];
if (typeof Solution !== 'undefined') {
    ans = new Solution().sortedSquares(nums);
} else if (typeof sortedSquares !== 'undefined') {
    ans = sortedSquares(nums);
}
console.log(JSON.stringify(ans));
`;
    } else {
      // Generic dynamic fallback: detect method name and guess input parsing
      driver = generateJsFallback(code);
    }
    return code + "\n" + driver;
  }

  // --- C++ WRAPPERS ---
  if (language === "cpp") {
    let mainFunc = "";
    if (normTitle === "twosum") {
      mainFunc = `
int main() {
    string line1;
    int target;
    if (getline(cin, line1) && (cin >> target)) {
        vector<int> nums = parseVector(line1);
        vector<int> ans;
        #ifdef SOLUTION_CLASS
        Solution sol;
        ans = sol.twoSum(nums, target);
        #else
        ans = twoSum(nums, target);
        #endif
        cout << "[";
        for (size_t i = 0; i < ans.size(); i++) {
            cout << ans[i] << (i + 1 == ans.size() ? "" : ",");
        }
        cout << "]" << endl;
    }
    return 0;
}
`;
    } else if (normTitle === "validparentheses") {
      mainFunc = `
int main() {
    string s;
    if (cin >> s) {
        if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
            s = s.substr(1, s.size() - 2);
        }
        bool ans;
        #ifdef SOLUTION_CLASS
        Solution sol;
        ans = sol.isValid(s);
        #else
        ans = isValid(s);
        #endif
        cout << (ans ? "true" : "false") << endl;
    }
    return 0;
}
`;
    } else if (normTitle === "maximumsubarray") {
      mainFunc = `
int main() {
    string s;
    if (cin >> s) {
        vector<int> nums = parseVector(s);
        int ans;
        #ifdef SOLUTION_CLASS
        Solution sol;
        ans = sol.maxSubArray(nums);
        #else
        ans = maxSubArray(nums);
        #endif
        cout << ans << endl;
    }
    return 0;
}
`;
    } else if (normTitle === "mergeintervals") {
      mainFunc = `
int main() {
    string s;
    if (cin >> s) {
        vector<vector<int>> intervals = parse2DVector(s);
        vector<vector<int>> ans;
        #ifdef SOLUTION_CLASS
        Solution sol;
        ans = sol.merge(intervals);
        #else
        ans = merge(intervals);
        #endif
        cout << "[";
        for (size_t i = 0; i < ans.size(); i++) {
            cout << "[" << ans[i][0] << "," << ans[i][1] << "]" << (i + 1 == ans.size() ? "" : ",");
        }
        cout << "]" << endl;
    }
    return 0;
}
`;
    } else if (normTitle === "lrucache") {
      mainFunc = `
int main() {
    int capacity;
    if (cin >> capacity) {
        LRUCache cache(capacity);
        string op;
        while (cin >> op) {
            if (op == "put") {
                int k, v;
                cin >> k >> v;
                cache.put(k, v);
            } else if (op == "get") {
                int k;
                cin >> k;
                cout << cache.get(k) << endl;
            }
        }
    }
    return 0;
}
`;
    } else if (normTitle === "numberofislands") {
      mainFunc = `
int main() {
    string s;
    if (cin >> s) {
        vector<vector<char>> grid = parse2DCharVector(s);
        int ans;
        #ifdef SOLUTION_CLASS
        Solution sol;
        ans = sol.numIslands(grid);
        #else
        ans = numIslands(grid);
        #endif
        cout << ans << endl;
    }
    return 0;
}
`;
    } else if (normTitle === "longestsubstringwithoutrepeatingcharacters") {
      mainFunc = `
int main() {
    string s;
    if (cin >> s) {
        if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
            s = s.substr(1, s.size() - 2);
        }
        int ans;
        #ifdef SOLUTION_CLASS
        Solution sol;
        ans = sol.lengthOfLongestSubstring(s);
        #else
        ans = lengthOfLongestSubstring(s);
        #endif
        cout << ans << endl;
    }
    return 0;
}
`;
    } else if (normTitle === "besttimetobuyandsellstock") {
      mainFunc = `
int main() {
    string s;
    if (cin >> s) {
        vector<int> prices = parseVector(s);
        int ans;
        #ifdef SOLUTION_CLASS
        Solution sol;
        ans = sol.maxProfit(prices);
        #else
        ans = maxProfit(prices);
        #endif
        cout << ans << endl;
    }
    return 0;
}
`;
    } else if (normTitle === "squaresofasortedarray") {
      mainFunc = `
int main() {
    string s;
    if (cin >> s) {
        vector<int> nums = parseVector(s);
        vector<int> ans;
        #ifdef SOLUTION_CLASS
        Solution sol;
        ans = sol.sortedSquares(nums);
        #else
        ans = sortedSquares(nums);
        #endif
        cout << "[";
        for (size_t i = 0; i < ans.size(); i++) {
            cout << ans[i] << (i + 1 == ans.size() ? "" : ",");
        }
        cout << "]" << endl;
    }
    return 0;
}
`;
    } else {
      // Try to dynamically parse the user's signature for unknown questions
      const signature = parseCppSignature(code);
      if (signature) {
        mainFunc = generateCppDynamicMain(signature);
      } else {
        // Absolute last resort: compile and run as-is (user must provide full program)
        mainFunc = ``;
      }
    }

    // Detect if the user wrote class Solution
    const isSolutionClass = code.includes("class Solution");
    const prefix = isSolutionClass ? "" : "";

    return CPP_PARSERS + "\n" + code + "\n" + mainFunc;
  }

  // --- JAVA WRAPPERS ---
  if (language === "java") {
    let mainClass = "";
    if (normTitle === "twosum") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String line1 = sc.nextLine();
            int target = sc.nextInt();
            int[] nums = Helper.parseVector(line1);
            Solution sol = new Solution();
            int[] ans = sol.twoSum(nums, target);
            System.out.println(Arrays.toString(ans).replaceAll(" ", ""));
        }
    }
}
`;
    } else if (normTitle === "validparentheses") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNext()) {
            String s = sc.next();
            if (s.length() >= 2 && s.charAt(0) == '"' && s.charAt(s.length() - 1) == '"') {
                s = s.substring(1, s.length() - 1);
            }
            Solution sol = new Solution();
            System.out.println(sol.isValid(s));
        }
    }
}
`;
    } else if (normTitle === "maximumsubarray") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            int[] nums = Helper.parseVector(s);
            Solution sol = new Solution();
            System.out.println(sol.maxSubArray(nums));
        }
    }
}
`;
    } else if (normTitle === "mergeintervals") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            int[][] intervals = Helper.parse2DVector(s);
            Solution sol = new Solution();
            int[][] ans = sol.merge(intervals);
            System.out.print("[");
            for (int i = 0; i < ans.length; i++) {
                System.out.print("[" + ans[i][0] + "," + ans[i][1] + "]" + (i + 1 == ans.length ? "" : ","));
            }
            System.out.println("]");
        }
    }
}
`;
    } else if (normTitle === "lrucache") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int capacity = sc.nextInt();
            LRUCache cache = new LRUCache(capacity);
            while (sc.hasNext()) {
                String op = sc.next();
                if (op.equals("put")) {
                    cache.put(sc.nextInt(), sc.nextInt());
                } else if (op.equals("get")) {
                    System.out.println(cache.get(sc.nextInt()));
                }
            }
        }
    }
}
`;
    } else if (normTitle === "numberofislands") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            char[][] grid = Helper.parse2DCharVector(s);
            Solution sol = new Solution();
            System.out.println(sol.numIslands(grid));
        }
    }
}
`;
    } else if (normTitle === "longestsubstringwithoutrepeatingcharacters") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNext()) {
            String s = sc.next();
            if (s.length() >= 2 && s.charAt(0) == '"' && s.charAt(s.length() - 1) == '"') {
                s = s.substring(1, s.length() - 1);
            }
            Solution sol = new Solution();
            System.out.println(sol.lengthOfLongestSubstring(s));
        }
    }
}
`;
    } else if (normTitle === "besttimetobuyandsellstock") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            int[] prices = Helper.parseVector(s);
            Solution sol = new Solution();
            System.out.println(sol.maxProfit(prices));
        }
    }
}
`;
    } else if (normTitle === "squaresofasortedarray") {
      mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            int[] nums = Helper.parseVector(s);
            Solution sol = new Solution();
            int[] ans = sol.sortedSquares(nums);
            System.out.println(Arrays.toString(ans).replaceAll(" ", ""));
        }
    }
}
`;
    } else {
      // Try to dynamically parse the user's signature for unknown questions
      const signature = parseJavaSignature(code);
      if (signature) {
        mainClass = generateJavaDynamicMain(signature);
      } else {
        mainClass = `
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        StringBuilder sb = new StringBuilder();
        while (sc.hasNextLine()) {
            if (sb.length() > 0) sb.append("\\n");
            sb.append(sc.nextLine());
        }
        Solution sol = new Solution();
        System.out.println(sol.solve(sb.toString().trim()));
    }
}
`;
      }
    }

    // Wrap the user's code. Since user's code might define "class Solution", we can just prepend import statements
    // and append helper + Main class.
    return "import java.util.*;\n" + JAVA_PARSERS + "\n" + code + "\n" + mainClass;
  }

  return code;
}
