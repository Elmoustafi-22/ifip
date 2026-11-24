import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { generateSecret, generateSync } from 'otplib';

// Use a uniquely named disposable database on the local development MongoDB only.
const dbName = `ifip_admin_mfa_test_${randomUUID().replaceAll('-', '')}`;
const uri = `mongodb://127.0.0.1:37118/${dbName}?directConnection=true`;
Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGO_URI: uri,
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'r'.repeat(32),
    APPLICANT_SESSION_SECRET: 's'.repeat(32),
    SET_PASSWORD_TOKEN_SECRET: 'p'.repeat(32),
    RESET_PASSWORD_TOKEN_SECRET: 'z'.repeat(32),
    CLOUDINARY_CLOUD_NAME: 'fixture',
    CLOUDINARY_API_KEY: 'fixture',
    CLOUDINARY_API_SECRET: 'fixture',
    CLIENT_URL: 'http://localhost:3217',
    REDIS_URL: 'redis://127.0.0.1:1',
    PAYSTACK_SECRET_KEY: 'fixture',
    PAYSTACK_CALLBACK_URL: 'http://localhost:3217/verify-payment',
    OUTBOX_API_KEY: 'fixture',
    EMAIL_FROM: 'fixture@example.invalid',
});

const sentEmails = [];
globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://outboxstack.app/v1/messages');
    sentEmails.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: 'fixture' }), { status: 202, headers: { 'content-type': 'application/json' } });
};

const { User } = await import('../src/models/User.ts');
const {
    login, loginMfaVerify, completeAdminMfaSetup, refresh, resetPassword, setPassword, mfaDisable, mfaEnable,
} = await import('../src/controllers/authController.ts');
const { adminPasswordBinding, adminSessionProof, verifyAdminEnrollmentEmail } = await import('../src/services/adminMfa.ts');
const { authenticate, requireAdminConfirmation } = await import('../src/middleware/auth.ts');
const { default: adminRoutes } = await import('../src/routes/adminRoutes.ts');
const { signAccessToken, signRefreshToken, signResetPasswordToken, signSetPasswordToken, verifyAccessToken } =
    await import('../src/utils/jwt.ts');

async function call(handler, request = {}) {
    const req = { body: {}, headers: {}, cookies: {}, socket: {}, ...request };
    const res = {
        code: 200,
        status(code) { this.code = code; return this; },
        json(data) { this.data = data; return this; },
        set() { return this; },
        cookie(_name, value, options) { this.refreshToken = value; this.cookieOptions = options; },
        clearCookie() {},
    };
    await handler(req, res, () => { res.passed = true; res.user = req.user; res.adminSession = req.adminSession; });
    return res;
}

const password = 'Local fixture password 2026!';
const credential = user => ({ body: { email: user.email, password } });
const codeRequest = (mfaToken, code) => ({ body: { mfaToken, code } });
const bearer = token => ({ headers: { authorization: `Bearer ${token}` } });

