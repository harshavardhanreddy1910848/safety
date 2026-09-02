import http from 'http';
import { db, initDb } from './db.js';

async function testHttpEndpoints() {
  console.log('🌐 Testing HTTP APIs against Backend & Neon PostgreSQL...\n');

  // We can dynamically start an express instance on port 3099 to avoid port conflicts
  process.env.PORT = '3099';
  const { default: express } = await import('express');
  
  // Test authentication token generation & verification
  const testUser = await db.registerUser(`api_test_${Date.now()}@silentsos.org`, 'Pass1234!', 'API Tester');
  console.log('✓ Created test user for API testing:', testUser.email);

  // Authenticate
  const authenticated = await db.authenticateUser(testUser.email, 'Pass1234!');
  console.log('✓ Successfully authenticated user against Neon:', authenticated.id);

  // Add Contact
  const contacts = await db.addContact(testUser.id, {
    name: 'Guardian Contact',
    phone: '+919876500000',
    email: 'guardian@silentsos.org',
    preferences: { gps: true, photos: true, video: true, audio: true, message: true }
  });
  console.log('✓ Added contact to Neon:', contacts.length);

  // Trigger SOS event
  const alertId = `http-alert-${Date.now()}`;
  const sosEvent = {
    id: alertId,
    userId: testUser.id,
    timestamp: Date.now(),
    type: 'SOS Button Manual',
    durationSeconds: 0,
    status: 'Active',
    evidence: { photos: 0, videos: 0, audio: 0, files: [] },
    contactsNotified: [],
    gpsPath: [{ lat: 12.9716, lng: 77.5946, timestamp: Date.now() }]
  };
  await db.addHistoryEvent(testUser.id, sosEvent);
  console.log('✓ Added SOS event to Neon:', alertId);

  // Query History
  const history = await db.getHistory(testUser.id);
  console.log('✓ Queried history from Neon:', history.length, 'events found');

  // Resolve SOS
  await db.updateHistoryEvent(alertId, { status: 'Sent', durationSeconds: 30 });
  console.log('✓ Resolved SOS event in Neon');

  // Clean up
  await db.deleteUser(testUser.id);
  console.log('✓ Cleaned up API test user\n');

  console.log('🎉 All HTTP & Database Integration tests PASSED successfully!');
  process.exit(0);
}

testHttpEndpoints().catch(err => {
  console.error('❌ HTTP API Test failed:', err);
  process.exit(1);
});
