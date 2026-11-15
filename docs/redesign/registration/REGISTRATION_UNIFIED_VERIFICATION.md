# Unified registration UI and checkout reliability

The approved design is implemented on the existing application route. It uses a common header, a desktop progress rail, named mobile progress, aligned Back and primary buttons, short transitions that respect reduced motion, and more space above the date fields. The account screens use the same color and control treatment and expose an explicit Continue action after password setup and reset.

## Local evidence

- Frontend and backend TypeScript no-emit checks passed.
- 40 intercepted Chromium checks at 320, 375, 768 and 1280 CSS px. Coverage includes restored application steps 2–6, button alignment, date spacing, checkout recovery to verification when a polling reference is available, and responsive login, forgot-password, and tokenless setup/reset screens.
- Targeted ESLint still reports diagnostics in the application and auth files. The full authentication matrix and live screen-reader testing remain open.
- Rendered academic step at [375 px](verification/unified/academic-375.png) and [1280 px](verification/unified/academic-1280.png).

## Checkout and enrollment

Checkout records an attempt before contacting Flutterwave. Repeated requests reuse the pending reference or a confirmed result. An ambiguous provider response retains its reference for verification. When the provider returns a hosted URL, the existing response field is reused. Legacy hosted records without a stored URL can be checked by reference. A pending attempt with no recoverable URL may still require operations support before another attempt can be started.

Cohort and coupon checks for checkout use MongoDB transactions. Managed pending attempts count against limited-use coupons while unresolved. Successful provider transitions and coupon consumption commit together. Payment polling and webhooks share that transition and can retry enrollment. Enrollment persists the user, application, payment link and draft removal together. Existing notifications run after commit and remain best-effort.

## MongoDB concurrency verification

Nine scenarios passed against a disposable MongoDB 7 replica set in Docker. The harness invokes the actual controllers and uses real MongoDB transactions. It intercepts provider HTTP calls and replaces notification listeners with test counters.

- Three concurrent checkout requests for one draft returned one reference and made one provider request. Concurrent applicants competing for the last seat or limited-use coupon produced one accepted checkout.
- Concurrent waiver requests consumed one coupon use and created one application. A browser status check and two webhooks finalized a hosted payment once, with one coupon increment and one submission event. A final submit retry recovered the existing application after the draft was removed.
- A provider transport failure retained the same reference and recovered a later success. An injected enrollment write failure rolled back the partial enrollment and recovered on the next check. A provider-confirmed failed checkout allowed a new attempt. Replays after password setup returned no setup token.

To repeat the checks, start a dedicated test container from the repository root and run the harness from `ifip-backend/`. The harness targets port 37117, creates a test database for its process, and drops that database on exit.

```powershell
docker run --rm -d --name ifip-registration-test-mongo -p 127.0.0.1:37117:27017 mongo:7 --replSet ifiptest --bind_ip_all
docker exec ifip-registration-test-mongo mongosh --quiet --eval 'rs.initiate({_id:"ifiptest",members:[{_id:0,host:"localhost:27017"}]})'
Set-Location ifip-backend
node --import tsx tests/registration-concurrency.mjs
docker stop ifip-registration-test-mongo
```

REG-00 still needs provider test-mode checkout and end-to-end staging verification against a transaction-capable MongoDB deployment. No real payment, email, or production data was used. Draft revision checks across tabs remain open.
