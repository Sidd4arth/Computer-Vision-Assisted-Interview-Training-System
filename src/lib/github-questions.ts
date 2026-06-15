// Fetch coding questions from GitHub repo
// https://github.com/liquidslr/interview-company-wise-problems

const REPO_BASE = "https://api.github.com/repos/liquidslr/interview-company-wise-problems/contents";
const RAW_BASE = "https://raw.githubusercontent.com/liquidslr/interview-company-wise-problems/main";

const SUPPORTED_QUESTIONS = new Set([
  "Two Sum",
  "Valid Parentheses",
  "Maximum Subarray",
  "Best Time to Buy and Sell Stock",
  "Squares of a Sorted Array",
  "Longest Substring Without Repeating Characters",
  "Merge Intervals",
  "LRU Cache"
]);

interface CSVQuestion {
  difficulty: string;
  title: string;
  frequency: number;
  acceptanceRate: number;
  link: string;
  topics: string;
}

interface GeneratedQuestion {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  testCases: Array<{ input: string; expected_output: string; is_hidden: boolean }>;
  starterCode: { python: string; cpp: string; java: string; javascript: string };
}

// Cache for company list to avoid repeated API calls
let companyListCache: string[] | null = null;
let companyCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get list of all company folders from the repo
 */
async function getCompanyList(): Promise<string[]> {
  // Return cached if fresh
  if (companyListCache && Date.now() - companyCacheTime < CACHE_TTL) {
    return companyListCache;
  }

  try {
    const res = await fetch(REPO_BASE, {
      headers: { "Accept": "application/vnd.github.v3+json" },
      next: { revalidate: 300 }, // Cache for 5 min
    });

    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const items = await res.json() as Array<{ name: string; type: string }>;
    const companies = items
      .filter((item) => item.type === "dir")
      .map((item) => item.name);

    companyListCache = companies;
    companyCacheTime = Date.now();
    return companies;
  } catch (error) {
    console.error("Failed to fetch company list:", error);
    return [];
  }
}

/**
 * Find matching company folder (case-insensitive, partial match)
 */
async function findMatchingCompany(searchTerm: string): Promise<string | null> {
  const companies = await getCompanyList();
  const search = searchTerm.toLowerCase().trim();

  // Exact match first
  const exact = companies.find((c) => c.toLowerCase() === search);
  if (exact) return exact;

  // Partial match (search term contained in company name)
  const partial = companies.find((c) => c.toLowerCase().includes(search));
  if (partial) return partial;

  // Reverse partial (company name contained in search term)
  const reversePartial = companies.find((c) => search.includes(c.toLowerCase()));
  if (reversePartial) return reversePartial;

  return null;
}

/**
 * Parse CSV content into question objects
 */
function parseCSV(csvContent: string): CSVQuestion[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const questions: CSVQuestion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle CSV with quoted fields containing commas
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        parts.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length >= 6) {
      questions.push({
        difficulty: parts[0].toUpperCase(),
        title: parts[1],
        frequency: parseFloat(parts[2]) || 0,
        acceptanceRate: parseFloat(parts[3]) || 0,
        link: parts[4],
        topics: parts[5].replace(/"/g, ""),
      });
    }
  }

  return questions;
}

/**
 * Fetch questions for a specific company
 */
async function fetchCompanyQuestions(companyFolder: string): Promise<CSVQuestion[]> {
  try {
    // Prioritize "1. Thirty Days.csv" (most recent/frequent questions)
    const csvFiles = [
      "1. Thirty Days.csv",
      "5. All.csv",
      "2. Three Months.csv",
    ];

    for (const file of csvFiles) {
      try {
        const url = `${RAW_BASE}/${encodeURIComponent(companyFolder)}/${encodeURIComponent(file)}`;
        const res = await fetch(url, { next: { revalidate: 600 } });
        
        if (res.ok) {
          const csv = await res.text();
          const questions = parseCSV(csv);
          if (questions.length > 0) return questions;
        }
      } catch {
        continue;
      }
    }

    return [];
  } catch (error) {
    console.error(`Failed to fetch questions for ${companyFolder}:`, error);
    return [];
  }
}

/**
 * Get random questions from random companies (fallback)
 */
