import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import axios from 'axios';

// This harness only uses the disposable replica set documented in REGISTRATION_UNIFIED_VERIFICATION.md.
const database = 'ifip_registration_test_' + process.pid;
const uri = 'mongodb://127.0.0.1:37117/' + database + '?directConnection=true&replicaSet=ifiptest';
Object.assign(process.env,{NODE_ENV:'test',MONGO_URI:uri,JWT_ACCESS_SECRET:'x'.repeat(32),JWT_REFRESH_SECRET:'y'.repeat(32),APPLICANT_SESSION_SECRET:'a'.repeat(32),SET_PASSWORD_TOKEN_SECRET:'s'.repeat(32),RESET_PASSWORD_TOKEN_SECRET:'r'.repeat(32),CLOUDINARY_CLOUD_NAME:'fixture',CLOUDINARY_API_KEY:'fixture',CLOUDINARY_API_SECRET:'fixture',CLIENT_URL:'http://127.0.0.1:3217',REDIS_URL:'redis://127.0.0.1:1',BREVO_API_KEY:'fixture',EMAIL_FROM:'fixture@example.invalid',FLUTTERWAVE_SECRET_KEY:'fixture',FLUTTERWAVE_CALLBACK_URL:'http://127.0.0.1:3217/verify-payment',FLUTTERWAVE_WEBHOOK_HASH:'fixture-hash',PAYSTACK_SECRET_KEY:'fixture',PAYSTACK_CALLBACK_URL:'http://127.0.0.1:3217/verify-payment'});

process.env.PAYMENT_PRIMARY_PROVIDER = 'flutterwave';
process.env.PAYMENT_FLUTTERWAVE_FALLBACK = 'true';
process.env.BANK_TRANSFER_ACCOUNT_NUMBER = '00001234';
delete process.env.PAYSTACK_WEBHOOK_SECRET;
let initializeCalls=0, initializationHook, verificationHook, paystackInitialize, paystackRequests=[];
const transactions=new Map();
const paystackTransactions=new Map();
axios.defaults.adapter=async config=>{
 const url=config.url || '';
 const reply=(data)=>({data,status:200,statusText:'OK',headers:{},config});
 if(config.baseURL==='https://api.paystack.co'){
  if(url==='/transaction/initialize'){
   const input=JSON.parse(config.data);
   paystackRequests.push(input);
   await paystackInitialize?.(input,config);
   return reply({status:true,data:{reference:input.reference,authorization_url:'https://checkout.paystack.com/'+input.reference}});
  }
  const reference=url.split('/').at(-1);
  return reply({status:true,data:paystackTransactions.get(reference) ?? {reference,status:'pending'}});
 }
 if(config.baseURL!=='https://api.flutterwave.com/v3')throw Error('Unexpected external request');
 if(url==='/payments'){
  initializeCalls++;
  const payload=JSON.parse(config.data);
  if(initializationHook) await initializationHook(payload);
  return reply({status:'success',data:{link:'https://checkout.example.invalid/'+payload.tx_ref}});
 }
 if(url.startsWith('/transactions/')){
  const reference=url.includes('?tx_ref=')?url.split('?tx_ref=')[1]:url.split('/')[2];
  if(verificationHook)await verificationHook(reference);
  const data=transactions.get(reference)??{id:99,tx_ref:reference,status:'pending',amount:25000,currency:'NGN'};
  return reply({status:'success',data});
 }
 throw Error('Unexpected provider path');
};

