/**
 * HTTP Integration Test Suite
 */

const http = require('http');
const app = require('../server');

const TEST_PORT = 3001;

let server;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(body)
            : body;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runApiTests() {
  console.log('🚀 Starting API Integration Tests on port', TEST_PORT);

  server = app.listen(TEST_PORT, async () => {
    try {
      let passed = 0;
      let total = 0;

      const test = (condition, name) => {
        total++;
        if (condition) {
          console.log(`✅ PASS: ${name}`);
          passed++;
        } else {
          console.error(`❌ FAIL: ${name}`);
        }
      };

      // 1. Health check
      const healthRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/health',
        method: 'GET'
      });
      test(healthRes.status === 200 && healthRes.body.status === 'ok', 'GET /api/health returns 200 OK');

      // 2. Chat status
      const statusRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/chat/status',
        method: 'GET'
      });
      test(statusRes.status === 200 && statusRes.body.activeMode === 'demo', 'GET /api/chat/status reports demo mode when unconfigured');

      // 3. Timetable generation endpoint
      const today = new Date();
      const examDate = new Date(today);
      examDate.setDate(today.getDate() + 10);
      const examDateStr = examDate.toISOString().split('T')[0];

      const scheduleRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/schedule/generate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        dailyHours: 3,
        subjects: [
          {
            name: 'Web Engineering',
            code: 'CS401',
            examDate: examDateStr,
            units: [
              {
                title: 'Unit 1: RESTful APIs',
                topics: [
                  { name: 'HTTP Verbs & Status Codes', difficulty: 'Easy', estimatedHours: 1 },
                  { name: 'Authentication & JWT', difficulty: 'Hard', estimatedHours: 3 }
                ]
              }
            ]
          }
        ]
      });

      test(scheduleRes.status === 200 && scheduleRes.body.success === true, 'POST /api/schedule/generate creates valid schedule');
      test(Array.isArray(scheduleRes.body.schedule) && scheduleRes.body.schedule.length > 0, 'Schedule contains day-by-day items');

      // 4. Chat query endpoint
      const chatRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        message: 'How do I balance my study time between hard and easy topics?',
        studentContext: {
          totalSubjects: 1,
          completionPercentage: 25,
          dailyHours: 3
        }
      });

      test(chatRes.status === 200 && chatRes.body.success === true, 'POST /api/chat responds successfully');
      test(typeof chatRes.body.reply === 'string' && chatRes.body.reply.length > 20, 'POST /api/chat returns non-empty advice string');

      // 5. Static HTML serving
      const htmlRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/',
        method: 'GET'
      });
      test(htmlRes.status === 200 && htmlRes.body.includes('StudyMate'), 'GET / serves frontend index.html');

      // 6. Test Watsonx diagnostic endpoint
      const testWatsonxRes = await request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/chat/test-watsonx',
        method: 'GET'
      });
      test(testWatsonxRes.status === 200 && testWatsonxRes.body.configured === false, 'GET /api/chat/test-watsonx returns unconfigured status when no keys');

      console.log(`\n========================================`);
      console.log(`API Integration Summary: ${passed} of ${total} tests passed.`);
      console.log(`========================================\n`);

      server.close(() => {
        if (passed === total) {
          process.exit(0);
        } else {
          process.exit(1);
        }
      });
    } catch (e) {
      console.error('Integration test exception:', e);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runApiTests();
