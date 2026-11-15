# Paystack-first commitment levy

**Status:** Implemented locally. Hosted gateway tests in isolated staging and live routing are pending.

**Revised routing:** New non-Nigerian levy payments use [USD bank transfer only](INTERNATIONAL_BANK_TRANSFER_PLAN.md). Existing gateway references remain verifiable.

## Current flow

New hosted commitment-levy attempts use Flutterwave. The backend already contains Paystack initialization and verification helpers, a Paystack webhook route, and payment records that store the provider. The verification page accepts both providers’ return parameters. Build on the existing checkout, seat and coupon reservation, and enrollment paths.

## 1. Configure provider routing

- Make Paystack the default for new NGN checkouts after staging sign-off. Keep Flutterwave available as a fallback or rollback option for NGN.
- Confirm Paystack merchant activation and NGN settlement settings. Preserve the current NGN and USD levy amounts and coupon calculation.
- Configure server-only test and live keys, the hosted checkout return URL for `/verify-payment`, and the Paystack webhook URL at `/api/v1/payments/webhook/paystack`. Validate enabled-provider configuration at startup. Keep controls for the default provider and automatic fallback independent so operations can change routing for new attempts.

## 2. Route and initialize checkout

- Select and persist the provider and unique reference in the existing reservation transaction. Call the selected provider outside the database transaction. Reuse the pending attempt and saved authorization URL on duplicate clicks, reloads, and resume.
- Send Paystack the server-calculated amount in minor units, currency, reference, payer email, and callback URL. Persist the returned checkout URL and return the existing `authorization_url`, `reference`, and polling token. Flutterwave continues to receive its existing major-unit amount. Keep full waivers and manual payments on their existing paths. [Paystack Transaction API](https://paystack.com/docs/api/transaction/)
- Allow automatic Flutterwave fallback only before a Paystack attempt was sent or after a confirmed rejection that rules out a payable Paystack checkout. Use a guarded database transition to retire any rejected attempt and create one Flutterwave attempt with a new reference while retaining the existing seat and coupon claim. Timeouts, network errors, ambiguous responses, and pending payments stay on the original reference for verification and reconciliation. After a verified terminal failure, the applicant can explicitly retry.

## 3. Verify and enroll

- Dispatch verification using the provider stored on the payment record. Validate the webhook signature against raw request bytes using the signature mode configured in the Paystack dashboard. Verify the transaction server-side and match successful status, reference, amount, and currency to the stored payment. [Paystack webhooks](https://paystack.com/docs/payments/webhooks/) · [Paystack verification](https://paystack.com/docs/payments/verify-payments/)
- Use the existing idempotent finalization flow for webhook and browser polling. A payment can consume the coupon and complete enrollment once. Route conflicting or late payments to reconciliation and preserve their references for support. Keep existing Flutterwave attempts on Flutterwave through completion, including after rollback.
- Preserve `/apply`, `/verify-payment`, resume, and password setup. Show pending verification and retry the same reference after a timeout. Record provider selection, fallback reason, and reconciliation status alongside the reference for admin support.

## 4. Verify and roll out

1. Extend the MongoDB replica-set and provider-fixture suite. Cover amount and currency mapping, Paystack initialization, safe fallback, ambiguous initialization, duplicate clicks, seat and coupon contention, invalid signatures and mismatched payments, webhook and polling overlap, late events, legacy Flutterwave attempts, and waivers.
2. Run browser checks for hosted handoff, callback, pending and canceled payment, retry, resume, and password setup. In isolated staging, complete Paystack test-mode checkout and a Flutterwave fallback checkout for NGN. Reconcile each provider reference to the correct payment and enrollment.
3. After release approval, enable Paystack for new NGN checkouts. Monitor initialization failures, fallback rate, aged pending attempts, and successful payments awaiting enrollment. Roll back by changing the default for new NGN checkouts while both verification and webhook paths stay enabled.

Acceptance requires one verified payment, one enrollment, and one coupon consumption where applicable for each successful checkout, with no second payable link after an ambiguous provider response.

## Staging configuration

| Backend setting | Staging value |
| --- | --- |
| `PAYMENT_PRIMARY_PROVIDER` | `paystack`. The implicit default is `flutterwave` until the switch is set. |
| `PAYMENT_FLUTTERWAVE_FALLBACK` | `true` to switch a new NGN checkout to Flutterwave after a confirmed Paystack authentication rejection. |
| `PAYSTACK_SECRET_KEY` | The staging Paystack test secret. Keep it server-side. |
| `PAYSTACK_CALLBACK_URL` | The staging frontend URL ending in `/verify-payment`. |
| `PAYSTACK_WEBHOOK_SECRET` | Set this when the dashboard uses timestamped `Paystack-Signature` headers. With it unset, the API verifies the legacy `x-paystack-signature` with the Paystack API secret. |

Use the existing Flutterwave test settings for fallback and verify both webhook URLs against the staging API. To roll back, set `PAYMENT_PRIMARY_PROVIDER=flutterwave` and retain the Paystack credentials and webhook for outstanding references. Pending attempts retain their provider across configuration changes.

The automatic switch after a Paystack request is intentionally limited to HTTP `401` and `403` on initialization. Paystack `abandoned` remains pending because it indicates an incomplete transaction. If a closed attempt later reports a charge or verification details differ, its Payments drawer shows a review message alongside the provider and reference. Reconcile in the merchant dashboard before resolving the record or initiating any refund.
