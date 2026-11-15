# REG-05 declaration, coupon and hosted checkout

Implemented locally on 13 November 2026 in [ApplyPage](../../../ifip-frontend/app/apply/page.tsx). Step 6 preserves the declaration statements and non-refundable levy disclosure. The fee summary labels the existing NGN and USD figures as estimates and displays discounts to the currency’s minor unit. The server still determines pricing and revalidates coupons. Paid drafts show confirmed payment and use the existing final submit route.

Coupon validation, declaration save, and checkout report their own request outcomes. The declaration must save before initiation or final submit. The active interface guards against overlapping requests. The hosted handoff retains the returned URL, `paymentReference`, and `paymentPollingToken`. Ambiguous checkout failures show the existing verification link when both polling credentials are available and direct applicants with a charge to check before paying again. A confirmed waiver without a setup token reports the waiver and points to existing email or support recovery. It does not claim successful submission or account readiness.

## Local checks

- `node .\node_modules\typescript\bin\tsc --noEmit --incremental false` passed.
- `node .\node_modules\eslint\bin\eslint.js app/apply/page.tsx -f json` exited 1 with 6 pre-existing errors and 15 pre-existing warnings, down from 9 errors and 18 warnings. The baseline comparison found no new diagnostics.
- Fifteen REG-05 and eleven REG-04 Playwright Chromium scenarios passed with request interception. REG-05 covered NGN and USD estimates, required declaration and focus, empty and rejected coupons, coupon removal, partial and full discounts, both waiver outcomes, paid-draft final submit, declaration save failure and retry, capacity and coupon revalidation rejections, slow responses, duplicate activation, and hosted navigation with stored callback credentials.
- Hosted checkout was a synthetic page. Real provider behavior, actual payment verification, waiver persistence and account creation remain open under REG-00. Checkout initiation still has no cross-session reconciliation or server idempotency guarantee from this UI work. The production build and live screen-reader session were outside this run.

## Screenshots

| Screen | 320 px | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- | --- |
| Payment and declaration | [320](verification/reg-05/checkout-320.png) | [375](verification/reg-05/checkout-375.png) | [768](verification/reg-05/checkout-768.png) | [1280](verification/reg-05/checkout-1280.png) |
| Partial coupon in USD | [320](verification/reg-05/discount-320.png) | [375](verification/reg-05/discount-375.png) | [768](verification/reg-05/discount-768.png) | [1280](verification/reg-05/discount-1280.png) |
| Waiver without a setup link | | [375](verification/reg-05/waiver-no-setup-375.png) | | |
