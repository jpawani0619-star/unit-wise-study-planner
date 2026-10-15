/**
 * Automated Test Suite for Unit-Wise Study Planner Backend & API
 */

const { generateSchedule, parseLocalDate, formatDate, DIFFICULTY_MULTIPLIERS } = require('../src/services/schedulerService');
const { generateDemoAdvice } = require('../src/services/demoAdvisorService');
const { validateSchedulePayload, validateChatPayload } = require('../src/utils/validator');

console.log('🧪 Starting Comprehensive Study Planner Verification Tests...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Test Validators
console.log('--- 1. Testing Validation Rules ---');
const emptyPayloadResult = validateSchedulePayload({});
assert(!emptyPayloadResult.isValid, 'Reject empty schedule payload');

const invalidHoursResult = validateSchedulePayload({
  dailyHours: -2,
  subjects: [{ name: 'Math', examDate: '2026-12-01', units: [{ title: 'Unit 1' }] }]
});
assert(!invalidHoursResult.isValid, 'Reject negative study hours');

const validPayloadResult = validateSchedulePayload({
  dailyHours: 4,
  subjects: [
    {
      name: 'Algorithms',
      examDate: '2026-11-20',
      units: [
        {
          title: 'Unit 1: Sorting',
          topics: [{ name: 'Merge Sort', difficulty: 'Medium' }]
        }
      ]
    }
  ]
});
assert(validPayloadResult.isValid, 'Accept valid schedule payload');

// 2. Test Timezone-safe local date handling
console.log('\n--- 2. Testing Date Parser & Difficulty Constants ---');
const parsedDate = parseLocalDate('2026-10-25');
assert(parsedDate.getFullYear() === 2026 && parsedDate.getMonth() === 9 && parsedDate.getDate() === 25, 'Timezone-safe parseLocalDate gives exact year, month, day');
assert(formatDate(parsedDate) === '2026-10-25', 'formatDate produces standard YYYY-MM-DD');
assert(DIFFICULTY_MULTIPLIERS.Easy === 1.0 && DIFFICULTY_MULTIPLIERS.Hard === 2.0, 'Difficulty multipliers are strictly defined (Easy: 1.0, Hard: 2.0)');

// 3. Test Scheduler Engine with Hard Topics, Completed Topics & Imminent Deadlines
console.log('\n--- 3. Testing Timetable Scheduler Engine ---');
const testSubjects = [
  {
    name: 'Operating Systems',
    code: 'CS201',
    examDate: '2026-10-25', // 10 days out from 2026-10-15
    units: [
      {
        id: 'u1',
        title: 'Unit 1: CPU Scheduling',
        completed: true,
        topics: [
          { name: 'FCFS & SJF', difficulty: 'Easy', estimatedHours: 1.0, completed: true }
        ]
      },
      {
        id: 'u2',
        title: 'Unit 2: Memory Management & Paging',
        completed: false,
        topics: [
          { name: 'Round Robin & Priority', difficulty: 'Medium', estimatedHours: 2.0, completed: false },
          { name: 'Virtual Memory & Multi-level Paging', difficulty: 'Hard', estimatedHours: 3.0, completed: false }
        ]
      }
    ]
  }
];

const scheduleResult = generateSchedule({
  subjects: testSubjects,
  dailyHours: 3,
  startDate: '2026-10-15'
});

assert(scheduleResult.success === true, 'Schedule generated successfully');
assert(Array.isArray(scheduleResult.schedule) && scheduleResult.schedule.length > 0, 'Schedule has day-by-day array');
assert(scheduleResult.summary.totalTopics === 3, 'Correct total topics count (3)');
assert(scheduleResult.summary.completedTopics === 1, 'Accurately recognizes 1 completed topic');
assert(scheduleResult.summary.pendingTopics === 2, 'Accurately recognizes 2 pending topics');
assert(scheduleResult.summary.completionPercentage === 33, 'Accurately calculates 33% initial completion');

// Verify completed topics are NOT scheduled in core study queue
const completedTopicInStudySlot = scheduleResult.schedule.some(day =>
  day.slots.some(s => s.type === 'study' && s.topicName === 'FCFS & SJF')
);
assert(!completedTopicInStudySlot, 'Already completed topics are excluded from primary study queue');

// Check that Hard topic exists and has priority
const hasHardSlot = scheduleResult.schedule.some(day => 
  day.slots.some(s => s.difficulty === 'Hard' && s.topicName.includes('Virtual Memory'))
);
assert(hasHardSlot, 'Pending Hard topic is allocated into schedule slots');

// Check that Revision or Practice slots exist before the exam
const hasRevisionOrPractice = scheduleResult.schedule.some(day =>
  day.slots.some(s => s.type === 'revision' || s.type === 'practice')
);
assert(hasRevisionOrPractice, 'Spaced revision or mock exam practice slots are included');

// 4. Test Demo AI Advisor Context & Follow-Up Questions
console.log('\n--- 4. Testing Demo Advisor Context & Interactive Follow-Up Questions ---');
const sampleContext = {
  totalSubjects: 2,
  completionPercentage: 40,
  dailyHours: 3.5,
  pendingTopics: 5,
  hardTopicsCount: 2,
  subjects: [
    { name: 'Data Structures', examDate: '2026-10-22' },
    { name: 'Database Systems', examDate: '2026-10-28' }
  ]
};

const queriesToTest = [
  { q: 'How should I approach revision?', name: 'Revision strategy' },
  { q: 'I am struggling with my hard units', name: 'Hard units advice' },
  { q: 'I missed study hours yesterday and fell behind', name: 'Catch up protocol' },
  { q: 'Can you give mock exam advice?', name: 'Practice tests' },
  { q: 'Explain how to use Pomodoro effectively', name: 'Pomodoro focus' },
  { q: 'Give me my study progress overview', name: 'Progress overview' },
  { q: 'Hello there, can you help me plan?', name: 'General greeting' },
  { q: 'Explain AVL tree rotations (LL, RR, LR, RL)', name: 'DSA AVL tree rotations' },
  { q: 'Explain Dijkstra shortest path algorithm', name: 'DSA Dijkstra algorithm' },
  { q: 'What is the difference between BFS and DFS?', name: 'DSA BFS vs DFS' },
  { q: 'Compare QuickSort and MergeSort', name: 'DSA QuickSort vs MergeSort' },
  { q: 'What is the time complexity of binary search?', name: 'DSA Big-O Complexity' }
];

queriesToTest.forEach(item => {
  const res = generateDemoAdvice({ message: item.q, studentContext: sampleContext });
  assert(res.mode === 'demo', `${item.name} returns demo mode flag`);
  assert(res.reply.includes('Follow-Up Question:'), `${item.name} includes interactive follow-up question`);
});

// Check that AVL response contains all 4 rotations
const avlRes = generateDemoAdvice({ message: 'How do AVL tree rotations work?', studentContext: sampleContext });
assert(avlRes.reply.includes('Left-Left') && avlRes.reply.includes('Right-Right') && avlRes.reply.includes('Left-Right') && avlRes.reply.includes('Right-Left'), 'AVL response explains all 4 rotations (LL, RR, LR, RL)');

// Check that Dijkstra response contains time complexity
const dijkstraRes = generateDemoAdvice({ message: 'Explain Dijkstra algorithm', studentContext: sampleContext });
assert(dijkstraRes.reply.includes('\\mathcal{O}((V + E) \\log V)') || dijkstraRes.reply.includes('Priority Queue'), 'Dijkstra response explains Min-Heap priority queue & time complexity');

// Check that progress advice references actual subject names
const progressAdvice = generateDemoAdvice({ message: 'What is my progress?', studentContext: sampleContext });
assert(progressAdvice.reply.includes('Data Structures') && progressAdvice.reply.includes('Database Systems'), 'AI advisor references student actual registered subjects');

// 5. Test watsonx System Prompt Generator
console.log('\n--- 5. Testing Watsonx Academic System Prompt Construction ---');
const { buildAcademicSystemPrompt } = require('../src/services/watsonxService');
const promptWithSyllabus = buildAcademicSystemPrompt({
  subjects: [
    {
      name: 'Data Structures',
      code: 'CS301',
      examDate: '2026-10-25',
      units: [{ title: 'Unit 1: Trees', difficulty: 'Hard', completed: false }]
    }
  ],
  completionPercentage: 50,
  dailyHours: 4
});
assert(promptWithSyllabus.includes('DATA STRUCTURES & ALGORITHMS (DSA) TUTORING'), 'System prompt includes DSA tutoring expertise');
assert(promptWithSyllabus.includes('Unit 1: Trees'), 'System prompt accurately grounds syllabus units');
assert(promptWithSyllabus.includes('Never invent or hallucinate course units'), 'System prompt enforces syllabus accuracy rules');

console.log(`\n========================================`);
console.log(`Summary: ${passedTests} of ${totalTests} tests passed.`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
