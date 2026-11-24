import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ReminderJob } from '../src/models/ReminderJob.ts';
import { User } from '../src/models/User.ts';
import { AuditLog } from '../src/models/AuditLog.ts';
import { createReminderJob, getReminderJob } from '../src/controllers/reminderJobController.ts';
import { processNextReminderJob } from '../src/services/reminderJobs.ts';
import { requestFailure } from '../../ifip-frontend/lib/api/request-error.ts';

// No server, database, Redis or email provider connections. Exercise controllers
// and worker with an atomic in-memory model fixture; Mongo integration is separate.
globalThis.fetch = () => { throw new Error('Network is forbidden in this harness'); };
const jobs = new Map();
const matches = (job, filter) => Object.entries(filter).every(([key, value]) =>
  value && typeof value === 'object' && '$lt' in value ? job[key] < value.$lt : job[key] === value);
const update = (job, changes) => {
  Object.assign(job, changes.$set ?? {});
  if (changes.$push) job.results.push(...changes.$push.results.$each);
};
ReminderJob.create = async data => {
  if (jobs.has(data._id)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
  const job = { ...data, status: 'queued', results: [], createdAt: new Date(), heartbeatAt: new Date() };
  jobs.set(data._id, job); return job;
};
ReminderJob.findOne = async filter => [...jobs.values()].find(job => matches(job, filter)) ?? null;
ReminderJob.updateMany = async (filter, changes) => {
  for (const job of jobs.values()) if (matches(job, filter)) update(job, changes);
};
ReminderJob.findOneAndUpdate = async (filter, changes) => {
  const job = [...jobs.values()].find(job => matches(job, filter));
  if (!job) return null;
  update(job, changes); return job;
};
ReminderJob.exists = ReminderJob.findOne;
ReminderJob.updateOne = async (filter, changes) => {
  const job = await ReminderJob.findOne(filter);
  if (job) update(job, changes);
  return { matchedCount: Number(!!job) };
};
User.findById = async () => ({ email: 'admin@example.invalid' });
AuditLog.create = async () => ({});
const owner = '000000000000000000000001';
const request = body => ({ body, user: { id: owner, role: 'admin' }, headers: {}, socket: {} });
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = structuredClone(body); return this; }, sendStatus(code) { this.statusCode = code; } });
const payload = { requestId: randomUUID(), applicantIds: Array.from({ length: 76 }, (_, i) => (i + 100).toString(16).padStart(24, '0')), subject: 'Fixture', message: 'Fixture reminder' };
let res = response();
await createReminderJob(request(payload), res);
assert.equal(res.statusCode, 202); assert.equal(res.body.status, 'queued'); assert.equal(res.body.results.length, 0);
res = response(); await createReminderJob(request(payload), res);
assert.equal(res.statusCode, 202); assert.equal(jobs.size, 1);
res = response(); await createReminderJob(request({ ...payload, message: 'Changed' }), res);
assert.equal(res.statusCode, 409);
res = response(); await getReminderJob({ params: { jobId: payload.requestId }, user: { id: 'another-admin' } }, res);
assert.equal(res.statusCode, 404);
res = response(); await createReminderJob(request({ ...payload, requestId: randomUUID(), applicantIds: ['invalid'] }), res);
assert.equal(res.statusCode, 400);
const sent = [];
const deliver = async batch => {
  assert.ok(batch.applicantIds.length <= 5);
  sent.push(...batch.applicantIds);
  return batch.applicantIds.map(applicantId => ({ applicantId, status: 'accepted' }));
};
await Promise.all([processNextReminderJob(deliver), processNextReminderJob(deliver)]);
assert.equal(sent.length, 76); assert.equal(new Set(sent).size, 76);
res = response(); await getReminderJob({ params: { jobId: payload.requestId }, user: { id: owner } }, res);
assert.equal(res.body.status, 'completed'); assert.equal(res.body.sentCount, 76);
const interruptedId = randomUUID();
await createReminderJob(request({ ...payload, requestId: interruptedId }), response());
let batches = 0;
await processNextReminderJob(async batch => {
  if (++batches === 2) throw new Error('Provider result unavailable');
  return deliver(batch);
});
assert.equal(jobs.get(interruptedId).status, 'interrupted'); assert.equal(jobs.get(interruptedId).results.length, 5);
assert.equal(await processNextReminderJob(deliver), false);
jobs.get(interruptedId).status = 'processing'; jobs.get(interruptedId).heartbeatAt = new Date(0);
await processNextReminderJob(deliver); assert.equal(jobs.get(interruptedId).status, 'interrupted');
assert.equal(requestFailure('ECONNABORTED').isTimeout, true);
assert.equal(requestFailure('ETIMEDOUT').isTimeout, true);
assert.match(requestFailure('ERR_NETWORK', true).message, /offline/);
assert.doesNotMatch(requestFailure('ERR_NETWORK').message, /check your internet/i);
console.log('PASS: enqueue, duplicate recovery, payload conflict, owner isolation, validation, 76 recipients, concurrent claim, partial progress, no replay, stale worker and request error classification.');