const {notificationEmitter}=await import('../src/services/notificationBroadcast.ts');
notificationEmitter.removeAllListeners();
let submittedEvents=0;
notificationEmitter.on('application.submitted',()=>submittedEvents++);
const {initiatePayment,getPaymentStatus,handleFlutterwaveWebhook,handlePaystackWebhook}=await import('../src/controllers/paymentController.ts');
const {env}=await import('../src/config/env.ts');
const {getMyBankTransfer,submitApplicantTransferProof,attachEmailedTransferProof,approveBankTransfer,reviewBankTransfer,downloadTransferReceipt}=await import('../src/controllers/bankTransferController.ts');
const {submitApplication}=await import('../src/controllers/applicantController.ts');
const {signPollingToken}=await import('../src/utils/jwt.ts');
const {Applicant}=await import('../src/models/Applicants.ts');
const {Application}=await import('../src/models/Application.ts');
const {Cohort}=await import('../src/models/Cohort.ts');
const {Coupon}=await import('../src/models/Coupon.ts');
const {Payment}=await import('../src/models/Payments.ts');
const {User}=await import('../src/models/User.ts');
const {AuditLog}=await import('../src/models/AuditLog.ts');
const models=[Applicant,Application,Cohort,Coupon,Payment,User,AuditLog];
const begin=(applicant,couponCode)=>call(initiatePayment,{applicant:{id:applicant.id},body:{couponCode}});
const verify=(ref)=>call(getPaymentStatus,{params:{reference:ref},query:{token:signPollingToken(ref)}});
const webhook=(ref)=>call(handleFlutterwaveWebhook,{headers:{'verif-hash':'fixture-hash'},body:{event:'charge.completed',data:{tx_ref:ref,id:ref,status:'successful'}}});
function paystackWebhook(reference, signed=true, timestamp=Math.floor(Date.now()/1000)) {
 const body={event:'charge.success',data:{reference}};
 const rawBody=Buffer.from(JSON.stringify(body));
 const key=env.PAYSTACK_WEBHOOK_SECRET || env.PAYSTACK_SECRET_KEY;
 const hmac=createHmac('sha512',key);
 if(env.PAYSTACK_WEBHOOK_SECRET)hmac.update(timestamp+'.');
 const signature=signed ? hmac.update(rawBody).digest('hex') : 'invalid';
 const headers=env.PAYSTACK_WEBHOOK_SECRET ? {'paystack-signature':`t=${timestamp},v1=whk_fixture:${signature}`} : {'x-paystack-signature':signature};
 return call(handlePaystackWebhook,{get:name=>headers[name],rawBody,body});
}
const submit=(applicant)=>call(submitApplication,{applicant:{id:applicant.id},headers:{},socket:{}});
async function call(handler,request){
 let status=200,body;
 const res={set(){return this},type(){return this},status(value){status=value;return this},json(value){body=value;return this},send(value){body=value;return this},end(){return this}};
 try{await handler(request,res);return {status,body}}catch(e){if(e.statusCode)return {status:e.statusCode,body:{message:e.message}};throw e}
}
let index=0;
async function seed(cap=4){
 await Promise.all(models.map(model=>model.deleteMany({})));
 initializeCalls=0;initializationHook=undefined;verificationHook=undefined;transactions.clear();submittedEvents=0;
 paystackInitialize=undefined;paystackRequests=[];paystackTransactions.clear();
 await Cohort.create({name:'Fixture cohort',startDate:new Date(Date.now()+86400000),endDate:new Date(Date.now()+2*86400000),status:'upcoming',registrationStartDate:new Date(Date.now()-86400000),registrationEndDate:new Date(Date.now()+86400000),cohortCap:cap});
}
const applicant=()=>Applicant.create({email:'race-'+(++index)+'@example.invalid',emailVerified:true,fullName:'Fixture Applicant',phone:'+2348000000000',dob:new Date('2000-02-01'),gender:'Female',country:'Nigeria',stateCity:'Lagos',academicInfo:{status:'Graduate',institution:'Fixture university',fieldOfStudy:'Finance'},programInterest:{primary:['Banking']},motivation:{whyApplying:'To study ethical finance',careerGoals:'Work in ethical finance'},cvUrl:'https://example.invalid/cv.pdf',currentStep:6,levyAcknowledged:true,declaration:{confirmed:true,signature:'Fixture Applicant',date:new Date()}});
const coupon=(discountPercent,maxUses=1)=>Coupon.create({code:'FIXTURE',discountPercent,maxUses,expiredMessage:'Fixture code expired',expiresAt:new Date(Date.now()+86400000)});
const success=(ref,amount=25000)=>transactions.set(ref,{id:99,tx_ref:ref,status:'successful',amount,currency:'NGN'});
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
try{
 await mongoose.connect(uri,{serverSelectionTimeoutMS:12000});
 await Promise.all(models.map(model=>model.init()));
 await test('same draft concurrently gets one payment and one provider call',async()=>{
  await seed();const a=await applicant();initializationHook=()=>wait(100);
  const results=await Promise.all([begin(a),begin(a),begin(a)]);
  assert.ok(results.every(r=>r.status===200));
  assert.equal(new Set(results.map(r=>r.body.reference)).size,1);
  assert.equal(initializeCalls,1);assert.equal(await Payment.countDocuments(),1);
  assert.ok((await begin(a)).body.authorizationUrl);
 });
 await test('last seat is allocated to one of two concurrent checkouts',async()=>{
  await seed(1);const [a,b]=await Promise.all([applicant(),applicant()]);
  const outcomes=await Promise.all([begin(a),begin(b)]);
  assert.deepEqual(outcomes.map(x=>x.status).sort(),[200,400]);
  assert.match(outcomes.find(x=>x.status===400).body.message,/capacity limit/);
  assert.equal(initializeCalls,1);
 });
 await test('last limited-use coupon is allocated once, including in-flight hosted checkout',async()=>{
  await seed();const promo=await coupon(25);const [a,b]=await Promise.all([applicant(),applicant()]);
  const outcomes=await Promise.all([begin(a,promo.code),begin(b,promo.code)]);
  assert.deepEqual(outcomes.map(x=>x.status).sort(),[200,400]);
  assert.match(outcomes.find(x=>x.status===400).body.message,/maximum usage/);
  assert.equal(await Payment.countDocuments({couponId:promo._id}),1);
 });
 await test('waiver replay returns one application and consumes one coupon use',async()=>{
  await seed();const a=await applicant(),promo=await coupon(100);
  const outcomes=await Promise.all([begin(a,promo.code),begin(a,promo.code)]);
  assert.ok(outcomes.every(x=>x.body.bypassPayment&&x.body.setPasswordToken));
  assert.equal(new Set(outcomes.map(x=>x.body.reference)).size,1);
  assert.equal((await Coupon.findById(promo._id)).usedCount,1);
  assert.equal(await Application.countDocuments(),1);assert.equal(await User.countDocuments(),1);
  assert.equal(await Applicant.countDocuments(),0);assert.equal(submittedEvents,1);assert.equal(initializeCalls,0);
 });
 await test('polling and duplicate webhooks finalize once, with one coupon consumption and setup handoff',async()=>{
  await seed();const a=await applicant(),promo=await coupon(25);
  const ref=(await begin(a,promo.code)).body.reference;success(ref,15000);
  let ready=0;let release;const together=new Promise(r=>release=r);
  verificationHook=async()=>{if(++ready===3)release();await Promise.race([together,wait(2000)])};
  const [polled,w1,w2]=await Promise.all([verify(ref),webhook(ref),webhook(ref)]);
  assert.equal(polled.body.status,'success');assert.ok(polled.body.setPasswordToken);
  assert.equal(w1.status,200);assert.equal(w2.status,200);
  assert.equal((await Coupon.findById(promo._id)).usedCount,1);
  assert.equal(await Application.countDocuments(),1);assert.equal(await User.countDocuments(),1);
  assert.equal(await Applicant.countDocuments(),0);assert.equal(submittedEvents,1);
  assert.ok((await Payment.findOne({providerRef:ref})).applicationId);
  assert.equal((await submit(a)).status,200);assert.equal(submittedEvents,1);
 });
 await test('ambiguous provider creation retains one reference and can recover a late success',async()=>{
  await seed();const a=await applicant();initializationHook=()=>{throw Error('Fixture transport failure')};
  const first=await begin(a),retry=await begin(a);
  assert.equal(first.body.reference,retry.body.reference);assert.ok(retry.body.pollingToken);
  assert.equal(retry.body.authorizationUrl,undefined);assert.equal(initializeCalls,1);
  assert.equal((await verify(first.body.reference)).body.status,'pending');
  success(first.body.reference);
  assert.equal((await verify(first.body.reference)).body.status,'success');
  assert.equal(await Application.countDocuments(),1);
 });
 await test('failed enrollment transaction rolls back partial writes and a later check resumes',async()=>{
  await seed();const a=await applicant();const ref=(await begin(a)).body.reference;success(ref);
  const create=Application.create;Application.create=async()=>{throw Error('Fixture enrollment write failure')};
  try{const first=await verify(ref);assert.equal(first.body.status,'success');assert.equal(first.body.setPasswordToken,undefined)}finally{Application.create=create}
  assert.equal(await Application.countDocuments(),0);assert.equal(await User.countDocuments(),0);
  assert.equal((await Applicant.findById(a._id)).isPaid,true);
  const second=await verify(ref);assert.ok(second.body.setPasswordToken);
  assert.equal(await Application.countDocuments(),1);assert.equal(submittedEvents,1);
 });
 await test('a provider-confirmed failed attempt allows a new checkout',async()=>{
  await seed();const a=await applicant();
  const first=(await begin(a)).body.reference;
  transactions.set(first,{id:99,tx_ref:first,status:'failed',amount:25000,currency:'NGN'});
  assert.equal((await verify(first)).body.status,'failed');
  const second=(await begin(a)).body.reference;
  assert.notEqual(first,second);assert.equal(initializeCalls,2);
 });
 await test('completed checkout does not issue another setup token after a password is set',async()=>{
  await seed();const a=await applicant();const ref=(await begin(a)).body.reference;success(ref);
  assert.ok((await verify(ref)).body.setPasswordToken);
  await User.updateOne({email:a.email},{$set:{passwordHash:'fixture-hash'}});
  assert.equal((await verify(ref)).body.setPasswordToken,undefined);
  assert.equal((await submit(a)).body.setPasswordToken,undefined);
  assert.equal(await Application.countDocuments(),1);
 });
 env.PAYMENT_PRIMARY_PROVIDER='paystack';
 await test('Paystack uses minor units and finalizes a discounted levy once through webhook and polling',async()=>{
  await seed();const a=await applicant(),promo=await coupon(25);
  const starts=await Promise.all([begin(a,promo.code),begin(a,promo.code)]);
  const ref=starts[0].body.reference;
  assert.ok(starts.every(start=>start.body.reference===ref));
  assert.equal(paystackRequests.length,1);assert.equal(initializeCalls,0);
  assert.equal(paystackRequests[0].amount,'1875000');assert.equal(paystackRequests[0].currency,'NGN');
  assert.match((await begin(a)).body.authorizationUrl,/checkout\.paystack\.com/);
  paystackTransactions.set(ref,{reference:'wrong',status:'success',amount:1875000,currency:'NGN'});
  assert.equal((await verify(ref)).body.status,'pending');
  paystackTransactions.set(ref,{reference:ref,status:'success',amount:1875000,currency:'USD'});
  assert.equal((await verify(ref)).body.status,'pending');
  paystackTransactions.set(ref,{reference:ref,status:'success',amount:1875001,currency:'NGN'});
  assert.equal((await verify(ref)).body.status,'pending');
  assert.equal((await Payment.findOne({providerRef:ref})).reconciliationReason,'verification_mismatch');
  assert.equal(await Application.countDocuments(),0);
  paystackTransactions.set(ref,{reference:ref,status:'success',amount:1875000,currency:'NGN'});
  assert.equal((await paystackWebhook(ref,false)).status,401);
  assert.equal(await Application.countDocuments(),0);
  const outcomes=await Promise.all([verify(ref),paystackWebhook(ref),paystackWebhook(ref)]);
  assert.ok(outcomes.every(outcome=>outcome.status===200));
  assert.equal(await Application.countDocuments(),1);
  assert.equal((await Coupon.findById(promo._id)).usedCount,1);
  assert.equal((await Payment.findOne({providerRef:ref})).webhookVerified,true);
  assert.equal((await Payment.findOne({providerRef:ref})).reconciliationReason,undefined);
 });
 await test('confirmed Paystack rejection creates one Flutterwave replacement and isolates any late charge',async()=>{
  await seed();const a=await applicant(),promo=await coupon(25,1);
  paystackInitialize=(_input,config)=>{throw new axios.AxiosError('Fixture rejection',undefined,config,undefined,{status:401})};
  await Promise.all([begin(a,promo.code),begin(a,promo.code),begin(a,promo.code)]);
  const pending=await Payment.findOne({status:'pending'});
  const retired=await Payment.findOne({status:'failed'});
  assert.equal(paystackRequests.length,1);assert.equal(initializeCalls,1);
  assert.equal(pending.provider,'flutterwave');assert.equal(pending.fallbackFromRef,retired.providerRef);
  assert.equal(pending.amount,retired.amount);assert.equal(String(pending.couponId),String(promo._id));
  assert.equal((await begin(await applicant(),promo.code)).status,400);
  paystackTransactions.set(retired.providerRef,{reference:retired.providerRef,status:'success',amount:retired.amount,currency:'NGN'});
  assert.equal((await paystackWebhook(retired.providerRef)).status,200);
  assert.equal((await Payment.findById(retired.id)).reconciliationReason,'late_success');
  assert.equal(await Application.countDocuments(),0);
  success(pending.providerRef,15000);
  assert.equal((await verify(pending.providerRef)).body.status,'success');
  assert.equal((await Coupon.findById(promo._id)).usedCount,1);
 });
 await test('Paystack initialization timeout and abandoned checkout retain the original reference',async()=>{
  await seed();const a=await applicant();
  paystackInitialize=()=>{throw new axios.AxiosError('Fixture timeout','ECONNABORTED')};
  const first=await begin(a),retry=await begin(a);
  const ref=first.body.reference;
  assert.equal(retry.body.reference,ref);assert.equal(first.body.authorizationUrl,undefined);
  assert.equal(paystackRequests.length,1);assert.equal(initializeCalls,0);
  paystackTransactions.set(ref,{reference:ref,status:'abandoned',amount:2500000,currency:'NGN'});
  assert.equal((await verify(ref)).body.status,'pending');
  assert.equal((await begin(a)).body.reference,ref);
  env.PAYSTACK_WEBHOOK_SECRET='whsec_fixture';
  try {
   assert.equal((await paystackWebhook(ref,true,Math.floor(Date.now()/1000)-600)).status,401);
   assert.equal((await paystackWebhook(ref)).status,503);
   paystackTransactions.set(ref,{reference:ref,status:'success',amount:2500000,currency:'NGN'});
   assert.equal((await paystackWebhook(ref)).status,200);
  }finally{delete env.PAYSTACK_WEBHOOK_SECRET}
  assert.equal(await Application.countDocuments(),1);
 });
 const transferDate = new Date().toISOString().slice(0,10);
 const receipt = Buffer.from('%PDF-1.7\nfixture receipt');
 const asAdmin = {user:{id:String(new mongoose.Types.ObjectId()),role:'admin'},headers:{},socket:{}};
 const foreign = async () => {
  const draft = await applicant();
  await Applicant.updateOne({_id:draft.id},{$set:{country:'Ghana'}});
  return draft;
 };
 const statusOf = draft => call(getMyBankTransfer,{applicant:{id:draft.id}});
 const proof = {body:{bankReference:'bank-trace-1',transferDate},file:{buffer:receipt}};
 const approve = (payment, bankCreditId, creditedAmount = '35.00', proofId = payment.bankTransfer.proofId) => call(approveBankTransfer,{
  ...asAdmin,params:{id:payment.id},body:{bankCreditId,settledDate:transferDate,creditedAmount,currency:'USD',proofId},
 });
 await test('new USD checkout only creates a resumable bank transfer and pays no gateway',async()=>{
  await seed(1);const a=await foreign();
  env.BANK_TRANSFER_ACCOUNT_NUMBER=undefined;
  try { assert.equal((await begin(a)).status,503); assert.equal(await Payment.countDocuments(),0); }
  finally { env.BANK_TRANSFER_ACCOUNT_NUMBER='00001234'; }
  await Applicant.updateOne({_id:a.id},{$set:{'declaration.confirmed':false}});
  assert.equal((await begin(a)).status,400);
  await Applicant.updateOne({_id:a.id},{$set:{'declaration.confirmed':true}});
  const results=await Promise.all([begin(a),begin(a)]);
  assert.ok(results.every(result=>result.body.method==='bank_transfer'&&result.body.reference===results[0].body.reference));
  assert.equal(paystackRequests.length,0);assert.equal(initializeCalls,0);
  assert.equal(await Payment.countDocuments(),1);
  const transfer=(await statusOf(a)).body.transfer;
  assert.equal(transfer.amount,3500);assert.equal(transfer.account.number,'00001234');
  assert.equal(transfer.setPasswordToken,undefined);
  assert.equal((await Payment.findOne()).bankTransfer.account,undefined);
  const other=await foreign();
  assert.equal((await statusOf(other)).body.transfer,null);
  assert.equal((await begin(other)).status,400);
 });
 await test('bank transfer approval requires current proof, a matched USD credit and one enrollment',async()=>{
  await seed();const a=await foreign(), promo=await coupon(25,1);
  await begin(a,promo.code);
  const initial=await Payment.findOne();
  assert.equal((await approve(initial,'credit-one')).status,409);
  assert.equal((await call(submitApplicantTransferProof,{...proof,applicant:{id:a.id},file:{buffer:Buffer.from('not-a-receipt')}})).status,400);
  assert.equal((await call(submitApplicantTransferProof,{...proof,applicant:{id:a.id}})).body.transfer.review,'under_review');
  assert.equal((await statusOf(a)).body.transfer.setPasswordToken,undefined);
  const first = await Payment.findById(initial._id);
  assert.equal(first.transferReceipt,undefined);
  assert.deepEqual((await call(downloadTransferReceipt,{params:{id:first.id}})).body,receipt);
  await call(reviewBankTransfer,{...asAdmin,params:{id:first.id},body:{decision:'needs_information',feedback:'Please attach a clearer receipt.'}});
  assert.equal((await statusOf(a)).body.transfer.feedback,'Please attach a clearer receipt.');
  await call(attachEmailedTransferProof,{...asAdmin,...proof,params:{id:first.id}});
  const current=await Payment.findById(initial._id);
  assert.equal(current.bankTransfer.source,'email');
  assert.equal((await approve(current,'credit-one','26.25',first.bankTransfer.proofId)).status,409);
  assert.equal((await approve(current,'credit-one','26.24')).status,409);
  const results=await Promise.all([approve(current,'credit-one','26.25'),approve(current,'credit-one','26.25')]);
  assert.ok(results.every(result=>result.status===200));
  assert.equal(await Application.countDocuments(),1);
  assert.equal(submittedEvents,1);
  assert.equal((await Coupon.findById(promo._id)).usedCount,1);
  const approved=(await statusOf(a)).body.transfer;
  assert.equal(approved.review,'approved');assert.ok(approved.setPasswordToken);
  const b=await foreign();await begin(b);
  await call(submitApplicantTransferProof,{...proof,applicant:{id:b.id}});
  assert.equal((await approve(await Payment.findOne({applicantId:b.id}),' CREDIT-ONE ')).status,409);
  assert.equal(await Application.countDocuments(),1);
 });
 await test('a legacy USD gateway attempt stays verifiable and a full waiver needs no transfer',async()=>{
  await seed();const a=await foreign();
  await Payment.create({applicantId:a.id,provider:'flutterwave',providerRef:'legacy-usd',amount:3000,currency:'USD',status:'pending',authorizationUrl:'https://checkout.example.invalid/legacy'});
  const result=await begin(a);
  assert.equal(result.body.reference,'legacy-usd');assert.ok(result.body.pollingToken);assert.equal(result.body.authorizationUrl,undefined);
  const b=await foreign(),promo=await coupon(100);
  assert.equal((await begin(b,promo.code)).body.bypassPayment,true);
  assert.equal(await Payment.countDocuments({'bankTransfer.review':{$exists:true}}),0);
  assert.equal(initializeCalls,0);assert.equal(paystackRequests.length,0);
 });
 await test('an expired transfer hold releases the seat and a late receipt cannot exceed capacity',async()=>{
  await seed(1);const a=await foreign();await begin(a);
  const expired = new Date(Date.now()-60_000);
  await Applicant.updateOne({_id:a.id},{$set:{transferHoldUntil:expired}});
  await Payment.updateOne({applicantId:a.id},{$set:{'bankTransfer.holdUntil':expired}});
  assert.equal((await statusOf(a)).body.transfer.account,undefined);
  const b=await foreign();assert.equal((await begin(b)).status,200);
  await call(submitApplicantTransferProof,{...proof,applicant:{id:a.id}});
  assert.equal((await approve(await Payment.findOne({applicantId:a.id}),'late-credit')).status,409);
  assert.equal(await Application.countDocuments(),0);
 });
 await test('superadmin pricing changes apply only to new NGN and USD attempts', async () => {
  await seed(4);
  const { getLevyPricing } = await import('../src/controllers/levyPricingController.ts');
  const { default: adminRouter } = await import('../src/routes/adminRoutes.ts');
  const pricingRoute = adminRouter.stack.find(layer => layer.route?.path === '/levy-pricing').route;
  const change = async (req, res) => {
   for (const layer of pricingRoute.stack.slice(0, -1)) {
    let allowed = false;
    await layer.handle(req, res, () => { allowed = true; });
    if (!allowed) return;
   }
   await pricingRoute.stack.at(-1).handle(req, res);
  };
  assert.deepEqual((await call(getLevyPricing, {})).body, { NGN: 2500000, USD: 3500 });
  const [oldLocal, oldForeign] = await Promise.all([applicant(), foreign()]);
  const localQuote = await begin(oldLocal);
  const foreignQuote = await begin(oldForeign);
  assert.equal(localQuote.status, 200);
  assert.equal(foreignQuote.status, 200);
  const now = Math.floor(Date.now() / 1000);
  const newPrices = { NGN: 2705000, USD: 4050 };
  const asSuper = { ...asAdmin, user: { ...asAdmin.user, role: 'superadmin', mfaAt: now } };
  assert.equal((await call(change, { ...asAdmin, body: newPrices })).status, 403);
  assert.equal((await call(change, { ...asSuper, user: { ...asSuper.user, mfaAt: now - 601 }, body: newPrices })).status, 403);
  assert.equal((await call(change, { ...asSuper, body: { NGN: 1.5, USD: 0 } })).status, 400);
  assert.deepEqual((await call(change, { ...asSuper, body: newPrices })).body, newPrices);
  assert.deepEqual((await call(getLevyPricing, {})).body, newPrices);
  assert.equal(await AuditLog.countDocuments({ action: 'LEVY_PRICE_UPDATED' }), 1);
  assert.equal((await begin(oldLocal)).body.reference, localQuote.body.reference);
  assert.equal((await begin(oldForeign)).body.reference, foreignQuote.body.reference);
  assert.equal((await Payment.findOne({ applicantId: oldLocal.id })).amount, 2500000);
  assert.equal((await statusOf(oldForeign)).body.transfer.amount, 3500);
  const [newLocal, newForeign] = await Promise.all([applicant(), foreign()]);
  assert.equal((await begin(newLocal)).status, 200);
  assert.equal((await begin(newForeign)).status, 200);
  assert.equal((await Payment.findOne({ applicantId: newLocal.id })).amount, newPrices.NGN);
  assert.equal((await statusOf(newForeign)).body.transfer.amount, newPrices.USD);
 });
 console.log(passed+' MongoDB transaction scenarios passed');
}finally{
 if(mongoose.connection.readyState===1)await mongoose.connection.dropDatabase();
 await mongoose.disconnect();
}