async function getRandomQuestions(count: number): Promise<CSVQuestion[]> {
  const companies = await getCompanyList();
  if (companies.length === 0) return [];

  const allQuestions: CSVQuestion[] = [];
  const shuffledCompanies = [...companies].sort(() => Math.random() - 0.5);

  // Fetch from up to 5 random companies
  for (let i = 0; i < Math.min(5, shuffledCompanies.length); i++) {
    const questions = await fetchCompanyQuestions(shuffledCompanies[i]);
    allQuestions.push(...questions);
    if (allQuestions.length >= count * 3) break;
  }

  // Shuffle and return only supported questions
  const filtered = allQuestions.filter((q) => SUPPORTED_QUESTIONS.has(q.title));
  const pool = filtered.length > 0 ? filtered : allQuestions;
  return pool.sort(() => Math.random() - 0.5).slice(0, count * 2);
}

/**
 * Convert CSV question to our full question format with test cases and starter code
 */
function convertToFullQuestion(csvQ: CSVQuestion, company: string): GeneratedQuestion {
  const difficulty = csvQ.difficulty === "EASY" ? "Easy" 
    : csvQ.difficulty === "MEDIUM" ? "Medium" 
    : "Hard";

  // Generate description based on title and topics
  const description = generateDescription(csvQ.title, csvQ.topics, company);
  
  // Generate examples based on question type
  const examples = generateExamples(csvQ.title, csvQ.topics);
  
  // Generate test cases
  const testCases = generateTestCases(csvQ.title, csvQ.topics);
  
  // Generate starter code
  const starterCode = generateStarterCode(csvQ.title, csvQ.topics);

  return {
    title: csvQ.title,
    difficulty,
    description,
    examples,
    testCases,
    starterCode,
  };
}

