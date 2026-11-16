import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import axios from 'axios';
import mongoose from 'mongoose';

// Use only a disposable local replica set. All provider requests are intercepted.
const uri = `mongodb://127.0.0.1:37117/ifip_partner_test_${process.pid}?directConnection=true&replicaSet=ifiptest`;
Object.assign(process.env, {
    NODE_ENV: 'test', MONGO_URI: uri, REDIS_URL: 'redis://127.0.0.1:1',
    CLIENT_URL: 'http://127.0.0.1:3217', BREVO_API_KEY: 'fixture', EMAIL_FROM: 'fixture@example.invalid',
    JWT_ACCESS_SECRET: 'x'.repeat(32), JWT_REFRESH_SECRET: 'y'.repeat(32),
    APPLICANT_SESSION_SECRET: 'a'.repeat(32), SET_PASSWORD_TOKEN_SECRET: 's'.repeat(32),
    RESET_PASSWORD_TOKEN_SECRET: 'r'.repeat(32),
    CLOUDINARY_CLOUD_NAME: 'fixture', CLOUDINARY_API_KEY: 'fixture', CLOUDINARY_API_SECRET: 'fixture',
    FLUTTERWAVE_SECRET_KEY: 'fixture', FLUTTERWAVE_WEBHOOK_HASH: 'fixture',
    FLUTTERWAVE_CALLBACK_URL: 'http://127.0.0.1:3217/verify-payment',
    PAYSTACK_SECRET_KEY: 'fixture', PAYSTACK_CALLBACK_URL: 'http://127.0.0.1:3217/verify-payment',
});

const mail = [];
let rejectCvEmail = false;
axios.defaults.adapter = async config => {
    assert.equal(config.baseURL, 'https://api.brevo.com/v3');
    assert.equal(config.url, '/smtp/email');
    const message = JSON.parse(config.data);
    if (rejectCvEmail && message.subject === 'A partner requested your CV — IFIP') {
        throw new Error('Simulated CV email provider failure');
    }
    mail.push(message);
    return { data: { messageId: 'fixture' }, status: 201, headers: {}, config };
};

const { submitPartnerApplication, reviewPartnerApplication } = await import('../src/controllers/partnerController.ts');
const {
    getInternById, requestInternCv, getPartnerJobOpenings, getPartnerMe, getPartnerTasks,
    getMyPlacements, getJobOpeningApplications, getJobApplicationById,
} = await import('../src/controllers/partnerPortalController.ts');
const { recordHiringOutcome } = await import('../src/controllers/hiringOutcomeController.ts');
const { getAdminJobOpenings, reviewJobOpening } = await import('../src/controllers/adminController.ts');
const { getOpenJobOpenings, applyToJobOpening } = await import('../src/controllers/jobOpeningController.ts');
const { getPublicOpenings } = await import('../src/controllers/activeOpeningController.ts');
const { getNotifications, getCvRequestDetails } = await import('../src/controllers/notificationController.ts');
const { ActiveOpening } = await import('../src/models/ActiveOpening.ts');
const { User } = await import('../src/models/User.ts');
const { Application } = await import('../src/models/Application.ts');
const { AuditLog } = await import('../src/models/AuditLog.ts');
const { Applicant } = await import('../src/models/Applicants.ts');
const { Payment } = await import('../src/models/Payments.ts');
const { Placement } = await import('../src/models/Placement.ts');
const { JobApplication } = await import('../src/models/JobApplication.ts');
const { JobOpening } = await import('../src/models/JobOpening.ts');
const { Notification } = await import('../src/models/Notification.ts');
const { PartnerApplication } = await import('../src/models/PartnerApplication.ts');
const { PartnerOrganization } = await import('../src/models/PartnerOrganization.ts');

