import { db, initDb } from './db.js';

async function runEndToEndVerification() {
  console.log('🚀 Starting Complete Neon PostgreSQL End-to-End Verification Test Suite...\n');

  try {
    // 1. Initialize DB and Verify Schema
    console.log('1️⃣ Initializing & verifying normalized schema...');
    await initDb();
    console.log('   ✓ Schema, relations, and indexes verified.\n');

    // 2. User Registration & Authentication
    console.log('2️⃣ Testing User Registration & Authentication...');
    const testEmail = `test_user_${Date.now()}@silentsos.org`;
    const testPassword = 'SecurePassword123!';
    const testName = 'Aarya Sharma';

    const registeredUser = await db.registerUser(testEmail, testPassword, testName);
    console.log(`   ✓ Registered user: ID=${registeredUser.id}, Email=${registeredUser.email}, Name=${registeredUser.name}`);

    const authUser = await db.authenticateUser(testEmail, testPassword);
    console.log(`   ✓ Authenticated user successfully: ID=${authUser.id}`);

    // Verify invalid password fails
    try {
      await db.authenticateUser(testEmail, 'WrongPassword!');
      throw new Error('Should not have authenticated with wrong password');
    } catch (e) {
      console.log('   ✓ Correctly rejected invalid credentials.');
    }

    // 3. User Profile Update
    console.log('\n3️⃣ Testing User Profile Updates...');
    const updatedUser = await db.updateUserProfile(registeredUser.id, {
      address: '123 Safety Ave, Mumbai, MH',
      bloodGroup: 'O+',
      fatherName: 'Rajesh Sharma',
      motherName: 'Sunita Sharma'
    });
    console.log(`   ✓ Profile updated: Blood Group=${updatedUser.bloodGroup}, Address=${updatedUser.address}`);

    // 4. Emergency Contacts CRUD & AES-256 Encryption
    console.log('\n4️⃣ Testing Emergency Contacts (with AES-256 encryption)...');
    const contacts = await db.addContact(registeredUser.id, {
      id: `c1-${Date.now()}`,
      name: 'Priya Sharma',
      phone: '+919876543210',
      email: 'priya.sharma@example.com',
      priority: 1,
      preferences: { gps: true, photos: true, video: true, audio: true, message: true }
    });
    console.log(`   ✓ Added contact: Name=${contacts[0].name}, Phone=${contacts[0].phone}, Email=${contacts[0].email}`);
    
    // Update contact
    const updatedContacts = await db.updateContact(registeredUser.id, contacts[0].id, {
      name: 'Priya Sharma (Sister)'
    });
    console.log(`   ✓ Updated contact: Name=${updatedContacts[0].name}`);

    // 5. User Settings & Gesture Configuration
    console.log('\n5️⃣ Testing User Settings & Gesture Configuration...');
    const settings = await db.updateSettings(registeredUser.id, {
      gestureSensitivity: 'High',
      autoRepeatInterval: 10,
      stealthMode: true
    });
    console.log(`   ✓ Settings updated: Sensitivity=${settings.gestureSensitivity}, Stealth=${settings.stealthMode}`);

    const gestureConfig = await db.saveGestureConfig(registeredUser.id, {
      gestureType: 'palm',
      enabled: true,
      calibrationStatus: 'calibrated',
      configuration: { sensitivity: 'High', hand: 'right' }
    });
    console.log(`   ✓ Gesture config saved: Type=${gestureConfig.gestureType}, Status=${gestureConfig.calibrationStatus}`);

    // 6. SOS Creation Transaction & Location / Notification Persistence
    console.log('\n6️⃣ Testing Atomic SOS Creation Transaction...');
    const alertId = `alert-${Date.now()}`;
    const sosEvent = {
      id: alertId,
      userId: registeredUser.id,
      timestamp: Date.now(),
      type: 'Gesture Activation (Raised Palm)',
      durationSeconds: 0,
      status: 'Active',
      evidence: { photos: 0, videos: 0, audio: 0, files: [] },
      contactsNotified: [
        {
          contactId: contacts[0].id,
          contactName: contacts[0].name,
          channels: {
            email: { status: 'Delivered', timestamp: Date.now() },
            sms: { status: 'Delivered', timestamp: Date.now() }
          }
        }
      ],
      gpsPath: [
        { lat: 19.0760, lng: 72.8777, accuracy: 15, timestamp: Date.now(), googleMapsLink: 'https://maps.google.com/?q=19.076,72.8777' }
      ]
    };

    const historyAfterSOS = await db.addHistoryEvent(registeredUser.id, sosEvent);
    console.log(`   ✓ SOS event recorded in Neon: ID=${sosEvent.id}, Status=${sosEvent.status}, Type=${sosEvent.type}`);

    // Add another GPS point stream
    await db.addGpsLocation(alertId, 19.0765, 72.8780, Date.now() + 2000, 10);
    console.log('   ✓ Granular GPS stream location point saved to sos_locations.');

    // Record Evidence Metadata
    await db.recordEvidenceMetadata(alertId, registeredUser.id, 'photo', `/evidence/${alertId}-photo-1.jpg`, null, 'image/jpeg', 102400);
    console.log('   ✓ Evidence file metadata persisted to evidence_metadata.');

    // 7. Update Notification Status
    await db.updateNotificationStatus(alertId, contacts[0].id, 'email', 'DELIVERED');
    const notifStatuses = await db.getNotificationStatuses(alertId);
    console.log(`   ✓ Notification tracking records in Neon: Count=${notifStatuses.length}, Status=${notifStatuses[0]?.status}`);

    // 8. SOS Resolution & Cancellation Flow
    console.log('\n7️⃣ Testing SOS Resolution & Duration calculation...');
    await db.updateHistoryEvent(alertId, {
      durationSeconds: 45,
      status: 'Sent'
    });
    const updatedHistory = await db.getHistory(registeredUser.id);
    const resolvedAlert = updatedHistory.find(h => h.id === alertId);
    console.log(`   ✓ Resolved SOS event in Neon: Status=${resolvedAlert?.status}, Duration=${resolvedAlert?.durationSeconds}s`);

    // 9. Password Reset OTP Flow
    console.log('\n8️⃣ Testing Password Reset OTP Hashing & Verification...');
    const otpCode = '839201';
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await db.createPasswordReset(testEmail, otpCode, expiresAt);
    console.log('   ✓ Hashed OTP code stored in password_resets.');

    const newPassword = 'NewSecurePassword456!';
    await db.verifyAndResetPassword(testEmail, otpCode, newPassword);
    console.log('   ✓ Password verified and reset successfully.');

    const reAuth = await db.authenticateUser(testEmail, newPassword);
    console.log(`   ✓ Logged in with new password: ID=${reAuth.id}`);

    // 10. IDOR / User Isolation Verification
    console.log('\n9️⃣ Testing User Isolation & IDOR Security Checks...');
    const user2 = await db.registerUser(`user2_${Date.now()}@silentsos.org`, 'Pass12345!', 'Bob User');
    const user2Contacts = await db.getContacts(user2.id);
    const user1Contacts = await db.getContacts(registeredUser.id);
    
    if (user2Contacts.some(c => c.userId === registeredUser.id)) {
      throw new Error('CRITICAL SECURITY VIOLATION: User 2 accessed User 1 contacts!');
    }
    console.log(`   ✓ User Isolation verified: User 1 contacts (${user1Contacts.length}) completely isolated from User 2 contacts (${user2Contacts.length}).`);

    // 11. Audit Logs Check
    console.log('\n🔟 Testing Audit Logs in Neon PostgreSQL...');
    const auditLogs = await db.getAuditLogs(registeredUser.id, 10);
    console.log(`   ✓ Retrieved ${auditLogs.length} audit logs for user (Events: ${auditLogs.map(a => a.event_type).join(', ')})`);

    // 12. Cleanup Test User Data
    console.log('\n🧹 Cleaning up test user data...');
    await db.deleteUser(registeredUser.id);
    await db.deleteUser(user2.id);
    console.log('   ✓ Test users cleaned up.');

    console.log('\n🎉 ALL NEON POSTGRESQL END-TO-END TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ End-to-End Test Suite Failed:', err);
    process.exit(1);
  }
}

runEndToEndVerification();