function generateDescription(title: string, topics: string, company: string): string {
  const topicList = topics.split(",").map((t) => t.trim()).filter(Boolean);
  
  const descriptions: Record<string, string> = {
    "Two Sum": `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    
    "Squares of a Sorted Array": `Given an integer array nums sorted in non-decreasing order, return an array of the squares of each number sorted in non-decreasing order.`,
    
    "Valid Parentheses": `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,

    "Maximum Subarray": `Given an integer array nums, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.`,

    "Merge Intervals": `Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,

    "LRU Cache": `Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.

Implement the LRUCache class:
- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.
- int get(int key) Return the value of the key if exists, otherwise return -1.
- void put(int key, int value) Update the value if key exists. Otherwise, add the key-value pair. If the number of keys exceeds capacity, evict the least recently used key.`,

    "Number of Islands": `Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.`,

    "Longest Substring Without Repeating Characters": `Given a string s, find the length of the longest substring without repeating characters.

A substring is a contiguous sequence of characters within a string.`,

    "Best Time to Buy and Sell Stock": `You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.`,
  };

  const baseDesc = descriptions[title] || 
    `[${company} Interview Question]\n\nSolve the "${title}" problem.\n\nTopics: ${topicList.join(", ")}`;

  return `[${company} Interview Question]\n\n${baseDesc}`;
}

function generateExamples(title: string, topics: string): Array<{ input: string; output: string; explanation: string }> {
  const exampleSets: Record<string, Array<{ input: string; output: string; explanation: string }>> = {
    "Two Sum": [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9" },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]", explanation: "nums[1] + nums[2] == 6" },
    ],
    "Squares of a Sorted Array": [
      { input: "nums = [-4,-1,0,3,10]", output: "[0,1,9,16,100]", explanation: "After squaring, the array becomes [16,1,0,9,100]. After sorting, it becomes [0,1,9,16,100]." },
      { input: "nums = [-7,-3,2,3,11]", output: "[4,9,9,49,121]", explanation: "After squaring, the array becomes [49,9,4,9,121]. After sorting, it becomes [4,9,9,49,121]." },
    ],
    "Valid Parentheses": [
      { input: 's = "()"', output: "true", explanation: "Single pair of matching parentheses" },
      { input: 's = "()[]{}"', output: "true", explanation: "All brackets match" },
      { input: 's = "(]"', output: "false", explanation: "Mismatched brackets" },
    ],
    "Maximum Subarray": [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "Subarray [4,-1,2,1] has the largest sum = 6" },
      { input: "nums = [1]", output: "1", explanation: "Single element" },
    ],
    "Best Time to Buy and Sell Stock": [
      { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 (price=1), sell on day 5 (price=6)" },
      { input: "prices = [7,6,4,3,1]", output: "0", explanation: "No profit possible" },
    ],
    "Longest Substring Without Repeating Characters": [
      { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: "1", explanation: 'The answer is "b", with the length of 1.' },
    ],
    "Merge Intervals": [
      { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]", explanation: "Since intervals [1,3] and [2,6] overlap, merge them into [1,6]." },
    ],
    "LRU Cache": [
      { input: '["LRUCache","put","put","get","put","get","put","get","get","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]', output: "[null,null,null,1,null,-1,null,-1,3,4]", explanation: "Operations on LRU Cache with capacity 2." },
    ],
  };

  if (exampleSets[title]) return exampleSets[title];

  // Generic examples based on topics
  if (topics.includes("Array")) {
    return [
      { input: "nums = [1,2,3,4,5]", output: "Depends on problem", explanation: "Process the array according to requirements" },
      { input: "nums = [5,4,3,2,1]", output: "Depends on problem", explanation: "Edge case with descending order" },
    ];
  }
  if (topics.includes("String")) {
    return [
      { input: 's = "hello"', output: "Depends on problem", explanation: "Process the string" },
      { input: 's = "a"', output: "Depends on problem", explanation: "Single character edge case" },
    ];
  }

  return [
    { input: "See problem description", output: "Expected output", explanation: "Follow the problem requirements" },
  ];
}

function generateTestCases(title: string, topics: string): Array<{ input: string; expected_output: string; is_hidden: boolean }> {
  const testSets: Record<string, Array<{ input: string; expected_output: string; is_hidden: boolean }>> = {
    "Two Sum": [
      { input: "[2,7,11,15]\n9", expected_output: "[0,1]", is_hidden: false },
      { input: "[3,2,4]\n6", expected_output: "[1,2]", is_hidden: false },
      { input: "[3,3]\n6", expected_output: "[0,1]", is_hidden: true },
      { input: "[1,5,3,7,2]\n9", expected_output: "[1,3]", is_hidden: true },
    ],
    "Squares of a Sorted Array": [
      { input: "[-4,-1,0,3,10]", expected_output: "[0,1,9,16,100]", is_hidden: false },
      { input: "[-7,-3,2,3,11]", expected_output: "[4,9,9,49,121]", is_hidden: false },
      { input: "[-1,0,1]", expected_output: "[0,1,1]", is_hidden: true },
      { input: "[-5,-4,-3,-2,-1]", expected_output: "[1,4,9,16,25]", is_hidden: true },
    ],
    "Valid Parentheses": [
      { input: "()", expected_output: "true", is_hidden: false },
      { input: "()[]{}", expected_output: "true", is_hidden: false },
      { input: "(]", expected_output: "false", is_hidden: false },
      { input: "([)]", expected_output: "false", is_hidden: true },
      { input: "{[]}", expected_output: "true", is_hidden: true },
    ],
    "Maximum Subarray": [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected_output: "6", is_hidden: false },
      { input: "[1]", expected_output: "1", is_hidden: false },
      { input: "[5,4,-1,7,8]", expected_output: "23", is_hidden: false },
      { input: "[-1]", expected_output: "-1", is_hidden: true },
      { input: "[-2,-1]", expected_output: "-1", is_hidden: true },
    ],
    "Best Time to Buy and Sell Stock": [
      { input: "[7,1,5,3,6,4]", expected_output: "5", is_hidden: false },
      { input: "[7,6,4,3,1]", expected_output: "0", is_hidden: false },
      { input: "[1,2]", expected_output: "1", is_hidden: true },
      { input: "[2,4,1]", expected_output: "2", is_hidden: true },
    ],
    "Longest Substring Without Repeating Characters": [
      { input: "abcabcbb", expected_output: "3", is_hidden: false },
      { input: "bbbbb", expected_output: "1", is_hidden: false },
      { input: "pwwkew", expected_output: "3", is_hidden: false },
      { input: "", expected_output: "0", is_hidden: true },
    ],
    "Merge Intervals": [
      { input: "[[1,3],[2,6],[8,10],[15,18]]", expected_output: "[[1,6],[8,10],[15,18]]", is_hidden: false },
      { input: "[[1,4],[4,5]]", expected_output: "[[1,5]]", is_hidden: false },
      { input: "[[1,4],[2,3]]", expected_output: "[[1,4]]", is_hidden: true },
    ],
    "LRU Cache": [
      { input: "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4", expected_output: "1\n-1\n-1\n3\n4", is_hidden: false },
      { input: "1\nput 2 1\nget 2", expected_output: "1", is_hidden: true },
    ],
  };

  if (testSets[title]) return testSets[title];

  // Generate generic test cases
  return [
    { input: "test_input_1", expected_output: "expected_1", is_hidden: false },
    { input: "test_input_2", expected_output: "expected_2", is_hidden: false },
    { input: "hidden_test_1", expected_output: "hidden_expected_1", is_hidden: true },
    { input: "hidden_test_2", expected_output: "hidden_expected_2", is_hidden: true },
  ];
}

function generateStarterCode(title: string, topics: string): { python: string; cpp: string; java: string; javascript: string } {
  const codeTemplates: Record<string, { python: string; cpp: string; java: string; javascript: string }> = {
    "Two Sum": {
      python: `def two_sum(nums, target):
    # Write your solution here
    # Return a list of two indices
    pass`,
      cpp: `#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Write your solution here
    return {};
}`,
      java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[0];
    }
}`,
      javascript: `function twoSum(nums, target) {
    // Write your solution here
    return [];
}`,
    },
    "Squares of a Sorted Array": {
      python: `class Solution:
    def sortedSquares(self, nums: list[int]) -> list[int]:
        # Write your solution here
        pass`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<int> sortedSquares(vector<int>& nums) {
        // Write your solution here
        return {};
    }
};`,
      java: `import java.util.*;