async function verifyAdminPasswordFlow(admin, superadmin, participant) {
    const app = express();
    app.use(express.json());
    app.use('/admin', adminRoutes);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
        const now = Math.floor(Date.now() / 1000);
        const session = adminSessionProof(superadmin, now - 601);
        const token = signAccessToken(superadmin.id, superadmin.role, session);
        const regularToken = signAccessToken(admin.id, admin.role, adminSessionProof(admin, now - 601));
        const url = `http://127.0.0.1:${server.address().port}/admin`;
        const request = (path, method, accessToken, body, proof) => fetch(url + path, {
            method,
            headers: {
                ...bearer(accessToken).headers,
                ...(body && { 'content-type': 'application/json' }),
                ...(proof && { 'x-admin-password-confirmation': proof }),
            },
            body: JSON.stringify(body),
        });
        const confirm = (accessToken, value = password) =>
            request('/confirm-password', 'POST', accessToken, { password: value });
        const prices = { NGN: 2705000, USD: 4050 };
        const updatePrices = (accessToken, proof) => request('/levy-pricing', 'PATCH', accessToken, prices, proof);

        for (const [method, path] of [
            ['PATCH', '/levy-pricing'],
            ['POST', '/pending-applicants/example/record-manual-payment'],
            ['PATCH', '/payments/example/resolve'],
            ['POST', '/payments/example/bank-transfer/proof'],
            ['POST', '/payments/example/bank-transfer/approve'],
            ['POST', '/payments/example/bank-transfer/review'],
            ['POST', '/payments/example/bank-transfer/resend-setup'],
            ['POST', '/cohorts/example/waitlist/resend'],
            ['POST', '/cohorts/example/waitlist/clear-confirmed'],
            ['POST', '/coupons'],
            ['PATCH', '/coupons/example'],
            ['DELETE', '/coupons/example'],
        ]) {
            const response = await request(path, method, token);
            assert.equal(response.status, 403, path);
            assert.equal((await response.json()).code, 'ADMIN_PASSWORD_CONFIRMATION_REQUIRED', path);
        }
        assert.equal((await confirm(signAccessToken(participant.id, participant.role))).status, 403);
        assert.equal((await confirm(signAccessToken(superadmin.id, superadmin.role))).status, 401);
        assert.equal((await confirm(token, 'incorrect')).status, 403);
        const confirmed = await confirm(token);
        assert.equal(confirmed.status, 200);
        assert.equal(confirmed.headers.get('cache-control'), 'no-store');
        const { token: proof, expiresIn } = await confirmed.json();
        assert.equal(expiresIn, 600);
        assert.throws(() => verifyAccessToken(proof));
        assert.equal((await updatePrices(token, proof + 'x')).status, 403);
        const expiredProof = jwt.sign({ purpose: 'admin-password-confirmation', sub: superadmin.id, ...session },
            process.env.JWT_ACCESS_SECRET, { expiresIn: -1 });
        assert.equal((await updatePrices(token, expiredProof)).status, 403);
        const otherSession = adminSessionProof(superadmin, now - 700);
        assert.equal((await updatePrices(signAccessToken(superadmin.id, superadmin.role, otherSession), proof)).status, 403);
        const adminProof = (await (await confirm(regularToken, 'New local fixture password!')).json()).token;
        assert.ok(adminProof);
        assert.equal((await updatePrices(token, adminProof)).status, 403);
        assert.equal((await updatePrices(regularToken, adminProof)).status, 403);
        const refreshed = await call(refresh, { cookies: { refreshToken: signRefreshToken(superadmin.id, undefined, session) } });
        const saved = await updatePrices(refreshed.data.accessToken, proof);
        assert.equal(saved.status, 200);
        assert.deepEqual(await saved.json(), prices);
        for (let attempt = 0; attempt < 4; attempt++) {
            assert.equal((await confirm(token, 'incorrect')).status, 403);
        }
        assert.equal((await confirm(token)).status, 429);
    } finally {
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
}

