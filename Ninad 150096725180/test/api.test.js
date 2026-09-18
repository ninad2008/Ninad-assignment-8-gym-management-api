/**
 * Comprehensive API Test Suite
 * Tests all requirements from Assignment 08 specification:
 * 1. Member registration with 30-day expiry calculation
 * 2. Passport session-based login & /api/auth/me profile with remaining days
 * 3. Class creation with capacity constraints
 * 4. Booking validation (Class full check on 3rd booking when maxCapacity=2)
 * 5. Expired membership query and renewal validation
 */

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.PORT = '5050';

const app = require('../server');
const User = require('../models/User');
const FitnessClass = require('../models/FitnessClass');

let server;
let mongod;
let baseUrl = 'http://127.0.0.1:5050';

// Helper function for sending HTTP requests with cookie jar for session support
function request(method, path, body = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies: setCookie ? setCookie.map((c) => c.split(';')[0]).join('; ') : '',
          body: parsed
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING ASSIGNMENT 08 GYM API VERIFICATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Start In-Memory MongoDB Server for fast isolated testing
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    // Start Express HTTP Server
    server = app.listen(5050);

    console.log('📋 Test 1: Member Registration & 30-Day Expiry Date Calculation');
    const regRes = await request('POST', '/api/auth/register', {
      username: 'test_sam',
      email: 'test_sam@fit.com',
      password: 'mypassword123',
      membershipTier: 'Gold',
      durationMonths: 1,
      emergencyContact: '+1-555-0199'
    });

    assert(regRes.status === 201, `Registration returns HTTP 201 (Got ${regRes.status})`);
    assert(regRes.body.data && regRes.body.data.username === 'test_sam', 'User data returned in response');
    assert(regRes.body.data.password === undefined, 'Password is not exposed in response');

    // Verify expiry date is ~30 days in future
    const registeredUser = await User.findOne({ username: 'test_sam' });
    const expiryDate = new Date(registeredUser.membershipExpiryDate);
    const now = new Date();
    const diffDays = Math.round((expiryDate - now) / (1000 * 60 * 60 * 24));
    assert(diffDays === 30, `Expiry date is calculated exactly 30 days ahead (Calculated: ${diffDays} days)`);

    console.log('\n📋 Test 2: Passport Session Login & Authentication Guard');
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'test_sam',
      password: 'mypassword123'
    });

    assert(loginRes.status === 200, `Login returns HTTP 200 (Got ${loginRes.status})`);
    const sessionCookie = loginRes.cookies;
    assert(sessionCookie && sessionCookie.includes('connect.sid'), 'Session cookie connect.sid returned');

    // Test /api/auth/me with session
    const meRes = await request('GET', '/api/auth/me', null, sessionCookie);
    assert(meRes.status === 200, `/api/auth/me returns HTTP 200 with session`);
    assert(meRes.body.data.remainingDays >= 29, `Remaining days calculated correctly: ${meRes.body.data.remainingDays}`);

    // Test /api/auth/me without session (Unauthorized)
    const unauthRes = await request('GET', '/api/auth/me', null, '');
    assert(unauthRes.status === 401, `/api/auth/me returns 401 when unauthenticated`);

    console.log('\n📋 Test 3: Create Class with maxCapacity = 2');
    const classRes = await request('POST', '/api/classes', {
      title: 'Test_HIIT_Blitz',
      trainerName: 'Marcus Trainer',
      scheduleDate: new Date(Date.now() + 86400000).toISOString(),
      durationMinutes: 45,
      maxCapacity: 2
    }, sessionCookie);

    assert(classRes.status === 201, `Class creation returns HTTP 201 (Got ${classRes.status})`);
    const classId = classRes.body.data._id;

    console.log('\n📋 Test 4: Capacity Validation & Over-enrollment Prevention (3 Bookings for Capacity 2)');
    // Member 1 books (test_sam)
    const book1 = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie);
    assert(book1.status === 200, `Member 1 successfully booked (Got ${book1.status})`);

    // Register & Login Member 2
    await request('POST', '/api/auth/register', {
      username: 'test_alex',
      email: 'test_alex@fit.com',
      password: 'password123',
      membershipTier: 'Silver',
      durationMonths: 1
    });
    const login2 = await request('POST', '/api/auth/login', {
      username: 'test_alex',
      password: 'password123'
    });
    const sessionCookie2 = login2.cookies;

    const book2 = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie2);
    assert(book2.status === 200, `Member 2 successfully booked (Got ${book2.status})`);

    // Register & Login Member 3
    await request('POST', '/api/auth/register', {
      username: 'test_linda',
      email: 'test_linda@fit.com',
      password: 'password123',
      membershipTier: 'Platinum',
      durationMonths: 1
    });
    const login3 = await request('POST', '/api/auth/login', {
      username: 'test_linda',
      password: 'password123'
    });
    const sessionCookie3 = login3.cookies;

    // Member 3 attempts to book full class
    const book3 = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie3);
    assert(
      book3.status === 400 && book3.body.message.includes('Class capacity reached'),
      `Member 3 booking rejected with 400 'Class capacity reached' (Got ${book3.status}: ${book3.body.message})`
    );

    console.log('\n📋 Test 5: Class Cancellation & Query Filtering');
    // Member 1 cancels booking
    const cancelRes = await request('DELETE', `/api/classes/${classId}/cancel`, null, sessionCookie);
    assert(cancelRes.status === 200, `Member 1 cancellation returns HTTP 200`);

    // Member 3 re-attempts booking now that seat is free
    const book3Retry = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie3);
    assert(book3Retry.status === 200, `Member 3 booking succeeds after seat freed (Got ${book3Retry.status})`);

    // Filter by trainer query
    const trainerQueryRes = await request('GET', '/api/classes?trainer=Marcus');
    assert(trainerQueryRes.status === 200 && trainerQueryRes.body.count >= 1, `Query ?trainer=Marcus returns matching classes`);

    console.log('\n📋 Test 6: Expired Members & Membership Renewal');
    // Create an expired member manually
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 15);
    const expiredUser = new User({
      username: 'test_expired_user',
      email: 'test_expired@fit.com',
      password: 'password123',
      membershipTier: 'Bronze',
      membershipStatus: 'expired',
      membershipExpiryDate: pastDate
    });
    await expiredUser.save();

    // Expired member query
    const expiredListRes = await request('GET', '/api/members/expired', null, sessionCookie);
    assert(expiredListRes.status === 200, `GET /api/members/expired returns HTTP 200`);
    const foundExpired = expiredListRes.body.data.some((u) => u.username === 'test_expired_user');
    assert(foundExpired, `Expired member appears in /api/members/expired list`);

    // Renew membership for expired user
    const renewRes = await request('PATCH', `/api/members/${expiredUser._id}/renew`, {
      additionalMonths: 6,
      tier: 'Platinum'
    }, sessionCookie);

    assert(renewRes.status === 200, `Renewal returns HTTP 200`);
    assert(renewRes.body.data.membershipTier === 'Platinum', `Membership tier updated to Platinum`);
    assert(renewRes.body.data.membershipStatus === 'active', `Membership status updated to active`);

    const renewedExpiry = new Date(renewRes.body.data.membershipExpiryDate);
    const renewedDaysAhead = Math.round((renewedExpiry - new Date()) / (1000 * 60 * 60 * 24));
    assert(renewedDaysAhead >= 175 && renewedDaysAhead <= 185, `Renewed expiry date is ~180 days ahead (${renewedDaysAhead} days)`);

    console.log('\n======================================================');
    console.log(`🎉 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongod) {
      await mongod.stop();
    }
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
