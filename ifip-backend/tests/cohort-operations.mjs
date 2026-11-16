import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import mongoose from 'mongoose';
import axios from 'axios';

// This harness only uses the disposable replica set documented in REGISTRATION_UNIFIED_VERIFICATION.md.
const database = 'ifip_cohort_test_' + process.pid;
const uri = 'mongodb://127.0.0.1:37117/' + database + '?directConnection=true&replicaSet=ifiptest';
Object.assign(process.env,{NODE_ENV:'test',MONGO_URI:uri,JWT_ACCESS_SECRET:'x'.repeat(32),JWT_REFRESH_SECRET:'y'.repeat(32),APPLICANT_SESSION_SECRET:'a'.repeat(32),SET_PASSWORD_TOKEN_SECRET:'s'.repeat(32),RESET_PASSWORD_TOKEN_SECRET:'r'.repeat(32),CLOUDINARY_CLOUD_NAME:'fixture',CLOUDINARY_API_KEY:'fixture',CLOUDINARY_API_SECRET:'fixture',CLIENT_URL:'http://127.0.0.1:3217',REDIS_URL:'redis://127.0.0.1:1',BREVO_API_KEY:'fixture',EMAIL_FROM:'fixture@example.invalid',FLUTTERWAVE_SECRET_KEY:'fixture',FLUTTERWAVE_CALLBACK_URL:'http://127.0.0.1:3217/verify-payment',FLUTTERWAVE_WEBHOOK_HASH:'fixture-hash',PAYSTACK_SECRET_KEY:'fixture',PAYSTACK_CALLBACK_URL:'http://127.0.0.1:3217/verify-payment',LEVY_AMOUNT_NGN:'20000',LEVY_AMOUNT_USD:'30'});