class Solution {
    public int[] sortedSquares(int[] nums) {
        // Write your solution here
        return new int[0];
    }
}`,
      javascript: `class Solution {
    /**
     * @param {number[]} nums
     * @return {number[]}
     */
    sortedSquares(nums) {
        // Write your solution here
        return [];
    }
}`,
    },
    "Valid Parentheses": {
      python: `def is_valid(s):
    # Write your solution here
    # Return True if valid, False otherwise
    pass`,
      cpp: `#include <string>
#include <stack>
using namespace std;

bool isValid(string s) {
    // Write your solution here
    return false;
}`,
      java: `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        return false;
    }
}`,
      javascript: `function isValid(s) {
    // Write your solution here
    return false;
}`,
    },
    "Maximum Subarray": {
      python: `def max_subarray(nums):
    # Write your solution here
    # Return the maximum subarray sum
    pass`,
      cpp: `#include <vector>
#include <climits>
using namespace std;

int maxSubArray(vector<int>& nums) {
    // Write your solution here
    return 0;
}`,
      java: `import java.util.*;

class Solution {
    public int maxSubArray(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
      javascript: `function maxSubArray(nums) {
    // Write your solution here
    return 0;
}`,
    },
    "Best Time to Buy and Sell Stock": {
      python: `class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        # Write your solution here
        pass`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // Write your solution here
        return 0;
    }
};`,
      java: `import java.util.*;

class Solution {
    public int maxProfit(int[] prices) {
        // Write your solution here
        return 0;
    }
}`,
      javascript: `class Solution {
    /**
     * @param {number[]} prices
     * @return {number}
     */
    maxProfit(prices) {
        // Write your solution here
        return 0;
    }
}`,
    },
    "Longest Substring Without Repeating Characters": {
      python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Write your solution here
        pass`,
      cpp: `#include <string>
#include <unordered_set>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Write your solution here
        return 0;
    }
};`,
      java: `import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your solution here
        return 0;
    }
}`,
      javascript: `class Solution {
    /**
     * @param {string} s
     * @return {number}
     */
    lengthOfLongestSubstring(s) {
        // Write your solution here
        return 0;
    }
}`,
    },
    "Merge Intervals": {
      python: `class Solution:
    def merge(self, intervals: list[list[int]]) -> list[list[int]]:
        # Write your solution here
        pass`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        // Write your solution here
        return {};
    }
};`,
      java: `import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        // Write your solution here
        return new int[0][0];
    }
}`,
      javascript: `class Solution {
    /**
     * @param {number[][]} intervals
     * @return {number[][]}
     */
    merge(intervals) {
        // Write your solution here
        return [];
    }
}`,
    },
    "LRU Cache": {
      python: `class LRUCache:
    def __init__(self, capacity: int):
        # Write your solution here
        pass

    def get(self, key: int) -> int:
        return -1

    def put(self, key: int, value: int) -> None:
        pass`,
      cpp: `#include <unordered_map>