try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await User.init();
    const passwordHash = await bcrypt.hash(password, 4);
    const admin = await User.create({ email: 'admin@example.invalid', role: 'admin', passwordHash });

    const initial = await call(login, credential(admin));
    assert.equal(initial.data.mfaEnrollmentRequired, true);
    assert.equal(initial.data.accessToken, undefined);
    assert.equal(initial.refreshToken, undefined);
    assert.equal((await call(authenticate, bearer(initial.data.mfaToken))).code, 401);
    assert.equal((await call(authenticate, bearer(signAccessToken(admin.id, admin.role)))).code, 401);
    assert.equal((await call(refresh, { body: { refreshToken: signRefreshToken(admin.id) } })).code, 401);

    const repeated = await call(login, credential(admin));
    assert.equal(repeated.data.mfaEnrollmentRequired, true);
    assert.equal(sentEmails.length, 1);
    const emailCode = sentEmails[0].htmlContent.match(/<strong>(\d{8})<\/strong>/)?.[1];
    assert.ok(emailCode);
    const incorrect = emailCode === '00000000' ? '00000001' : '00000000';
    assert.equal((await call(verifyAdminEnrollmentEmail, codeRequest(initial.data.mfaToken, incorrect))).code, 401);
    const setup = await call(verifyAdminEnrollmentEmail, codeRequest(initial.data.mfaToken, emailCode));
    assert.match(setup.data.qrCode, /^data:image\/png;base64,/);
    assert.equal((await call(verifyAdminEnrollmentEmail, codeRequest(initial.data.mfaToken, emailCode))).code, 401);

    const totp = generateSync({ secret: setup.data.secret });
    const results = await Promise.all([
        call(completeAdminMfaSetup, codeRequest(initial.data.mfaToken, totp)),
        call(completeAdminMfaSetup, codeRequest(initial.data.mfaToken, totp)),
    ]);
    assert.deepEqual(results.map(result => result.code).sort(), [200, 401]);
    const session = results.find(result => result.code === 200);
    assert.ok(session.data.accessToken);
    assert.equal(session.data.refreshToken, undefined);
    assert.equal(session.cookieOptions.httpOnly, true);
    assert.equal((await call(authenticate, bearer(session.data.accessToken))).passed, true);
    assert.equal((await User.findById(admin.id)).mfaSecret, undefined);

    const nextSession = await call(refresh, { cookies: { refreshToken: session.refreshToken } });
    const mfaAt = verifyAccessToken(session.data.accessToken).mfaAt;
    assert.equal(verifyAccessToken(nextSession.data.accessToken).mfaAt, mfaAt);
    const authenticated = await call(authenticate, bearer(nextSession.data.accessToken));
    assert.equal((await call(requireAdminConfirmation, { user: authenticated.user, adminSession: authenticated.adminSession })).passed, true);
    const persisted = await User.findById(admin.id).select('+mfaSecret');
    const oldProof = adminSessionProof(persisted, mfaAt - 8 * 3600);
    assert.equal((await call(authenticate, bearer(signAccessToken(admin.id, admin.role, oldProof)))).code, 401);
    assert.equal((await call(mfaDisable, { user: authenticated.user, body: { code: totp } })).code, 403);
    assert.equal((await call(mfaEnable, {
        user: authenticated.user, body: { secret: setup.data.secret, code: generateSync({ secret: setup.data.secret }) },
    })).code, 403);

    const existingLogin = await call(login, credential(admin));
    assert.equal(existingLogin.data.mfaEnrollmentRequired, false);
    // Model the already-used current time step, regardless of wall clock alignment.
    await User.updateOne({ _id: admin.id }, { $set: { adminMfaStep: Math.floor(Date.now() / 30_000) } });
    assert.equal((await call(loginMfaVerify, codeRequest(existingLogin.data.mfaToken, generateSync({
        secret: setup.data.secret,
    })))).code, 401);

    const reset = signResetPasswordToken(admin.id, adminPasswordBinding(persisted));
    const resetRequest = { body: { token: reset, password: 'New local fixture password!' } };
    assert.deepEqual((await call(resetPassword, resetRequest)).data, { signInRequired: true });
    assert.equal((await call(resetPassword, resetRequest)).code, 400);
    assert.equal((await call(refresh, { cookies: { refreshToken: session.refreshToken } })).code, 401);
    assert.equal((await call(authenticate, bearer(session.data.accessToken))).code, 401);
    assert.equal((await call(loginMfaVerify, codeRequest(existingLogin.data.mfaToken, totp))).code, 401);

    const secret = generateSecret();
    const superadmin = await User.create({
        email: 'superadmin@example.invalid', role: 'superadmin', passwordHash, mfaEnabled: true, mfaSecret: secret,
    });
    const challenge = await call(login, credential(superadmin));
    const verified = await call(loginMfaVerify, codeRequest(challenge.data.mfaToken, generateSync({ secret })));
    assert.equal((await call(authenticate, bearer(verified.data.accessToken))).passed, true);
    assert.equal((await call(loginMfaVerify, codeRequest(challenge.data.mfaToken, generateSync({ secret })))).code, 401);

    const invited = await User.create({ email: 'invited@example.invalid', role: 'admin' });
    const inviteRequest = { body: { token: signSetPasswordToken(invited.id, invited.email), password } };
    assert.deepEqual((await call(setPassword, inviteRequest)).data, { signInRequired: true });
    assert.equal((await call(setPassword, inviteRequest)).code, 400);

    const participant = await User.create({ email: 'participant@example.invalid', role: 'participant', passwordHash });
    const participantSession = await call(login, credential(participant));
    assert.ok(participantSession.data.refreshToken);
    assert.equal((await call(authenticate, bearer(participantSession.data.accessToken))).passed, true);
    assert.equal((await call(requireAdminConfirmation, { user: { id: participant.id, role: 'participant' } })).code, 403);
    await verifyAdminPasswordFlow(await User.findById(admin.id).select('+mfaSecret'), superadmin, participant);

    const optionalMfa = await User.create({
        email: 'participant-mfa@example.invalid', role: 'participant', passwordHash, mfaEnabled: true, mfaSecret: secret,
    });
    const optionalChallenge = await call(login, credential(optionalMfa));
    assert.equal(optionalChallenge.data.mfaRequired, true);
    const optionalSession = await call(loginMfaVerify, codeRequest(optionalChallenge.data.mfaToken, generateSync({ secret })));
    assert.equal((await call(authenticate, bearer(optionalSession.data.accessToken))).passed, true);
    console.log('PASS admin enrollment, login, token boundaries, replay, in-session password confirmation, password reset, invitations, and both participant sign-in paths');
} finally {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) {
        await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
}
