import assert from 'node:assert/strict';
import mongoose from 'mongoose';
const uri = 'mongodb://127.0.0.1:1/ifip_registration_fixture';
Object.assign(process.env,{NODE_ENV:'test',MONGO_URI:uri,JWT_ACCESS_SECRET:'x'.repeat(32),JWT_REFRESH_SECRET:'y'.repeat(32),APPLICANT_SESSION_SECRET:'a'.repeat(32),SET_PASSWORD_TOKEN_SECRET:'s'.repeat(32),RESET_PASSWORD_TOKEN_SECRET:'r'.repeat(32),CLOUDINARY_CLOUD_NAME:'fixture',CLOUDINARY_API_KEY:'fixture',CLOUDINARY_API_SECRET:'fixture',CLIENT_URL:'http://127.0.0.1:3217',REDIS_URL:'redis://127.0.0.1:1',BREVO_API_KEY:'fixture',EMAIL_FROM:'fixture@example.invalid',FLUTTERWAVE_SECRET_KEY:'fixture',FLUTTERWAVE_CALLBACK_URL:'http://127.0.0.1:3217/verify-payment',FLUTTERWAVE_WEBHOOK_HASH:'fixture-hash',PAYSTACK_SECRET_KEY:'fixture',PAYSTACK_CALLBACK_URL:'http://127.0.0.1:3217/verify-payment',LEVY_AMOUNT_NGN:'20000',LEVY_AMOUNT_USD:'30'});
// No database connection or provider calls: model boundaries and OTP delivery are fixtures.
const { Cohort } = await import('../src/models/Cohort.ts');
const { CohortConfig } = await import('../src/models/CohortConfig.ts');
const { Application } = await import('../src/models/Application.ts');
const { Applicant } = await import('../src/models/Applicants.ts');
const { User } = await import('../src/models/User.ts');
const { AuditLog } = await import('../src/models/AuditLog.ts');
const { redisClient } = await import('../src/services/redisService.ts');
const { notificationEmitter } = await import('../src/services/notificationBroadcast.ts');
const { startApplication } = await import('../src/controllers/applicantController.ts');
const { default: router } = await import('../src/routes/cohortRoutes.ts');
const statusHandler = router.stack.find(layer => layer.route?.path === '/registration-status').route.stack[0].handle;
const id = new mongoose.Types.ObjectId();
let cohort, enrolled = 0, reserved = 0, failLookup = false, existingUser = false, existingApplicant = false, redisFailure = false;
let otpWrites = 0, emails = 0;
const query = value => ({ session: async () => value });
Cohort.findOne = filter => {
  assert.equal(filter.status, 'upcoming');
  assert.ok(filter.registrationStartDate.$lte instanceof Date);
  assert.ok(filter.registrationEndDate.$gte instanceof Date);
  if (failLookup) throw new Error('Fixture lookup failure');
  return query(cohort);
};
Cohort.findById = cohortId => { assert.equal(String(cohortId), String(id)); return query(cohort); };
CohortConfig.findOne = async () => ({ cohortCap: 1 }); // Legacy global cap must not gate entry.
Application.countDocuments = filter => {
  assert.equal(String(filter.cohortId), String(id)); // Other cohorts must never be counted.
  assert.deepEqual(filter.status.$in, ['payment_confirmed','active','completed','placement_ready']);
  return query(enrolled);
};
Applicant.countDocuments = filter => {
  assert.equal(String(filter.cohortId), String(id));
  assert.equal(filter.$or[0].isPaid, true);
  assert.ok(filter.$or[1].transferHoldUntil.$gt instanceof Date);
  assert.equal(filter.$or[2].isPaid, false);
  assert.ok(Math.abs(Date.now() - filter.$or[2].checkoutStartedAt.$gte.getTime() - 900000) < 1000);
  return query(reserved);
};
User.findOne = async () => existingUser ? { email: 'applicant@example.invalid' } : null;
Applicant.findOne = async filter => {
  assert.equal(filter.email, 'applicant@example.invalid');
  return existingApplicant ? { email: filter.email, currentStep: 3 } : null;
};
AuditLog.create = async () => ({});
redisClient.set = async () => { if (redisFailure) throw new Error('Fixture Redis failure'); otpWrites++; };
notificationEmitter.removeAllListeners('otp.requested');
notificationEmitter.on('otp.requested', () => { emails++; });
async function call(handler) {
  let status = 200, body;
  await handler({ body: {email:' Applicant@example.invalid '}, headers: {} }, {
    set() { return this; }, status(value) { status=value; return this; },
    json(value) { body=value; return this; },
  });
  return {status,body};
}
async function blocked(code) {
  const before = otpWrites;
  const response = await call(startApplication);
  assert.equal(response.status,403); assert.equal(response.body.code,code);
  assert.equal(otpWrites,before); assert.equal(emails,before);
}
cohort = null;
assert.equal((await call(statusHandler)).body.hasActiveCohort,false);
await blocked('REGISTRATION_CLOSED');
console.log('PASS no current registration window rejects without OTP');
existingApplicant = true;
assert.equal((await call(startApplication)).status,200);
assert.equal(otpWrites,1);
existingApplicant = false;
console.log('PASS saved applicant can request a recovery code after intake closes');
cohort = {_id:id,name:'Current intake',cohortCap:3,registrationEndDate:new Date(Date.now()+86400000)};
enrolled=1;
assert.equal((await call(statusHandler)).body.isFull,false);
assert.equal((await call(startApplication)).status,200);
assert.equal(otpWrites,2); assert.equal(emails,2);
console.log('PASS current cohort capacity overrides legacy global cap and excludes other cohorts');
enrolled=3;
assert.equal((await call(statusHandler)).body.isFull,true);
await blocked('COHORT_FULL');
existingApplicant = true;
assert.equal((await call(startApplication)).status,200);
assert.equal(otpWrites,3);
existingApplicant = false;
enrolled=1;reserved=2;
assert.equal((await call(statusHandler)).body.isFull,true);
await blocked('COHORT_FULL');
console.log('PASS enrollment and reserved capacity agree between endpoints');
reserved=0;
existingUser=true;
assert.equal((await call(startApplication)).body.code,'EMAIL_ALREADY_REGISTERED');
existingUser=false;
failLookup=true;
assert.equal((await call(startApplication)).status,503);
assert.equal((await call(statusHandler)).status,500);
failLookup=false;
redisFailure=true;
assert.equal((await call(startApplication)).status,503);
assert.equal(otpWrites,3); assert.equal(emails,3);
console.log('PASS registered email, database failure and Redis failure do not issue OTP');