#include <list>
using namespace std;

class LRUCache {
public:
    LRUCache(int capacity) {
        // Write your solution here
    }
    
    int get(int key) {
        return -1;
    }
    
    void put(int key, int value) {
    }
};`,
      java: `import java.util.*;

class LRUCache {
    public LRUCache(int capacity) {
        // Write your solution here
    }
    
    public int get(int key) {
        return -1;
    }
    
    public void put(int key, int value) {
    }
}`,
      javascript: `class LRUCache {
    /**
     * @param {number} capacity
     */
    constructor(capacity) {
        this.capacity = capacity;
        // Write your solution here
    }

    /** 
     * @param {number} key
     * @return {number}
     */
    get(key) {
        return -1;
    }

    /** 
     * @param {number} key 
     * @param {number} value
     * @return {void}
     */
    put(key, value) {
    }
}`,
    },
  };

  if (codeTemplates[title]) return codeTemplates[title];

  // Generic templates based on topics
  return {
    python: `def solve(input_data):
    # Solve: ${title}
    # Topics: ${topics}
    pass`,
    cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

string solve(string input) {
    // Write your solution here
    return "";
}`,
    java: `import java.util.*;

class Solution {
    public String solve(String input) {
        // Write your solution here
        return "";
    }
}`,
    javascript: `function solve(input) {
    // Write your solution here
    return "";
}`,
  };
}

/**
 * Main function: Generate questions for a session
 */
export async function generateQuestionsFromGitHub(
  company: string,
  role: string,
  lpa: string,
  count: number
): Promise<GeneratedQuestion[]> {
  try {
    console.log(`Generating ${count} questions for ${company} - ${role}`);

    // Try to find matching company folder
    const matchedCompany = await findMatchingCompany(company);
    
    let csvQuestions: CSVQuestion[];
    let source: string;

    if (matchedCompany) {
      console.log(`Found matching company: ${matchedCompany}`);
      csvQuestions = await fetchCompanyQuestions(matchedCompany);
      source = matchedCompany;
    } else {
      console.log(`No match for "${company}", using random questions`);
      csvQuestions = await getRandomQuestions(count);
      source = company;
    }

    // Filter company-specific questions to keep only our supported ones
    const filteredCsvQuestions = csvQuestions.filter((q) => SUPPORTED_QUESTIONS.has(q.title));
    if (filteredCsvQuestions.length === 0) {
      console.log("No supported questions found from GitHub CSV, using fallback");
      return getFallbackQuestions(company, role, count);
    }

    // Sort by frequency (higher = more common in interviews)
    filteredCsvQuestions.sort((a, b) => b.frequency - a.frequency);

    // Balanced difficulty mix for interview practice
    const targetDifficulties: string[] = ["EASY", "MEDIUM", "MEDIUM", "HARD", "MEDIUM"];

    // Select diverse questions
    const selected: CSVQuestion[] = [];
    const usedTitles = new Set<string>();

    for (const targetDiff of targetDifficulties) {
      if (selected.length >= count) break;

      const candidates = filteredCsvQuestions.filter(
        (q) => q.difficulty === targetDiff && !usedTitles.has(q.title)
      );

      if (candidates.length > 0) {
        // Pick random from top candidates
        const topCandidates = candidates.slice(0, Math.min(10, candidates.length));
        const pick = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        selected.push(pick);
        usedTitles.add(pick.title);
      }
    }

    // Fill remaining with any difficulty from supported ones
    while (selected.length < count) {
      const remaining = filteredCsvQuestions.filter((q) => !usedTitles.has(q.title));
      if (remaining.length === 0) break;
      const pick = remaining[Math.floor(Math.random() * Math.min(20, remaining.length))];
      selected.push(pick);
      usedTitles.add(pick.title);
    }

    // Convert to full question format
    return selected.map((q) => convertToFullQuestion(q, source));
  } catch (error) {
    console.error("Error generating questions from GitHub:", error);
    return getFallbackQuestions(company, role, count);
  }
}

/**
 * Fallback questions if GitHub fetch fails
 */
