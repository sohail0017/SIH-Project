import 'dotenv/config';
import {
  collection,
  getTableRecords,
  insertTableRecord,
  updateTableRecord,
  deleteTableRecord,
  logActivity,
  getLogs,
  seedDatabase,
} from '../server/db.ts';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../server/auth.ts';

console.log('================================================================');
console.log('SkillTrack Full-Stack Verification Suite');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  // Ensure database seed data is loaded
  await seedDatabase(true);

  const usersCol = collection('users');

  // Seed default admin and citizen if not present
  let admin = await usersCol.findOne({ email: 'admin@skilltrack.gov.in' });
  if (!admin) {
    await usersCol.insertOne({
      id: 'USR-ADMIN-001',
      fullName: 'State Skill Administrator',
      email: 'admin@skilltrack.gov.in',
      passwordHash: hashPassword('Admin@12345'),
      role: 'admin',
      district: 'Mumbai City',
      phone: '+91 22 2202 5221',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    admin = await usersCol.findOne({ email: 'admin@skilltrack.gov.in' });
  }

  let citizen = await usersCol.findOne({ email: 'citizen@skilltrack.gov.in' });
  if (!citizen) {
    await usersCol.insertOne({
      id: 'USR-CITIZEN-001',
      fullName: 'Ramesh Narayan Deshmukh',
      email: 'citizen@skilltrack.gov.in',
      passwordHash: hashPassword('Citizen@12345'),
      role: 'user',
      district: 'Pune',
      phone: '+91 98220 12345',
      traineeId: 'TR-1001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    citizen = await usersCol.findOne({ email: 'citizen@skilltrack.gov.in' });
  }

  // 1. Test Database Seeding & Schema
  console.log('--- 1. Database Integrity ---');
  const trainees = await getTableRecords('trainees');
  const employees = await getTableRecords('employees');
  const programs = await getTableRecords('trainingPrograms');
  const providers = await getTableRecords('providers');
  const employers = await getTableRecords('employers');
  const skills = await getTableRecords('skills');
  const followups = await getTableRecords('followups');

  assert(trainees.length >= 2000, `Trainees table populated with ${trainees.length} records (>= 2000)`);
  assert(employees.length >= 1700, `Employees table populated with ${employees.length} records (>= 1700)`);
  assert(programs.length === 12, `Training programs present: ${programs.length} (expected 12)`);
  assert(providers.length === 8, `Training providers present: ${providers.length} (expected 8)`);
  assert(employers.length === 19, `Employers present: ${employers.length} (expected 19)`);
  assert(skills.length === 12, `Skills present: ${skills.length} (expected 12)`);
  assert(followups.length > 0, `Followups queue active: ${followups.length} entries`);

  // 2. Test User Accounts & Roles
  console.log('\n--- 2. User Accounts & RBAC ---');
  const users = await usersCol.find({}).toArray();
  assert(users.length >= 2, `Users collection has ${users.length} accounts`);

  const foundAdmin = users.find((u) => u.role === 'admin');
  assert(!!foundAdmin && foundAdmin.email === 'admin@skilltrack.gov.in', `Admin account verified: ${foundAdmin?.email}`);

  const foundCitizen = users.find((u) => u.role === 'user');
  assert(!!foundCitizen && foundCitizen.email === 'citizen@skilltrack.gov.in', `Citizen demo account verified: ${foundCitizen?.email}`);

  // 3. Test Password Hashing & Bcrypt
  console.log('\n--- 3. Password Security & Bcrypt ---');
  const testPlain = 'Maharashtra@2026';
  const hashed = hashPassword(testPlain);
  assert(hashed.startsWith('$2'), 'Bcrypt hash generated with $2 format');
  assert(comparePassword(testPlain, hashed), 'Correct password matches hash');
  assert(!comparePassword('WrongPassword123', hashed), 'Incorrect password safely rejected');

  // Verify pre-seeded admin password
  const adminRow = await usersCol.findOne({ email: 'admin@skilltrack.gov.in' });
  assert(comparePassword('Admin@12345', adminRow.passwordHash), 'Admin default password (Admin@12345) matches hash');

  // Verify pre-seeded citizen password
  const citizenRow = await usersCol.findOne({ email: 'citizen@skilltrack.gov.in' });
  assert(comparePassword('Citizen@12345', citizenRow.passwordHash), 'Citizen default password (Citizen@12345) matches hash');

  // 4. Test JWT Generation & Verification
  console.log('\n--- 4. JWT Authentication & Sessions ---');
  const tokenPayload = {
    id: citizen.id,
    email: citizen.email,
    fullName: citizen.fullName,
    role: citizen.role,
    district: citizen.district,
  };
  const token = generateToken(tokenPayload);
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token formatted correctly (header.payload.sig)');

  const verified = verifyToken(token);
  assert(verified !== null && verified.email === citizen.email, 'JWT token decoded and verified successfully');
  assert(verified.role === 'user', 'User role preserved in JWT payload');

  const invalidVerified = verifyToken('invalid.token.here');
  assert(invalidVerified === null, 'Malformed JWT token safely rejected');

  // 5. Test Trainee CRUD & Database Persistence
  console.log('\n--- 5. Trainee CRUD Operations ---');
  const testTraineeId = `ST-TEST-${Date.now()}`;
  const testTrainee = {
    id: testTraineeId,
    fullName: 'Ananya Ramesh Deshmukh',
    gender: 'Female',
    age: 22,
    phone: '+91 98201 11222',
    email: 'ananya.deshmukh@maha-test.in',
    district: 'Kolhapur',
    division: 'Pune',
    category: 'General',
    education: 'Diploma in Mechatronics',
    trainingYear: '2024-25',
    programId: 'prog_cnc_machinist',
    providerId: 'prov_iti_pune',
    batchId: 'B-24-TEST',
    enrolmentDate: '2024-08-01',
    consentStatus: 'granted',
    consentDate: '2024-08-01',
    completionDate: '2025-01-15',
    certificationDate: '2025-01-20',
    nsqfLevel: 4,
    attendanceRate: 94,
    assessmentScore: 88,
    skillRatings: [{ skill: 'Precision Turning', score: 88 }],
  };

  // CREATE
  await insertTableRecord('trainees', testTrainee);
  const readRecordsAfterInsert = await getTableRecords('trainees');
  const foundCreated = readRecordsAfterInsert.find((r) => r.id === testTraineeId);
  assert(!!foundCreated, `CREATE: Trainee ${testTraineeId} successfully inserted`);
  assert(foundCreated?.fullName === 'Ananya Ramesh Deshmukh', 'CREATE: Trainee full name matches');

  // READ
  assert(foundCreated?.district === 'Kolhapur', 'READ: Trainee retrieved with correct district');

  // UPDATE
  const updatedResult = await updateTableRecord('trainees', testTraineeId, {
    fullName: 'Ananya Ramesh Deshmukh-Patil',
    district: 'Satara',
    assessmentScore: 92,
  });
  assert(updatedResult !== null, 'UPDATE: Trainee record updated');
  assert(updatedResult.fullName === 'Ananya Ramesh Deshmukh-Patil', 'UPDATE: Trainee name updated');
  assert(updatedResult.district === 'Satara', 'UPDATE: District updated to Satara');

  // Verify persistence
  const readRecordsAfterUpdate = await getTableRecords('trainees');
  const foundUpdated = readRecordsAfterUpdate.find((r) => r.id === testTraineeId);
  assert(foundUpdated?.assessmentScore === 92, 'UPDATE PERSISTENCE: Assessment score 92 verified');

  // DELETE
  const deleteSuccess = await deleteTableRecord('trainees', testTraineeId);
  assert(deleteSuccess, 'DELETE: Trainee deleted from datastore');
  const readRecordsAfterDelete = await getTableRecords('trainees');
  const foundDeleted = readRecordsAfterDelete.find((r) => r.id === testTraineeId);
  assert(!foundDeleted, 'DELETE PERSISTENCE: Trainee completely absent from datastore');

  // 6. Test Activity / Audit Logging
  console.log('\n--- 6. System Audit Logging ---');
  logActivity('TEST_ACTION', 'VERIFICATION', 'TEST-001', 'Automated test audit log entry', admin.id, admin.fullName);
  // Wait brief tick for async log
  await new Promise((r) => setTimeout(r, 50));
  const recentLogs = await getLogs(5);
  assert(recentLogs.length > 0, `Audit log returns ${recentLogs.length} entries`);
  assert(recentLogs.some((l) => l.action === 'TEST_ACTION'), 'Audit log contains TEST_ACTION entry');

  // Summary
  console.log('\n================================================================');
  console.log(`Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test failure:', e);
  process.exit(1);
});