async function call(handler, req = {}) {
    const res = {
        statusCode: 200,
        headers: {},
        set(name, value) { this.headers[name] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
    await handler({ body: {}, params: {}, query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' }, ...req }, res);
    return res;
}

function as(user) {
    return { id: user.id, role: user.role, email: user.email };
}

async function participant(name, attributes = {}) {
    const user = await User.create({ email: `${name}@example.invalid`, fullName: name, role: 'participant', ...attributes });
    await Application.create({ userId: user._id, status: 'placement_ready' });
    return user;
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
try {
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const admin = await User.create({ email: 'admin@example.invalid', role: 'superadmin' });
    const available = await participant('available');
    const selected = await participant('selected');
    const placed = await participant('placed');
    const optedOut = await participant('opted-out', { emailNotificationsEnabled: false });
    const cvUrl = 'https://example.invalid/fixture.pdf';

    const submitted = await call(submitPartnerApplication, { body: {
        companyName: 'Fixture Partners', contactEmail: 'partner@example.invalid',
        contactPhone: '+10000000000', contactPerson: 'Fixture Partner', description: 'Fixture <research> organization',
        website: 'https://example.invalid', sectorTags: ['Research'],
        hasOpenings: true, openings: [
            { role: 'Research Intern', mode: 'Remote', count: 2 },
            { role: 'Finance Intern', mode: 'Hybrid', location: 'Lagos', count: 1 },
        ],
    } });
    assert.equal(submitted.statusCode, 201, JSON.stringify(submitted.body));
    assert.equal(await JobOpening.countDocuments(), 0);
    const intake = await PartnerApplication.findOne({ companyName: 'Fixture Partners' });
    const review = { params: { id: intake.id }, user: as(admin), body: { action: 'approve' } };
    const decisions = await Promise.all([call(reviewPartnerApplication, review), call(reviewPartnerApplication, review)]);
    assert.deepEqual(decisions.map(decision => decision.statusCode).sort(), [200, 409], JSON.stringify(decisions));
    assert.equal(await PartnerOrganization.countDocuments(), 1);
    const partner = await User.findOne({ email: 'partner@example.invalid' });
    const pending = await call(getPartnerJobOpenings, { user: as(partner) });
    assert.equal(pending.body.openings.length, 2);
    const adminPending = await call(getAdminJobOpenings, { user: as(admin), query: { status: 'pending_review' } });
    assert.equal(adminPending.body.openings.length, 2);
    const opening = await JobOpening.findOne({ title: 'Research Intern' });
    assert.equal(opening.status, 'pending_review');
    assert.equal(opening.slots, 2);
    assert.equal((await call(getOpenJobOpenings, { user: as(available) })).body.total, 0);
    await ActiveOpening.create({ title: 'Manual listing', department: 'Fixture', workMode: 'Remote', location: 'Remote' });
    await JobOpening.create([
        { title: 'Expired listing', workMode: 'Remote', partnerOrgId: partner.orgId, status: 'open', applicationDeadline: new Date(0) },
        { title: 'Closed listing', workMode: 'Remote', partnerOrgId: partner.orgId, status: 'closed' },
        { title: 'Rejected listing', workMode: 'Remote', partnerOrgId: partner.orgId, status: 'rejected' },
    ]);
    assert.deepEqual((await call(getPublicOpenings)).body.openings, []);

    await JobApplication.create({
        userId: selected._id, jobOpeningId: opening._id, cvUrl,
        hiringOutcome: { status: 'selected', recordedAt: new Date(), recordedBy: admin._id, note: 'Fixture' },
    });
    await Placement.create({ userId: placed._id, partnerOrgId: partner.orgId, role: 'Fixture', status: 'placed' });
    const publish = { params: { id: opening.id }, user: as(admin), body: { action: 'approve' } };
    const publications = await Promise.all([call(reviewJobOpening, publish), call(reviewJobOpening, publish)]);
    assert.deepEqual(publications.map(item => item.statusCode).sort(), [200, 409], JSON.stringify(publications));
    assert.equal(await AuditLog.countDocuments({ action: 'ADMIN_JOB_OPENING_APPROVE', targetId: opening._id }), 1);
    for (let attempt = 0; attempt < 80 && !mail.some(item => item.subject === 'New Placement Opening: Research Intern at Fixture Partners'); attempt++) {
        await delay(50);
    }
    const alerts = await Notification.find({ title: 'New Job Opening: Research Intern' }).lean();
    assert.deepEqual(alerts.map(alert => String(alert.userId)).sort(), [available.id, optedOut.id].sort());
    assert.deepEqual(mail.filter(item => item.subject === 'New Placement Opening: Research Intern at Fixture Partners')
        .map(item => item.to[0].email), [available.email]);
    assert.equal((await call(getOpenJobOpenings, { user: as(available) })).body.total, 1);
    const homepage = await call(getPublicOpenings);
    assert.equal(homepage.headers['Cache-Control'], 'no-store');
    assert.deepEqual(JSON.parse(JSON.stringify(homepage.body.openings)), [{
        _id: opening.id, title: opening.title, workMode: 'Remote', partnerName: 'Fixture Partners',
    }]);
    const applied = await call(applyToJobOpening, { params: { id: opening.id }, user: as(available), body: { cvUrl } });
    assert.equal(applied.statusCode, 201, JSON.stringify(applied.body));

    const candidate = { params: { userId: available.id }, user: as(partner) };
    assert.equal((await call(getInternById, candidate)).body.cvUrl, undefined);
    const cvRequests = await Promise.all([call(requestInternCv, candidate), call(requestInternCv, candidate)]);
    assert.deepEqual(cvRequests.map(item => item.statusCode).sort(), [200, 201], JSON.stringify(cvRequests));
    const requests = await Notification.find({ title: 'CV requested', userId: available._id }).lean();
    assert.equal(requests.length, 1);
    assert.match(requests[0].message, /Fixture Partners is requesting your CV/);
    assert.equal(requests[0].link, '/dashboard/settings#documents');
    const sent = mail.filter(item => item.subject === 'A partner requested your CV — IFIP');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to[0].email, available.email);
    assert.match(sent[0].htmlContent, /Fixture Partners/);
    assert.match(sent[0].htmlContent, /Fixture &lt;research&gt; organization/);
    assert.ok(sent[0].htmlContent.includes(`http://127.0.0.1:3217/dashboard/cv-requests/${requests[0]._id}`));

    const recipient = { user: as(available), params: { id: String(requests[0]._id) } };
    const participantNotifications = await call(getNotifications, { user: as(available) });
    const requestNotification = participantNotifications.body.find(item => item.title === 'CV requested');
    assert.equal(requestNotification.link, `/dashboard/cv-requests/${requests[0]._id}`);
    assert.equal(requestNotification.cvRequestOrgId, undefined);
    const details = await call(getCvRequestDetails, recipient);
    assert.deepEqual(details.body.company, {
        name: 'Fixture Partners',
        description: 'Fixture <research> organization',
        sectorTags: ['Research'],
        website: 'https://example.invalid',
    });
    assert.equal((await call(getCvRequestDetails, { ...recipient, user: as(optedOut) })).statusCode, 404);
    await Notification.updateOne({ _id: requests[0]._id }, { read: true });
    assert.equal((await call(getCvRequestDetails, recipient)).statusCode, 200);

    const optedOutRequest = await call(requestInternCv, { ...candidate, params: { userId: optedOut.id } });
    assert.equal(optedOutRequest.body.emailStatus, 'in_app');
    assert.equal(await Notification.countDocuments({ userId: optedOut._id, title: 'CV requested' }), 1);
    const retryCandidate = await participant('retry-candidate');
    const retryRequest = { ...candidate, params: { userId: retryCandidate.id } };
    rejectCvEmail = true;
    assert.equal((await call(requestInternCv, retryRequest)).body.emailStatus, 'failed');
    rejectCvEmail = false;
    assert.equal((await call(requestInternCv, retryRequest)).body.emailStatus, 'sent');
    assert.equal(await Notification.countDocuments({ userId: retryCandidate._id, title: 'CV requested' }), 1);
    assert.deepEqual(mail.filter(item => item.subject === 'A partner requested your CV — IFIP')
        .map(item => item.to[0].email), [available.email, retryCandidate.email]);

    const applicant = await Applicant.create({ email: available.email, cvUrl });
    const payment = await Payment.create({
        applicantId: applicant._id, status: 'success', amount: 0, providerRef: 'fixture-payment',
    });
    await Application.updateOne({ userId: available._id }, { paymentId: payment._id });
    assert.equal((await call(getInternById, candidate)).body.cvUrl, cvUrl);
    const updatedCv = 'https://example.invalid/updated-fixture.pdf';
    await Application.updateOne({ userId: available._id }, { cvUrl: updatedCv });
    assert.equal((await call(getInternById, candidate)).body.cvUrl, updatedCv);
    await Application.updateOne({ userId: available._id }, { status: 'withdrawn' });
    assert.equal((await call(getInternById, candidate)).statusCode, 404);
    assert.equal((await call(requestInternCv, candidate)).statusCode, 404);
    await PartnerOrganization.updateOne({ _id: partner.orgId }, { portalEnabled: false });
    assert.equal((await call(requestInternCv, { ...candidate, params: { userId: optedOut.id } })).statusCode, 403);
    await JobOpening.updateOne({ _id: opening._id }, { status: 'closed' });
    assert.deepEqual((await call(getPublicOpenings)).body.openings, []);

    await PartnerOrganization.updateOne({ _id: partner.orgId }, { portalEnabled: true });
    const hireOrg = await PartnerOrganization.create({ name: 'Hire override fixture', contactEmail: 'hiring-partner@example.invalid' });
    const hiringPartner = await User.create({ email: 'hiring-partner@example.invalid', role: 'partner', orgId: hireOrg._id });
    const hireOpening = await JobOpening.create({ title: 'Hire fixture', workMode: 'Remote', partnerOrgId: hireOrg._id });
    const interviewScheduledAt = new Date(Date.now() + 86400000);
    const hirePlacement = await Placement.create({
        userId: placed._id, partnerOrgId: hireOrg._id, status: 'interviewing', interviewScheduledAt,
    });
    const hireApplication = await JobApplication.create({
        userId: placed._id, jobOpeningId: hireOpening._id, cvUrl, status: 'interview_scheduled', interviewScheduledAt,
    });
    const company = { user: as(hiringPartner) };
    assert.equal((await call(getPartnerTasks, company)).body.tasks.interviews.length, 2);
    assert.equal((await call(getPartnerMe, company)).body.stats.confirmedHires, 0);
    for (const [kind, id] of [['placements', hirePlacement.id], ['job-applications', hireApplication.id]]) {
        const confirm = { user: as(admin), params: { kind, id }, body: {
            status: 'hire_confirmed', note: 'Already started work', previousRecordedAt: null,
        } };
        const confirmed = await call(recordHiringOutcome, confirm);
        assert.equal(confirmed.statusCode, 200);
        assert.equal((await call(recordHiringOutcome, confirm)).statusCode, 409);
    }
    const [companyPlacement] = (await call(getMyPlacements, company)).body.placements;
    assert.equal(companyPlacement.status, 'placed');
    assert.equal(companyPlacement.hiringOutcome.status, 'hire_confirmed');
    assert.equal(companyPlacement.hiringOutcome.note, undefined);
    assert.equal(companyPlacement.hiringOutcome.recordedBy, undefined);
    assert.equal((await call(getMyPlacements, { user: as(partner) })).body.placements.some(row => String(row._id) === hirePlacement.id), false);
    const openingRequest = { params: { id: hireOpening.id, appId: hireApplication.id } };
    const [companyApplication] = (await call(getJobOpeningApplications, { ...company, ...openingRequest })).body.applications;
    assert.equal(companyApplication.status, 'hired');
    assert.equal((await call(getJobApplicationById, { ...company, ...openingRequest })).body.status, 'hired');
    assert.equal((await call(getJobApplicationById, { user: as(partner), ...openingRequest })).statusCode, 404);
    assert.equal((await call(getPartnerTasks, company)).body.tasks.interviews.length, 0);
    const companyStats = (await call(getPartnerMe, company)).body.stats;
    assert.equal(companyStats.scheduledInterviews, 0);
    assert.equal(companyStats.confirmedHires, 1);
    assert.equal((await call(getPartnerMe, { user: as(partner) })).body.stats.confirmedHires, 0);
    console.log('Admin-confirmed hires appear only for the owning company and close its pending interview tasks.');
    console.log('Partner intake, publication, notification exclusions, application, CV access and CV requests passed.');
} finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
}
