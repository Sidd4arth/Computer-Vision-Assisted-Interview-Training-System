// Question generator using Ollama (with fallback to curated questions)
// In production: connects to local Ollama instance for AI-generated questions
// In this demo: generates structured questions based on company/role parameters

interface GeneratedQuestion {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  testCases: Array<{
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }>;
  starterCode: {
    python: string;
    cpp: string;
    java: string;
    javascript: string;
  };
}

// Curated question pools by difficulty - these simulate what Ollama would generate
const questionTemplates: GeneratedQuestion[] = [
  {
    title: "Two Sum",
    difficulty: "Easy",
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
      },
    ],
    testCases: [
      { input: "[2,7,11,15]\n9", expected_output: "[0,1]", is_hidden: false },
      { input: "[3,2,4]\n6", expected_output: "[1,2]", is_hidden: false },
      { input: "[3,3]\n6", expected_output: "[0,1]", is_hidden: true },
      {
        input: "[1,5,3,7,2]\n9",
        expected_output: "[1,3]",
        is_hidden: true,
      },
    ],
    starterCode: {
      python: "def two_sum(nums, target):\n    # Write your solution here\n    # Return a list of two indices\n    pass",
      cpp: '#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your solution here\n    return {};\n}',
      java: 'import java.util.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[0];\n    }\n}',
      javascript: "function twoSum(nums, target) {\n    // Write your solution here\n    return [];\n}",
    },
  },
  {
    title: "Valid Parentheses",
    difficulty: "Easy",
    description:
      "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    examples: [
      { input: 's = "()"', output: "true", explanation: "Single pair of matching parentheses." },
      { input: 's = "()[]{}"', output: "true", explanation: "All brackets match correctly." },
      { input: 's = "(]"', output: "false", explanation: "Mismatched bracket types." },
    ],
    testCases: [
      { input: "()", expected_output: "true", is_hidden: false },
      { input: "()[]{}", expected_output: "true", is_hidden: false },
      { input: "(]", expected_output: "false", is_hidden: false },
      { input: "([)]", expected_output: "false", is_hidden: true },
      { input: "{[]}", expected_output: "true", is_hidden: true },
    ],
    starterCode: {
      python: "def is_valid(s):\n    # Write your solution here\n    # Return True if valid, False otherwise\n    pass",
      cpp: '#include <string>\n#include <stack>\nusing namespace std;\n\nbool isValid(string s) {\n    // Write your solution here\n    return false;\n}',
      java: 'import java.util.*;\n\nclass Solution {\n    public boolean isValid(String s) {\n        // Write your solution here\n        return false;\n    }\n}',
      javascript: "function isValid(s) {\n    // Write your solution here\n    return false;\n}",
    },
  },
  {
    title: "Maximum Subarray",
    difficulty: "Medium",
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.",
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation:
          "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      { input: "nums = [1]", output: "1", explanation: "The single element is the maximum subarray." },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
        explanation: "The entire array has the largest sum 23.",
      },
    ],
    testCases: [
      {
        input: "[-2,1,-3,4,-1,2,1,-5,4]",
        expected_output: "6",
        is_hidden: false,
      },
      { input: "[1]", expected_output: "1", is_hidden: false },
      { input: "[5,4,-1,7,8]", expected_output: "23", is_hidden: false },
      { input: "[-1]", expected_output: "-1", is_hidden: true },
      { input: "[-2,-1]", expected_output: "-1", is_hidden: true },
    ],
    starterCode: {
      python: "def max_subarray(nums):\n    # Write your solution here\n    # Return the maximum subarray sum\n    pass",
      cpp: "#include <vector>\n#include <climits>\nusing namespace std;\n\nint maxSubArray(vector<int>& nums) {\n    // Write your solution here\n    return 0;\n}",
      java: "import java.util.*;\n\nclass Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}",
      javascript: "function maxSubArray(nums) {\n    // Write your solution here\n    return 0;\n}",
    },
  },
  {
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    description:
      "Given a string `s`, find the length of the longest substring without repeating characters.\n\nA substring is a contiguous sequence of characters within a string.",
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation:
          'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation:
          'The answer is "b", with the length of 1.',
      },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation:
          'The answer is "wke", with the length of 3.',
      },
    ],
    testCases: [
      { input: "abcabcbb", expected_output: "3", is_hidden: false },
      { input: "bbbbb", expected_output: "1", is_hidden: false },
      { input: "pwwkew", expected_output: "3", is_hidden: false },
      { input: "", expected_output: "0", is_hidden: true },
      { input: "dvdf", expected_output: "3", is_hidden: true },
    ],
    starterCode: {
      python: "def length_of_longest_substring(s):\n    # Write your solution here\n    pass",
      cpp: '#include <string>\n#include <unordered_set>\nusing namespace std;\n\nint lengthOfLongestSubstring(string s) {\n    // Write your solution here\n    return 0;\n}',
      java: 'import java.util.*;\n\nclass Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your solution here\n        return 0;\n    }\n}',
      javascript: "function lengthOfLongestSubstring(s) {\n    // Write your solution here\n    return 0;\n}",
    },
  },
  {
    title: "Merge Intervals",
    difficulty: "Medium",
    description:
      "Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation: "Since intervals [1,3] and [2,6] overlap, merge them into [1,6].",
      },
      {
        input: "intervals = [[1,4],[4,5]]",
        output: "[[1,5]]",
        explanation: "Intervals [1,4] and [4,5] are considered overlapping.",
      },
    ],
    testCases: [
      {
        input: "[[1,3],[2,6],[8,10],[15,18]]",
        expected_output: "[[1,6],[8,10],[15,18]]",
        is_hidden: false,
      },
      {
        input: "[[1,4],[4,5]]",
        expected_output: "[[1,5]]",
        is_hidden: false,
      },
      {
        input: "[[1,4],[0,4]]",
        expected_output: "[[0,4]]",
        is_hidden: true,
      },
      {
        input: "[[1,4],[2,3]]",
        expected_output: "[[1,4]]",
        is_hidden: true,
      },
    ],
    starterCode: {
      python: "def merge(intervals):\n    # Write your solution here\n    pass",
      cpp: "#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvector<vector<int>> merge(vector<vector<int>>& intervals) {\n    // Write your solution here\n    return {};\n}",
      java: "import java.util.*;\n\nclass Solution {\n    public int[][] merge(int[][] intervals) {\n        // Write your solution here\n        return new int[0][0];\n    }\n}",
      javascript: "function merge(intervals) {\n    // Write your solution here\n    return [];\n}",
    },
  },
  {
    title: "LRU Cache",
    difficulty: "Hard",
    description:
      'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` Initialize the LRU cache with positive size capacity.\n- `int get(int key)` Return the value of the key if the key exists, otherwise return -1.\n- `void put(int key, int value)` Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.',
    examples: [
      {
        input:
          '["LRUCache","put","put","get","put","get","put","get","get","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]',
        output: "[null,null,null,1,null,-1,null,-1,3,4]",
        explanation:
          "Operations on LRU Cache with capacity 2.",
      },
    ],
    testCases: [
      {
        input: "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4",
        expected_output: "1\n-1\n-1\n3\n4",
        is_hidden: false,
      },
      {
        input: "1\nput 2 1\nget 2",
        expected_output: "1",
        is_hidden: true,
      },
    ],
    starterCode: {
      python: "class LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n        # Write your solution here\n\n    def get(self, key):\n        return -1\n\n    def put(self, key, value):\n        pass",
      cpp: "#include <unordered_map>\n#include <list>\nusing namespace std;\n\nclass LRUCache {\npublic:\n    LRUCache(int capacity) {\n        // Write your solution here\n    }\n\n    int get(int key) {\n        return -1;\n    }\n\n    void put(int key, int value) {\n    }\n};",
      java: "import java.util.*;\n\nclass LRUCache {\n    public LRUCache(int capacity) {\n        // Write your solution here\n    }\n\n    public int get(int key) {\n        return -1;\n    }\n\n    public void put(int key, int value) {\n    }\n}",
      javascript: "class LRUCache {\n    constructor(capacity) {\n        this.capacity = capacity;\n        // Write your solution here\n    }\n\n    get(key) {\n        return -1;\n    }\n\n    put(key, value) {\n    }\n}",
    },
  },
];

export function generateQuestions(
  company: string,
  role: string,
  lpa: string,
  count: number
): GeneratedQuestion[] {
  // Determine difficulty mix based on LPA
  const lpaNum = parseFloat(lpa) || 10;
  let difficulties: Array<"Easy" | "Medium" | "Hard">;

  if (lpaNum < 10) {
    difficulties = ["Easy", "Easy", "Medium", "Medium", "Easy"];
  } else if (lpaNum < 25) {
    difficulties = ["Easy", "Medium", "Medium", "Medium", "Hard"];
  } else {
    difficulties = ["Medium", "Medium", "Hard", "Hard", "Medium"];
  }

  // Shuffle and pick questions
  const shuffled = [...questionTemplates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // Customize titles based on company
  return selected.map((q, i) => ({
    ...q,
    difficulty: difficulties[i] || "Medium",
    description: `[${company} - ${role}]\n\n${q.description}`,
  }));
}