const sent = [];
const adminEmails = [];
let fail = true;
axios.defaults.adapter = async config => {
  assert.equal(config.baseURL, 'https://api.brevo.com/v3');
  assert.equal(config.url, '/smtp/email');
  const payload = JSON.parse(config.data);
  const email = payload.to[0].email;
  if (payload.subject.startsWith('New cohort created: ')) adminEmails.push({email, payload});
  else sent.push({email, payload});
  if (email === 'retry@example.invalid' && fail) throw new Error('Simulated provider failure');
  return {data:{messageId:'fixture'},status:201,statusText:'Created',headers:{},config};
};
const {createCohort,updateCohort,getDashboardStats,getCohortWaitlistStatus,retryCohortWaitlistDelivery,getPendingApplicants,exportApplicantsCSV}=await import('../src/controllers/adminController.ts');
const {default:cohortRouter}=await import('../src/routes/cohortRoutes.ts');
const {recordHiringOutcome}=await import('../src/controllers/hiringOutcomeController.ts');
const {processCohortWaitlist}=await import('../src/services/cohortWaitlist.ts');
const {Cohort}=await import('../src/models/Cohort.ts');
const {CohortWaitlistDelivery}=await import('../src/models/CohortWaitlistDelivery.ts');
const {Waitlist}=await import('../src/models/Waitlist.ts');
const {Placement}=await import('../src/models/Placement.ts');
const {JobApplication}=await import('../src/models/JobApplication.ts');
const {Application}=await import('../src/models/Application.ts');
const {Applicant}=await import('../src/models/Applicants.ts');
const {Payment}=await import('../src/models/Payments.ts');
const {AuditLog}=await import('../src/models/AuditLog.ts');
const {User}=await import('../src/models/User.ts');
const actor=new mongoose.Types.ObjectId();
const participant=new mongoose.Types.ObjectId();
async function call(fn,request){
 let status=200,body;
 await fn({headers:{},socket:{},user:{id:actor.toString(),role:'admin'},query:{},...request},{
  set(){return this},setHeader(){},status(value){status=value;return this},
  json(value){body=value;return this},send(value){body=value;return this},
 });
 return {status,body};
}
async function waitForAdminEmails(count) {
 for (let i = 0; i < 100 && adminEmails.length < count; i++) await delay(20);
 assert.equal(adminEmails.length, count);
}
try {
 await mongoose.connect(uri,{serverSelectionTimeoutMS:10000});
 await Promise.all([Cohort,CohortWaitlistDelivery,Waitlist,Placement,JobApplication,Application,Applicant,AuditLog,User].map(model=>model.init()));
 const now=Date.now(), day=86400000;
 await User.create([
  {_id:actor,email:'creator@example.invalid',role:'admin'},
  {email:'admin@example.invalid',role:'admin'},
  {email:'superadmin@example.invalid',role:'superadmin'},
  {email:'opt-out@example.invalid',role:'admin',emailNotificationsEnabled:false},
  {email:'partner@example.invalid',role:'partner'},
 ]);
 await Waitlist.create(['first','retry'].map(name=>({email:name+'@example.invalid',createdAt:new Date(now-10000)})));
 const input={name:' New & Cohort ',registrationStartDate:new Date(now-day),registrationEndDate:new Date(now+day),cohortCap:5,notifyWaitlist:true};
 assert.equal((await call(createCohort,{body:{...input,cohortCap:0}})).status,400);
 const created=await call(createCohort,{body:{...input,registrationStartDate:new Date(now+day/2)}});
 assert.equal(created.status,201);
 const cohort=created.body.cohort;
 const params={id:cohort.id};
 assert.equal(cohort.name,'New & Cohort');
 assert.equal(cohort.startDate,undefined);
 assert.equal(cohort.endDate,undefined);
 await waitForAdminEmails(2);
 assert.deepEqual(adminEmails.map(item=>item.email).sort(),['admin@example.invalid','superadmin@example.invalid']);
 const adminEmail=adminEmails[0].payload;
 assert.equal(adminEmail.subject,'New cohort created: New & Cohort | IFIP');
 assert.match(adminEmail.htmlContent,/New &amp; Cohort/);
 assert.match(adminEmail.htmlContent,/Registration opens/);
 assert.match(adminEmail.htmlContent,/Registration closes/);
 assert.match(adminEmail.htmlContent,/To be scheduled/);
 assert.match(adminEmail.htmlContent,/href="[^"]+\/admin"[^>]*>View cohorts in Admin/);
 assert.doesNotMatch(adminEmail.htmlContent,/registration is open/i);
 const registrationStatus=cohortRouter.stack.find(layer=>layer.route?.path==='/registration-status').route.stack[0].handle;
 assert.equal((await call(registrationStatus,{})).body.hasActiveCohort,false);
 await processCohortWaitlist();
 assert.equal(sent.length,0);
 assert.equal((await call(updateCohort,{params,body:{registrationStartDate:input.registrationStartDate}})).status,200);
 const openIntake=await call(registrationStatus,{});
 assert.equal(openIntake.status,200);
 assert.equal(openIntake.body.cohortName,'New & Cohort');
 assert.equal(openIntake.body.cohortStartDate,undefined);
 assert.equal((await call(createCohort,{body:{...input,name:'Overlapping'}})).status,409);
 await Waitlist.create({email:'later@example.invalid',createdAt:new Date(now+5000)});
 await Promise.all([processCohortWaitlist(),processCohortWaitlist()]);
 assert.deepEqual(sent.map(item=>item.email).sort(),['first@example.invalid','retry@example.invalid']);
 const formatDate = date => date.toLocaleDateString('en-NG',{dateStyle:'long',timeZone:'Africa/Lagos'});
 assert.ok(adminEmail.htmlContent.includes(formatDate(new Date(now+day/2))));
 assert.ok(adminEmail.htmlContent.includes(formatDate(input.registrationEndDate)));
 assert.equal(sent[0].payload.subject,'Registration dates for New & Cohort | IFIP');
 assert.ok(sent[0].payload.htmlContent.includes(`Registration is scheduled from ${formatDate(input.registrationStartDate)} to ${formatDate(input.registrationEndDate)}.`));
 assert.match(sent[0].payload.htmlContent,/Check registration availability/);
 assert.doesNotMatch(sent[0].payload.htmlContent,/registration is open|apply now/i);
 assert.match(sent[0].payload.htmlContent,/New &amp; Cohort/);
 assert.match(sent[0].payload.htmlContent,/\/apply/);
 assert.match(sent[0].payload.htmlContent,/training start date will be announced later/);
 assert.deepEqual((await call(getCohortWaitlistStatus,{params})).body,{pending:0,sending:0,sent:1,failed:1});
 fail=false;
 assert.equal((await call(retryCohortWaitlistDelivery,{params})).status,200);
 await processCohortWaitlist();
 assert.deepEqual((await call(getCohortWaitlistStatus,{params})).body,{pending:0,sending:0,sent:2,failed:0});
 assert.equal(sent.filter(item=>item.email==='first@example.invalid').length,1);
 const startDate=new Date(now+2*day);
 assert.equal((await call(updateCohort,{params,body:{startDate:new Date(now)}})).status,400);
 assert.equal((await call(updateCohort,{params,body:{startDate,endDate:new Date(now+day)}})).status,400);
 assert.equal((await call(updateCohort,{params,body:{startDate}})).status,200);
 assert.equal((await call(registrationStatus,{})).body.cohortStartDate,startDate.toISOString());
 assert.equal((await call(updateCohort,{params,body:{endDate:new Date(now+30*day)}})).status,200);
 console.log('PASS optional training dates, open intake before scheduling, and adding dates later');
 console.log('PASS validation, overlapping window, waitlist cutoff, concurrent deduplication, retry and email content');
 const partnerOrgId=new mongoose.Types.ObjectId();
 const placement=await Placement.create({userId:participant,partnerOrgId,status:'interviewing',interviewScheduledAt:new Date(now-day)});
 const job=await JobApplication.create({userId:participant,jobOpeningId:new mongoose.Types.ObjectId(),cvUrl:'https://example.invalid/cv.pdf',status:'offered'});
 for(const [kind,id] of [['placements',placement.id],['job-applications',job.id]]){
   const request={params:{kind,id},body:{status:'hire_confirmed',note:'Fixture acceptance',previousRecordedAt:null}};
   assert.equal((await call(recordHiringOutcome,request)).status,200);
   assert.equal((await call(recordHiringOutcome,request)).status,409);
 }
 const persisted=await Placement.findById(placement.id).lean();
 assert.equal(persisted.hiringOutcome.status,'hire_confirmed');
 assert.equal(persisted.hiringOutcome.note,undefined);
 assert.equal(persisted.hiringOutcome.recordedBy,undefined);
 await Application.collection.insertOne({userId:participant,cohortId:cohort._id,status:'completed'});
 await Applicant.collection.insertOne({email:'draft@example.invalid',cohortId:cohort._id,currentStep:2});
 const stats=await call(getDashboardStats,{query:{cohortId:cohort.id}});
 assert.equal(stats.status,200);
 assert.deepEqual(stats.body.cohortMetrics[cohort.id],{applications:2,enrolled:1,completed:1,hires:1});
 console.log('PASS hiring persistence, stale-write rejection, private notes and cohort metric deduplication');
 assert.equal(adminEmails.length,2);
 const second=await call(createCohort,{body:{
  ...input,name:'Later cohort',registrationStartDate:new Date(now+3*day),registrationEndDate:new Date(now+4*day),
  startDate:new Date(now+5*day),notifyWaitlist:false,
 }});
 assert.equal(second.status,201);
 await waitForAdminEmails(4);
 assert.ok(adminEmails.slice(2).every(item=>item.payload.htmlContent.includes(formatDate(new Date(now+5*day)))));
 console.log('PASS creation emails reach other opted-in admins, independently of waitlist settings');

 const [current, previous, attempted, unmatched, ambiguous, paid] = await Applicant.create([
  {email:'current-draft@example.invalid',country:'Nigeria',currentStep:2,createdAt:new Date(now)},
  {email:'previous-draft@example.invalid',country:'Ghana',currentStep:5,createdAt:new Date(now+3*day)},
  {email:'attempted-draft@example.invalid',country:'Kenya',currentStep:7,cohortId:cohort.id,
   createdAt:new Date(now-40*day),updatedAt:new Date(now-40*day)},
  {email:'unmatched-draft@example.invalid',createdAt:new Date(now-40*day)},
  {email:'ambiguous-draft@example.invalid',createdAt:new Date(now+3.5*day)},
  {email:'paid-draft@example.invalid',isPaid:true,cohortId:cohort.id,createdAt:new Date(now)},
 ]);
 await Cohort.create({name:'Overlapping legacy cohort',registrationStartDate:new Date(now+3.25*day),
  registrationEndDate:new Date(now+3.75*day)});
 await Payment.create({applicantId:attempted._id,providerRef:'pending-cohort-fixture',amount:2500000});
 const pending = await call(getPendingApplicants,{query:{cohortId:cohort.id,limit:'1'}});
 assert.equal(pending.status,200);
 assert.equal(pending.body.total,3);
 assert.equal(pending.body.pages,3);
 assert.equal(pending.body.applicants.length,1);
 assert.equal(pending.body.summary.totalPending,3);
 assert.equal(pending.body.summary.attemptedPaymentCount,1);
 assert.equal(pending.body.summary.inactiveDays30Count,1);
 assert.equal(pending.body.summary.neverRemindedCount,3);
 assert.deepEqual(pending.body.summary.distinctCountries,['Kenya','Nigeria']);
 assert.deepEqual(pending.body.summary.stepBreakdown,{2:2,7:1});
 const filtered = await call(getPendingApplicants,{query:{cohortId:cohort.id,search:'draft',reminderStatus:'never',hasPaymentAttempt:'true'}});
 assert.deepEqual(filtered.body.applicants.map(row=>row.email),[attempted.email]);
 const later = await call(getPendingApplicants,{query:{cohortId:second.body.cohort.id}});
 assert.deepEqual(later.body.applicants.map(row=>row.email),[previous.email]);
 const unassigned = await call(getPendingApplicants,{query:{cohortId:'unassigned'}});
 assert.deepEqual(new Set(unassigned.body.applicants.map(row=>row.email)),new Set([unmatched.email,ambiguous.email]));
 assert.equal((await call(getPendingApplicants,{})).body.total,6);
 assert.equal((await call(getPendingApplicants,{query:{cohortId:'invalid'}})).status,400);
 const csv = await call(exportApplicantsCSV,{query:{type:'unpaid',cohortId:cohort.id}});
 assert.equal(csv.status,200);
 const csvRows = csv.body.split('\r\n').slice(1);
 assert.equal(csvRows.length,3);
 assert.ok(csvRows.some(row=>row.includes(current.email) && row.includes('New & Cohort')));
 assert.ok(csvRows.some(row=>row.includes(attempted.email)));
 assert.ok([previous,unmatched,ambiguous,paid].every(row=>!csv.body.includes(row.email)));
 console.log('PASS cohort-scoped pending rows, summary, filters and CSV, including legacy and overlapping intakes');
} finally {
 if (mongoose.connection.readyState===1) await mongoose.connection.dropDatabase();
 await mongoose.disconnect();
}
