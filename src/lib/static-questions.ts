/**
 * Static question bank — 10 hardcoded problems with known correct solutions.
 * Solutions are embedded here only for server-side test evaluation.
 * Nothing in this file is ever sent to the client.
 */

export interface StaticQuestion {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  testCases: Array<{ input: string; expected_output: string; is_hidden: boolean }>;
  starterCode: { python: string; cpp: string; java: string; javascript: string };
  /** The canonical JS solution used for test-case evaluation on the server */
  _solution: (input: string) => string;
  /**
   * Canonical reference implementations per language.
   * For Python / C++ / Java, user code is normalised and compared against these.
   * Only an exact normalised match will receive a PASS.
   */
  _canonicalCode: { python: string; cpp: string; java: string };
}

// ---------------------------------------------------------------------------
// Q1 – Two Sum (Easy)
// ---------------------------------------------------------------------------
const twoSum: StaticQuestion = {
  title: "Two Sum",
  difficulty: "Easy",
  description:
    "Given an array of integers `nums` and an integer `target`, return **indices** of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nReturn the answer in any order.",
  examples: [
    { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9, so we return [0, 1]." },
    { input: "nums = [3,2,4], target = 6", output: "[1,2]", explanation: "nums[1] + nums[2] == 6." },
  ],
  testCases: [
    { input: "[2,7,11,15]\n9", expected_output: "[0,1]", is_hidden: false },
    { input: "[3,2,4]\n6",     expected_output: "[1,2]", is_hidden: false },
    { input: "[3,3]\n6",       expected_output: "[0,1]", is_hidden: true },
    { input: "[1,5,3,7,2]\n9", expected_output: "[1,3]", is_hidden: true },
  ],
  starterCode: {
    python:     "def twoSum(nums, target):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};",
    java:       "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[0];\n    }\n}",
    javascript: "function twoSum(nums, target) {\n    // Write your solution here\n    return [];\n}",
  },
  _solution: (input) => {
    const lines = input.trim().split("\n");
    const nums: number[] = JSON.parse(lines[0]);
    const target = parseInt(lines[1], 10);
    const map = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
      const comp = target - nums[i];
      if (map.has(comp)) return JSON.stringify([map.get(comp), i]);
      map.set(nums[i], i);
    }
    return "[]";
  },
  _canonicalCode: {
    python: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
    cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.count(complement)) return {seen[complement], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) return new int[]{map.get(complement), i};
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q2 – Valid Parentheses (Easy)
// ---------------------------------------------------------------------------
const validParentheses: StaticQuestion = {
  title: "Valid Parentheses",
  difficulty: "Easy",
  description:
    "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
  examples: [
    { input: 's = "()"',      output: "true",  explanation: "Single matching pair." },
    { input: 's = "()[]{}"', output: "true",  explanation: "All match in order." },
    { input: 's = "(]"',     output: "false", explanation: "Mismatched types." },
  ],
  testCases: [
    { input: "()",      expected_output: "true",  is_hidden: false },
    { input: "()[]{}",  expected_output: "true",  is_hidden: false },
    { input: "(]",      expected_output: "false", is_hidden: false },
    { input: "([)]",    expected_output: "false", is_hidden: true },
    { input: "{[]}",    expected_output: "true",  is_hidden: true },
  ],
  starterCode: {
    python:     "def isValid(s):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    bool isValid(string s) {\n        // Write your solution here\n        return false;\n    }\n};",
    java:       "class Solution {\n    public boolean isValid(String s) {\n        // Write your solution here\n        return false;\n    }\n}",
    javascript: "function isValid(s) {\n    // Write your solution here\n    return false;\n}",
  },
  _solution: (input) => {
    const s = input.trim().replace(/^["']|["']$/g, "");
    const stack: string[] = [];
    const map: Record<string, string> = { ")": "(", "}": "{", "]": "[" };
    for (const c of s) {
      if ("({[".includes(c)) { stack.push(c); }
      else if (stack.pop() !== map[c]) return "false";
    }
    return stack.length === 0 ? "true" : "false";
  },
  _canonicalCode: {
    python: `def isValid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack`,
    cpp: `class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '{' || c == '[') {
                st.push(c);
            } else {
                if (st.empty()) return false;
                if (c == ')' && st.top() != '(') return false;
                if (c == '}' && st.top() != '{') return false;
                if (c == ']' && st.top() != '[') return false;
                st.pop();
            }
        }
        return st.empty();
    }
};`,
    java: `class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else {
                if (stack.isEmpty()) return false;
                if (c == ')' && stack.peek() != '(') return false;
                if (c == '}' && stack.peek() != '{') return false;
                if (c == ']' && stack.peek() != '[') return false;
                stack.pop();
            }
        }
        return stack.isEmpty();
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q3 – Maximum Subarray (Medium)
// ---------------------------------------------------------------------------
const maximumSubarray: StaticQuestion = {
  title: "Maximum Subarray",
  difficulty: "Medium",
  description:
    "Given an integer array `nums`, find the **subarray** with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.",
  examples: [
    { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6",  explanation: "[4,-1,2,1] has the largest sum 6." },
    { input: "nums = [1]",                       output: "1",  explanation: "Single element." },
    { input: "nums = [5,4,-1,7,8]",              output: "23", explanation: "Entire array sums to 23." },
  ],
  testCases: [
    { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected_output: "6",  is_hidden: false },
    { input: "[1]",                      expected_output: "1",  is_hidden: false },
    { input: "[5,4,-1,7,8]",             expected_output: "23", is_hidden: false },
    { input: "[-1]",                     expected_output: "-1", is_hidden: true },
    { input: "[-2,-1]",                  expected_output: "-1", is_hidden: true },
  ],
  starterCode: {
    python:     "def maxSubArray(nums):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};",
    java:       "class Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}",
    javascript: "function maxSubArray(nums) {\n    // Write your solution here\n    return 0;\n}",
  },
  _solution: (input) => {
    const nums: number[] = JSON.parse(input.trim());
    let max = nums[0], cur = nums[0];
    for (let i = 1; i < nums.length; i++) {
      cur = Math.max(nums[i], cur + nums[i]);
      max = Math.max(max, cur);
    }
    return String(max);
  },
  _canonicalCode: {
    python: `def maxSubArray(nums):
    max_sum = nums[0]
    current_sum = nums[0]
    for num in nums[1:]:
        current_sum = max(num, current_sum + num)
        max_sum = max(max_sum, current_sum)
    return max_sum`,
    cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int maxSum = nums[0];
        int currentSum = nums[0];
        for (int i = 1; i < (int)nums.size(); i++) {
            currentSum = max(nums[i], currentSum + nums[i]);
            maxSum = max(maxSum, currentSum);
        }
        return maxSum;
    }
};`,
    java: `class Solution {
    public int maxSubArray(int[] nums) {
        int maxSum = nums[0];
        int cur = nums[0];
        for (int i = 1; i < nums.length; i++) {
            cur = Math.max(nums[i], cur + nums[i]);
            maxSum = Math.max(maxSum, cur);
        }
        return maxSum;
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q4 – Longest Substring Without Repeating Characters (Medium)
// ---------------------------------------------------------------------------
const longestSubstring: StaticQuestion = {
  title: "Longest Substring Without Repeating Characters",
  difficulty: "Medium",
  description:
    "Given a string `s`, find the **length** of the longest substring without repeating characters.",
  examples: [
    { input: 's = "abcabcbb"', output: "3", explanation: '"abc" has length 3.' },
    { input: 's = "bbbbb"',    output: "1", explanation: '"b" has length 1.' },
    { input: 's = "pwwkew"',   output: "3", explanation: '"wke" has length 3.' },
  ],
  testCases: [
    { input: "abcabcbb", expected_output: "3", is_hidden: false },
    { input: "bbbbb",    expected_output: "1", is_hidden: false },
    { input: "pwwkew",   expected_output: "3", is_hidden: false },
    { input: "",         expected_output: "0", is_hidden: true },
    { input: "dvdf",     expected_output: "3", is_hidden: true },
  ],
  starterCode: {
    python:     "def lengthOfLongestSubstring(s):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Write your solution here\n        return 0;\n    }\n};",
    java:       "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your solution here\n        return 0;\n    }\n}",
    javascript: "function lengthOfLongestSubstring(s) {\n    // Write your solution here\n    return 0;\n}",
  },
  _solution: (input) => {
    const s = input.trim().replace(/^["']|["']$/g, "");
    let max = 0, left = 0;
    const seen = new Map<string, number>();
    for (let right = 0; right < s.length; right++) {
      if (seen.has(s[right]) && seen.get(s[right])! >= left) left = seen.get(s[right])! + 1;
      seen.set(s[right], right);
      max = Math.max(max, right - left + 1);
    }
    return String(max);
  },
  _canonicalCode: {
    python: `def lengthOfLongestSubstring(s):
    char_map = {}
    max_len = 0
    start = 0
    for i, char in enumerate(s):
        if char in char_map and char_map[char] >= start:
            start = char_map[char] + 1
        char_map[char] = i
        max_len = max(max_len, i - start + 1)
    return max_len`,
    cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_map<char, int> charMap;
        int maxLen = 0;
        int start = 0;
        for (int i = 0; i < (int)s.size(); i++) {
            if (charMap.count(s[i]) && charMap[s[i]] >= start) {
                start = charMap[s[i]] + 1;
            }
            charMap[s[i]] = i;
            maxLen = max(maxLen, i - start + 1);
        }
        return maxLen;
    }
};`,
    java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        HashMap<Character, Integer> map = new HashMap<>();
        int maxLen = 0;
        int start = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (map.containsKey(c) && map.get(c) >= start) {
                start = map.get(c) + 1;
            }
            map.put(c, i);
            maxLen = Math.max(maxLen, i - start + 1);
        }
        return maxLen;
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q5 – Merge Intervals (Medium)
// ---------------------------------------------------------------------------
const mergeIntervals: StaticQuestion = {
  title: "Merge Intervals",
  difficulty: "Medium",
  description:
    "Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.",
  examples: [
    { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]", explanation: "[1,3] and [2,6] overlap, merged to [1,6]." },
    { input: "intervals = [[1,4],[4,5]]",                output: "[[1,5]]",                explanation: "[1,4] and [4,5] are considered overlapping." },
  ],
  testCases: [
    { input: "[[1,3],[2,6],[8,10],[15,18]]", expected_output: "[[1,6],[8,10],[15,18]]", is_hidden: false },
    { input: "[[1,4],[4,5]]",                expected_output: "[[1,5]]",                is_hidden: false },
    { input: "[[1,4],[0,4]]",                expected_output: "[[0,4]]",                is_hidden: true },
    { input: "[[1,4],[2,3]]",                expected_output: "[[1,4]]",                is_hidden: true },
  ],
  starterCode: {
    python:     "def merge(intervals):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        // Write your solution here\n        return {};\n    }\n};",
    java:       "class Solution {\n    public int[][] merge(int[][] intervals) {\n        // Write your solution here\n        return new int[0][0];\n    }\n}",
    javascript: "function merge(intervals) {\n    // Write your solution here\n    return [];\n}",
  },
  _solution: (input) => {
    const intervals: number[][] = JSON.parse(input.trim());
    intervals.sort((a, b) => a[0] - b[0]);
    const res: number[][] = [];
    for (const iv of intervals) {
      if (res.length && iv[0] <= res[res.length - 1][1]) {
        res[res.length - 1][1] = Math.max(res[res.length - 1][1], iv[1]);
      } else {
        res.push([...iv]);
      }
    }
    return JSON.stringify(res);
  },
  _canonicalCode: {
    python: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for interval in intervals[1:]:
        if interval[0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], interval[1])
        else:
            merged.append(interval)
    return merged`,
    cpp: `class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        vector<vector<int>> merged;
        merged.push_back(intervals[0]);
        for (int i = 1; i < (int)intervals.size(); i++) {
            if (intervals[i][0] <= merged.back()[1]) {
                merged.back()[1] = max(merged.back()[1], intervals[i][1]);
            } else {
                merged.push_back(intervals[i]);
            }
        }
        return merged;
    }
};`,
    java: `class Solution {
    public int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
        List<int[]> merged = new ArrayList<>();
        merged.add(intervals[0]);
        for (int i = 1; i < intervals.length; i++) {
            int[] last = merged.get(merged.size() - 1);
            if (intervals[i][0] <= last[1]) {
                last[1] = Math.max(last[1], intervals[i][1]);
            } else {
                merged.add(intervals[i]);
            }
        }
        return merged.toArray(new int[0][]);
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q6 – Best Time to Buy and Sell Stock (Easy)
// ---------------------------------------------------------------------------
const bestTimeToBuyAndSellStock: StaticQuestion = {
  title: "Best Time to Buy and Sell Stock",
  difficulty: "Easy",
  description:
    "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
  examples: [
    { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 (price=1), sell on day 5 (price=6), profit = 5." },
    { input: "prices = [7,6,4,3,1]",   output: "0", explanation: "Prices only decrease; no profit possible." },
  ],
  testCases: [
    { input: "[7,1,5,3,6,4]", expected_output: "5", is_hidden: false },
    { input: "[7,6,4,3,1]",   expected_output: "0", is_hidden: false },
    { input: "[1,2]",         expected_output: "1", is_hidden: true },
    { input: "[2,4,1]",       expected_output: "2", is_hidden: true },
  ],
  starterCode: {
    python:     "def maxProfit(prices):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        // Write your solution here\n        return 0;\n    }\n};",
    java:       "class Solution {\n    public int maxProfit(int[] prices) {\n        // Write your solution here\n        return 0;\n    }\n}",
    javascript: "function maxProfit(prices) {\n    // Write your solution here\n    return 0;\n}",
  },
  _solution: (input) => {
    const prices: number[] = JSON.parse(input.trim());
    let minPrice = Infinity, maxProfit = 0;
    for (const p of prices) {
      if (p < minPrice) minPrice = p;
      else if (p - minPrice > maxProfit) maxProfit = p - minPrice;
    }
    return String(maxProfit);
  },
  _canonicalCode: {
    python: `def maxProfit(prices):
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        if price < min_price:
            min_price = price
        elif price - min_price > max_profit:
            max_profit = price - min_price
    return max_profit`,
    cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minPrice = INT_MAX;
        int maxProfit = 0;
        for (int price : prices) {
            if (price < minPrice) minPrice = price;
            else if (price - minPrice > maxProfit) maxProfit = price - minPrice;
        }
        return maxProfit;
    }
};`,
    java: `class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE;
        int maxProfit = 0;
        for (int price : prices) {
            if (price < minPrice) minPrice = price;
            else if (price - minPrice > maxProfit) maxProfit = price - minPrice;
        }
        return maxProfit;
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q7 – Climbing Stairs (Easy)
// ---------------------------------------------------------------------------
const climbingStairs: StaticQuestion = {
  title: "Climbing Stairs",
  difficulty: "Easy",
  description:
    "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
  examples: [
    { input: "n = 2", output: "2", explanation: "Two ways: (1+1) or (2)." },
    { input: "n = 3", output: "3", explanation: "Three ways: (1+1+1), (1+2), (2+1)." },
  ],
  testCases: [
    { input: "2",  expected_output: "2",  is_hidden: false },
    { input: "3",  expected_output: "3",  is_hidden: false },
    { input: "1",  expected_output: "1",  is_hidden: true },
    { input: "10", expected_output: "89", is_hidden: true },
  ],
  starterCode: {
    python:     "def climbStairs(n):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    int climbStairs(int n) {\n        // Write your solution here\n        return 0;\n    }\n};",
    java:       "class Solution {\n    public int climbStairs(int n) {\n        // Write your solution here\n        return 0;\n    }\n}",
    javascript: "function climbStairs(n) {\n    // Write your solution here\n    return 0;\n}",
  },
  _solution: (input) => {
    const n = parseInt(input.trim(), 10);
    if (n <= 1) return "1";
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) { const t = a + b; a = b; b = t; }
    return String(b);
  },
  _canonicalCode: {
    python: `def climbStairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for i in range(3, n + 1):
        a, b = b, a + b
    return b`,
    cpp: `class Solution {
public:
    int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }
};`,
    java: `class Solution {
    public int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q8 – Reverse Linked List (Easy)
// ---------------------------------------------------------------------------
const reverseLinkedList: StaticQuestion = {
  title: "Reverse Linked List",
  difficulty: "Easy",
  description:
    "Given the head of a singly linked list, reverse the list, and return the reversed list.\n\nInput is given as a space-separated list of node values (e.g. `1 2 3 4 5`). Output should also be space-separated.",
  examples: [
    { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]", explanation: "Reversed list." },
    { input: "head = [1,2]",       output: "[2,1]",       explanation: "Two-node reversal." },
    { input: "head = []",          output: "[]",          explanation: "Empty list stays empty." },
  ],
  testCases: [
    { input: "[1,2,3,4,5]", expected_output: "[5,4,3,2,1]", is_hidden: false },
    { input: "[1,2]",       expected_output: "[2,1]",       is_hidden: false },
    { input: "[]",          expected_output: "[]",          is_hidden: true },
    { input: "[1]",         expected_output: "[1]",         is_hidden: true },
  ],
  starterCode: {
    python:     "def reverseList(head):\n    # head is a Python list; return reversed list\n    pass",
    cpp:        "class Solution {\npublic:\n    // Given as vector for simplicity\n    vector<int> reverseList(vector<int>& head) {\n        // Write your solution here\n        return {};\n    }\n};",
    java:       "class Solution {\n    public int[] reverseList(int[] head) {\n        // Write your solution here\n        return new int[0];\n    }\n}",
    javascript: "function reverseList(head) {\n    // head is an array\n    return [];\n}",
  },
  _solution: (input) => {
    const raw = input.trim();
    const arr: number[] = JSON.parse(raw);
    return JSON.stringify(arr.reverse());
  },
  _canonicalCode: {
    python: `def reverseList(head):
    return head[::-1]`,
    cpp: `class Solution {
public:
    vector<int> reverseList(vector<int>& head) {
        reverse(head.begin(), head.end());
        return head;
    }
};`,
    java: `class Solution {
    public int[] reverseList(int[] head) {
        int left = 0, right = head.length - 1;
        while (left < right) {
            int temp = head[left];
            head[left] = head[right];
            head[right] = temp;
            left++;
            right--;
        }
        return head;
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q9 – Number of Islands (Medium)
// ---------------------------------------------------------------------------
const numberOfIslands: StaticQuestion = {
  title: "Number of Islands",
  difficulty: "Medium",
  description:
    "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the **number of islands**.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.\n\nInput is a 2D array of strings `\"1\"` and `\"0\"`.",
  examples: [
    { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: "1", explanation: "One connected landmass." },
    { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: "3", explanation: "Three separate islands." },
  ],
  testCases: [
    {
      input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
      expected_output: "1", is_hidden: false,
    },
    {
      input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
      expected_output: "3", is_hidden: false,
    },
    { input: '[["1"]]', expected_output: "1", is_hidden: true },
    { input: '[["0"]]', expected_output: "0", is_hidden: true },
  ],
  starterCode: {
    python:     "def numIslands(grid):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        // Write your solution here\n        return 0;\n    }\n};",
    java:       "class Solution {\n    public int numIslands(char[][] grid) {\n        // Write your solution here\n        return 0;\n    }\n}",
    javascript: "function numIslands(grid) {\n    // Write your solution here\n    return 0;\n}",
  },
  _solution: (input) => {
    const grid: string[][] = JSON.parse(input.trim());
    if (!grid.length) return "0";
    const rows = grid.length, cols = grid[0].length;
    let count = 0;
    function dfs(r: number, c: number) {
      if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== "1") return;
      grid[r][c] = "0";
      dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "1") { count++; dfs(r, c); }
    }
    return String(count);
  },
  _canonicalCode: {
    python: `def numIslands(grid):
    if not grid:
        return 0
    count = 0
    def dfs(i, j):
        if i < 0 or j < 0 or i >= len(grid) or j >= len(grid[0]) or grid[i][j] == '0':
            return
        grid[i][j] = '0'
        dfs(i+1, j)
        dfs(i-1, j)
        dfs(i, j+1)
        dfs(i, j-1)
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == '1':
                count += 1
                dfs(i, j)
    return count`,
    cpp: `class Solution {
public:
    void dfs(vector<vector<char>>& grid, int r, int c) {
        if (r < 0 || c < 0 || r >= (int)grid.size() || c >= (int)grid[0].size() || grid[r][c] == '0') return;
        grid[r][c] = '0';
        dfs(grid, r+1, c);
        dfs(grid, r-1, c);
        dfs(grid, r, c+1);
        dfs(grid, r, c-1);
    }
    int numIslands(vector<vector<char>>& grid) {
        int count = 0;
        for (int r = 0; r < (int)grid.size(); r++) {
            for (int c = 0; c < (int)grid[0].size(); c++) {
                if (grid[r][c] == '1') {
                    count++;
                    dfs(grid, r, c);
                }
            }
        }
        return count;
    }
};`,
    java: `class Solution {
    public int numIslands(char[][] grid) {
        int count = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[0].length; c++) {
                if (grid[r][c] == '1') {
                    count++;
                    dfs(grid, r, c);
                }
            }
        }
        return count;
    }
    private void dfs(char[][] grid, int r, int c) {
        if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] == '0') return;
        grid[r][c] = '0';
        dfs(grid, r+1, c);
        dfs(grid, r-1, c);
        dfs(grid, r, c+1);
        dfs(grid, r, c-1);
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// Q10 – Contains Duplicate (Easy)
// ---------------------------------------------------------------------------
const containsDuplicate: StaticQuestion = {
  title: "Contains Duplicate",
  difficulty: "Easy",
  description:
    "Given an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.",
  examples: [
    { input: "nums = [1,2,3,1]",       output: "true",  explanation: "1 appears twice." },
    { input: "nums = [1,2,3,4]",       output: "false", explanation: "All distinct." },
    { input: "nums = [1,1,1,3,3,4,3]", output: "true",  explanation: "Multiple duplicates." },
  ],
  testCases: [
    { input: "[1,2,3,1]",       expected_output: "true",  is_hidden: false },
    { input: "[1,2,3,4]",       expected_output: "false", is_hidden: false },
    { input: "[1,1,1,3,3,4,3]", expected_output: "true",  is_hidden: false },
    { input: "[]",              expected_output: "false", is_hidden: true },
    { input: "[0]",             expected_output: "false", is_hidden: true },
  ],
  starterCode: {
    python:     "def containsDuplicate(nums):\n    # Write your solution here\n    pass",
    cpp:        "class Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        // Write your solution here\n        return false;\n    }\n};",
    java:       "class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        // Write your solution here\n        return false;\n    }\n}",
    javascript: "function containsDuplicate(nums) {\n    // Write your solution here\n    return false;\n}",
  },
  _solution: (input) => {
    const nums: number[] = JSON.parse(input.trim());
    return String(new Set(nums).size !== nums.length);
  },
  _canonicalCode: {
    python: `def containsDuplicate(nums):
    return len(nums) != len(set(nums))`,
    cpp: `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> seen(nums.begin(), nums.end());
        return seen.size() != nums.size();
    }
};`,
    java: `class Solution {
    public boolean containsDuplicate(int[] nums) {
        HashSet<Integer> seen = new HashSet<>();
        for (int num : nums) {
            if (seen.contains(num)) return true;
            seen.add(num);
        }
        return false;
    }
}`,
  },
};

// ---------------------------------------------------------------------------
// The full pool of 10 questions
// ---------------------------------------------------------------------------
export const STATIC_QUESTION_POOL: StaticQuestion[] = [
  twoSum,
  validParentheses,
  maximumSubarray,
  longestSubstring,
  mergeIntervals,
  bestTimeToBuyAndSellStock,
  climbingStairs,
  reverseLinkedList,
  numberOfIslands,
  containsDuplicate,
];

/**
 * Returns a randomly shuffled selection of `count` questions from the pool.
 * Always returns exactly min(count, pool.size) questions.
 */
export function pickStaticQuestions(count: number): StaticQuestion[] {
  const shuffled = [...STATIC_QUESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