function getFallbackQuestions(company: string, role: string, count: number): GeneratedQuestion[] {
  const fallback: GeneratedQuestion[] = [
    {
      title: "Squares of a Sorted Array",
      difficulty: "Easy",
      description: `[${company} - ${role}]\n\nGiven an integer array nums sorted in non-decreasing order, return an array of the squares of each number sorted in non-decreasing order.`,
      examples: [
        { input: "nums = [-4,-1,0,3,10]", output: "[0,1,9,16,100]", explanation: "After squaring, the array becomes [16,1,0,9,100]. After sorting, it becomes [0,1,9,16,100]." },
        { input: "nums = [-7,-3,2,3,11]", output: "[4,9,9,49,121]", explanation: "After squaring, the array becomes [49,9,4,9,121]. After sorting, it becomes [4,9,9,49,121]." },
      ],
      testCases: [
        { input: "[-4,-1,0,3,10]", expected_output: "[0,1,9,16,100]", is_hidden: false },
        { input: "[-7,-3,2,3,11]", expected_output: "[4,9,9,49,121]", is_hidden: false },
        { input: "[-1,0,1]", expected_output: "[0,1,1]", is_hidden: true },
        { input: "[-5,-4,-3,-2,-1]", expected_output: "[1,4,9,16,25]", is_hidden: true },
      ],
      starterCode: {
        python: `class Solution:\n    def sortedSquares(self, nums: list[int]) -> list[int]:\n        # Write your solution here\n        return sorted([x*x for x in nums])`,
        cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> sortedSquares(vector<int>& nums) {\n        // Write your solution here\n        vector<int> res;\n        for (int x : nums) res.push_back(x * x);\n        sort(res.begin(), res.end());\n        return res;\n    }\n};\n`,
        java: `import java.util.*;\n\nclass Solution {\n    public int[] sortedSquares(int[] nums) {\n        // Write your solution here\n        int[] res = new int[nums.length];\n        for (int i = 0; i < nums.length; i++) {\n            res[i] = nums[i] * nums[i];\n        }\n        Arrays.sort(res);\n        return res;\n    }\n}\n`,
        javascript: `class Solution {\n    /**\n     * @param {number[]} nums\n     * @return {number[]}\n     */\n    sortedSquares(nums) {\n        // Write your solution here\n        return nums.map(x => x * x).sort((a, b) => a - b);\n    }\n}\n`,
      },
    },
    {
      title: "Two Sum",
      difficulty: "Easy",
      description: `[${company} - ${role}]\n\nGiven an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.`,
      examples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9" },
      ],
      testCases: [
        { input: "[2,7,11,15]\n9", expected_output: "[0,1]", is_hidden: false },
        { input: "[3,2,4]\n6", expected_output: "[1,2]", is_hidden: false },
        { input: "[3,3]\n6", expected_output: "[0,1]", is_hidden: true },
      ],
      starterCode: {
        python: "def two_sum(nums, target):\n    pass\n\nnums = eval(input())\ntarget = int(input())\nprint(two_sum(nums, target))",
        cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    return {};\n}\n\nint main() { return 0; }",
        java: "import java.util.*;\n\npublic class Main {\n    public static int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n    public static void main(String[] args) {}\n}",
        javascript: "function twoSum(nums, target) {\n    return [];\n}\nconst nums = JSON.parse(readline());\nconst target = parseInt(readline());\nconsole.log(JSON.stringify(twoSum(nums, target)));",
      },
    },
    {
      title: "Valid Parentheses",
      difficulty: "Easy",
      description: `[${company} - ${role}]\n\nGiven a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.`,
      examples: [
        { input: 's = "()"', output: "true", explanation: "Valid single pair" },
        { input: 's = "(]"', output: "false", explanation: "Mismatched" },
      ],
      testCases: [
        { input: "()", expected_output: "true", is_hidden: false },
        { input: "(]", expected_output: "false", is_hidden: false },
        { input: "{[]}", expected_output: "true", is_hidden: true },
      ],
      starterCode: {
        python: "def is_valid(s):\n    pass\n\ns = input()\nprint(str(is_valid(s)).lower())",
        cpp: "#include <iostream>\n#include <stack>\nusing namespace std;\n\nbool isValid(string s) {\n    return false;\n}\n\nint main() {\n    string s; cin >> s;\n    cout << (isValid(s) ? \"true\" : \"false\");\n    return 0;\n}",
        java: "import java.util.*;\n\npublic class Main {\n    public static boolean isValid(String s) { return false; }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.println(isValid(sc.next()));\n    }\n}",
        javascript: "function isValid(s) {\n    return false;\n}\nconst s = readline();\nconsole.log(isValid(s));",
      },
    },
    {
      title: "Maximum Subarray",
      difficulty: "Medium",
      description: `[${company} - ${role}]\n\nGiven an integer array nums, find the subarray with the largest sum, and return its sum.`,
      examples: [
        { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "Subarray [4,-1,2,1] has sum 6" },
      ],
      testCases: [
        { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected_output: "6", is_hidden: false },
        { input: "[1]", expected_output: "1", is_hidden: false },
        { input: "[-1]", expected_output: "-1", is_hidden: true },
      ],
      starterCode: {
        python: "def max_subarray(nums):\n    pass\n\nnums = eval(input())\nprint(max_subarray(nums))",
        cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint maxSubArray(vector<int>& nums) {\n    return 0;\n}\n\nint main() { return 0; }",
        java: "import java.util.*;\n\npublic class Main {\n    public static int maxSubArray(int[] nums) { return 0; }\n    public static void main(String[] args) {}\n}",
        javascript: "function maxSubArray(nums) {\n    return 0;\n}\nconst nums = JSON.parse(readline());\nconsole.log(maxSubArray(nums));",
      },
    },
    {
      title: "Merge Intervals",
      difficulty: "Medium",
      description: `[${company} - ${role}]\n\nGiven an array of intervals, merge all overlapping intervals.`,
      examples: [
        { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]", explanation: "[1,3] and [2,6] overlap" },
      ],
      testCases: [
        { input: "[[1,3],[2,6],[8,10],[15,18]]", expected_output: "[[1,6],[8,10],[15,18]]", is_hidden: false },
        { input: "[[1,4],[4,5]]", expected_output: "[[1,5]]", is_hidden: false },
        { input: "[[1,4],[2,3]]", expected_output: "[[1,4]]", is_hidden: true },
      ],
      starterCode: {
        python: "def merge(intervals):\n    pass\n\nintervals = eval(input())\nprint(merge(intervals))",
        cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<vector<int>> merge(vector<vector<int>>& intervals) {\n    return {};\n}\n\nint main() { return 0; }",
        java: "import java.util.*;\n\npublic class Main {\n    public static int[][] merge(int[][] intervals) { return new int[][]{}; }\n    public static void main(String[] args) {}\n}",
        javascript: "function merge(intervals) {\n    return [];\n}\nconst intervals = JSON.parse(readline());\nconsole.log(JSON.stringify(merge(intervals)));",
      },
    },
    {
      title: "LRU Cache",
      difficulty: "Hard",
      description: `[${company} - ${role}]\n\nDesign a Least Recently Used (LRU) cache with get and put operations.`,
      examples: [
        { input: "capacity=2, operations: put(1,1), put(2,2), get(1), put(3,3), get(2)", output: "1, -1", explanation: "Key 2 was evicted" },
      ],
      testCases: [
        { input: "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2", expected_output: "1\n-1", is_hidden: false },
        { input: "1\nput 2 1\nget 2", expected_output: "1", is_hidden: true },
      ],
      starterCode: {
        python: "class LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n    def get(self, key):\n        return -1\n    def put(self, key, value):\n        pass\n\ncapacity = int(input())\ncache = LRUCache(capacity)\nimport sys\nfor line in sys.stdin:\n    parts = line.strip().split()\n    if parts[0] == 'get':\n        print(cache.get(int(parts[1])))\n    elif parts[0] == 'put':\n        cache.put(int(parts[1]), int(parts[2]))",
        cpp: "#include <iostream>\n#include <unordered_map>\n#include <list>\nusing namespace std;\n\nclass LRUCache {\npublic:\n    LRUCache(int capacity) {}\n    int get(int key) { return -1; }\n    void put(int key, int value) {}\n};\n\nint main() { return 0; }",
        java: "import java.util.*;\n\npublic class Main {\n    // Implement LRUCache\n    public static void main(String[] args) {}\n}",
        javascript: "class LRUCache {\n    constructor(capacity) {\n        this.capacity = capacity;\n    }\n    get(key) { return -1; }\n    put(key, value) {}\n}",
      },
    },
  ];

  return fallback.slice(0, count);
}

/**
 * Get list of available companies (for autocomplete)
 */
export async function getAvailableCompanies(): Promise<string[]> {
  return getCompanyList();
}
