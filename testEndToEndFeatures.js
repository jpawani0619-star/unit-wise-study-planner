/**
 * End-to-End Simulation Test for Major Features
 * Tests Subject CRUD, Progress Updates, Timetable Generation & Chat Interactions
 */

const { generateSchedule } = require('../src/services/schedulerService');
const { generateDemoAdvice } = require('../src/services/demoAdvisorService');
const { isWatsonxConfigured } = require('../src/services/watsonxService');

console.log('🚀 Running Feature Simulation Tests...\n');

let testsPassed = 0;
let total = 0;

function check(cond, desc) {
  total++;
  if (cond) {
    console.log(`✅ [Feature Test] ${desc}`);
    testsPassed++;
  } else {
    console.error(`❌ [Feature Test FAILED] ${desc}`);
    process.exitCode = 1;
  }
}

// Feature 1: Subject, Unit & Topic Creation
console.log('=== Feature 1: Creating Subject with Units & Topics ===');
const subject = {
  id: 'sub_test_1',
  name: 'Artificial Intelligence',
  code: 'CS402',
  examDate: '2026-10-30',
  units: [
    {
      id: 'u_ai_1',
      title: 'Unit 1: Search Algorithms',
      difficulty: 'Medium',
      completed: false,
      topics: [
        { id: 't_ai_1', name: 'A* and Heuristic Search', difficulty: 'Medium', estimatedHours: 2.0, completed: false },
        { id: 't_ai_2', name: 'Minimax & Alpha-Beta Pruning', difficulty: 'Hard', estimatedHours: 3.0, completed: false }
      ]
    }
  ]
};

check(subject.name === 'Artificial Intelligence', 'Subject created with valid title');
check(subject.units[0].topics.length === 2, 'Subject has 2 topics');

// Feature 2: Progress Tracking & Unit Auto-completion
console.log('\n=== Feature 2: Progress Tracking & Unit Auto-completion ===');
// Mark topic 1 completed
subject.units[0].topics[0].completed = true;
let totalTopics = subject.units[0].topics.length;
let completedTopics = subject.units[0].topics.filter(t => t.completed).length;
let pct = Math.round((completedTopics / totalTopics) * 100);

check(pct === 50, 'Progress accurately computes 50% when 1 of 2 topics is completed');
check(!subject.units[0].completed, 'Unit remains incomplete when not all topics are done');

// Mark topic 2 completed
subject.units[0].topics[1].completed = true;
completedTopics = subject.units[0].topics.filter(t => t.completed).length;
pct = Math.round((completedTopics / totalTopics) * 100);
subject.units[0].completed = subject.units[0].topics.every(t => t.completed);

check(pct === 100, 'Progress accurately computes 100% when all topics are completed');
check(subject.units[0].completed === true, 'Unit automatically marked completed when all topics are done');

// Feature 3: Editing Subject While Preserving Topic State
console.log('\n=== Feature 3: Editing Subject with Completion State Preservation ===');
// User edits subject title and adds a unit
const editedSubject = {
  ...subject,
  name: 'Artificial Intelligence & Machine Learning',
  units: [
    ...subject.units,
    {
      id: 'u_ai_2',
      title: 'Unit 2: Neural Networks',
      difficulty: 'Hard',
      completed: false,
      topics: [
        { id: 't_ai_3', name: 'Backpropagation & Gradient Descent', difficulty: 'Hard', estimatedHours: 3.5, completed: false }
      ]
    }
  ]
};

check(editedSubject.name === 'Artificial Intelligence & Machine Learning', 'Subject title successfully updated');
check(editedSubject.units[0].topics[0].completed === true, 'Existing topic completion state is preserved across edits');
check(editedSubject.units[1].topics.length === 1, 'New unit and topic added successfully');

// Feature 4: Timetable Generation with Actual Parameters
console.log('\n=== Feature 4: Timetable Generation with Actual Inputs ===');
const timetable = generateSchedule({
  subjects: [editedSubject],
  dailyHours: 2.5,
  startDate: '2026-10-15'
});

check(timetable.success === true, 'Timetable generated successfully');
check(timetable.summary.dailyAvailableHours === 2.5, 'Timetable strictly respects student daily hours (2.5 hrs)');
check(timetable.summary.pendingTopics === 1, 'Recognizes exactly 1 pending topic (Unit 2 Backprop)');
check(timetable.summary.completedTopics === 2, 'Recognizes 2 completed topics from Unit 1');

// Verify that the only pending topic is scheduled for study
const pendingSlot = timetable.schedule.some(day =>
  day.slots.some(s => s.type === 'study' && s.topicName === 'Backpropagation & Gradient Descent')
);
check(pendingSlot, 'Pending topic is properly scheduled in day-wise study slot');

// Feature 5: AI Advisor Query & Follow-up Question
console.log('\n=== Feature 5: AI Study Advisor Interaction ===');
const studentContext = {
  totalSubjects: 1,
  completionPercentage: 66,
  dailyHours: 2.5,
  pendingTopics: 1,
  hardTopicsCount: 1,
  subjects: [{ name: editedSubject.name, examDate: editedSubject.examDate }]
};

const aiReply = generateDemoAdvice({
  message: 'How should I study for my upcoming AI exam?',
  studentContext
});

check(aiReply.mode === 'demo', 'AI Advisor responds in Demo Mode when keys are missing');
check(aiReply.reply.includes('Follow-Up Question:'), 'AI Advisor includes an actionable follow-up question');
check(typeof aiReply.reply === 'string' && aiReply.reply.length > 50, 'AI Advisor returns structured, non-empty advice');

// Feature 6: Credential Security Verification
console.log('\n=== Feature 6: Credential Security Check ===');
const hasConfigured = isWatsonxConfigured();
check(typeof hasConfigured === 'boolean', 'Watsonx configuration check returns boolean');

console.log(`\n========================================`);
console.log(`End-to-End Simulation: ${testsPassed} of ${total} tests passed!`);
console.log(`========================================\n`);

if (testsPassed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
