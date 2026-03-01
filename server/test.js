// Test script for refactored backend (RFID is optional, auto-generated _id)
const http = require('http');

const BASE = 'http://localhost:5000';
let TOKEN = '';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('\n========== ECLIPSE BACKEND TEST (v2 - Optional RFID) ==========\n');

  // 1. Login
  console.log('--- TEST 1: Login ---');
  let res = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  if (res.data.token) {
    TOKEN = res.data.token;
    console.log('✅ Login successful\n');
  } else {
    console.log('❌ Login failed! Run seed first: POST /api/auth/seed');
    return;
  }

  // 2. Create participants WITHOUT RFID (simulating CSV import workflow)
  console.log('--- TEST 2: Add Participants (no RFID) ---');
  const participantIds = [];
  const names = ['Alice Johnson', 'Bob Smith', 'Charlie Brown'];
  for (const name of names) {
    res = await request('POST', '/api/participants', { name, email: `${name.split(' ')[0].toLowerCase()}@test.com` });
    participantIds.push(res.data._id);
    console.log(`  ${res.status === 201 ? '✅' : '❌'} ${name} (ID: ${res.data._id}, RFID: ${res.data.rfid || 'NONE'})`);
  }
  console.log('');

  // 3. Create volunteer without RFID
  console.log('--- TEST 3: Add Volunteer (no RFID) ---');
  res = await request('POST', '/api/volunteers', { name: 'Dave Mentor', role: 'mentor' });
  const mentorId = res.data._id;
  console.log(`  ✅ ${res.data.name} (ID: ${mentorId}, RFID: ${res.data.rfid || 'NONE'})\n`);

  // 4. Create team with ObjectId references
  console.log('--- TEST 4: Create Team ---');
  res = await request('POST', '/api/teams', {
    teamName: 'Team Eclipse',
    mentorId: mentorId,
    memberIds: participantIds
  });
  const teamId = res.data._id;
  console.log(`  ✅ ${res.data.teamName} (Members: ${res.data.members.length}, Mentor: ${res.data.mentorId})\n`);

  // 5. Check unmapped participants
  console.log('--- TEST 5: Get Unmapped Participants ---');
  res = await request('GET', '/api/participants/unmapped');
  console.log(`  📋 Unmapped participants: ${res.data.length} (should be 3)\n`);

  // 6. Map RFID to participants (THE KEY NEW FEATURE)
  console.log('--- TEST 6: Assign RFID Cards ---');
  const rfids = ['CARD001', 'CARD002', 'CARD003'];
  for (let i = 0; i < participantIds.length; i++) {
    res = await request('PUT', `/api/participants/${participantIds[i]}/assign-rfid`, { rfid: rfids[i] });
    console.log(`  ✅ ${res.data.message}`);
  }
  // Also map volunteer
  res = await request('PUT', `/api/volunteers/${mentorId}/assign-rfid`, { rfid: 'VCARD001' });
  console.log(`  ✅ ${res.data.message}`);

  // Test duplicate RFID
  res = await request('PUT', `/api/volunteers/${mentorId}/assign-rfid`, { rfid: 'CARD001' });
  console.log(`  ❌ Duplicate RFID test: ${res.status} — ${res.data.error}`);
  console.log('');

  // 7. Check unmapped again (should be 0)
  console.log('--- TEST 7: Unmapped After Mapping ---');
  res = await request('GET', '/api/participants/unmapped');
  console.log(`  📋 Unmapped: ${res.data.length} (should be 0)\n`);

  // 8. Entry scan with RFID
  console.log('--- TEST 8: Entry/Exit Scan ---');
  res = await request('POST', '/api/scan/entry', { rfid: 'CARD001' });
  console.log(`  ✅ ${res.data.person?.name}: ${res.data.action} | Inside: ${res.data.insideCount?.total}`);

  res = await request('POST', '/api/scan/entry', { rfid: 'CARD002' });
  console.log(`  ✅ ${res.data.person?.name}: ${res.data.action} | Inside: ${res.data.insideCount?.total}`);

  res = await request('POST', '/api/scan/entry', { rfid: 'VCARD001' });
  console.log(`  ✅ ${res.data.person?.name}: ${res.data.action} | Inside: ${res.data.insideCount?.total}`);

  // Cooldown test
  res = await request('POST', '/api/scan/entry', { rfid: 'CARD001' });
  console.log(`  ⏱️ Cooldown: ${res.status} — ${res.data.error || 'no error'}`);
  console.log('');

  // 9. Set active meal & food scan
  console.log('--- TEST 9: Food Scan ---');
  await request('PUT', '/api/meals/config', { mealType: 'day1_lunch', active: true });
  console.log('  🍽️ Active meal set: Day 1 Lunch');

  res = await request('POST', '/api/scan/food', { rfid: 'CARD001' });
  console.log(`  ✅ ${res.data.person?.name}: ${res.data.status} | Served: ${res.data.servedCount?.total}`);

  res = await request('POST', '/api/scan/food', { rfid: 'CARD001' });
  console.log(`  ❌ Duplicate: ${res.data.status || res.data.error}`);

  res = await request('POST', '/api/scan/food', { rfid: 'CARD003' });
  console.log(`  ⛔ Not inside: ${res.data.error}`);
  console.log('');

  // 10. Analytics
  console.log('--- TEST 10: Analytics ---');
  res = await request('GET', '/api/analytics');
  console.log(`  Registered: ${res.data.totalRegistered} | Inside: ${res.data.totalInside} | Mapped: ${res.data.totalMapped}`);
  console.log('');

  // 11. Teams (enriched)
  console.log('--- TEST 11: Get Teams (enriched) ---');
  res = await request('GET', '/api/teams');
  if (res.data.length > 0) {
    const t = res.data[0];
    console.log(`  Team: ${t.teamName} | Members: ${t.totalMembers} | Inside: ${t.checkedInCount} | Mentor: ${t.mentor?.name}`);
  }
  console.log('');

  // 12. Search
  console.log('--- TEST 12: Search ---');
  res = await request('GET', '/api/participants/search?q=alice');
  console.log(`  "alice": Found ${res.data.participants?.length} participants`);
  res = await request('GET', '/api/participants/search?q=CARD001');
  console.log(`  "CARD001": Found ${res.data.participants?.length} participants`);
  console.log('');

  console.log('========== ALL TESTS COMPLETE ==========\n');
}

test().catch(console.error);
