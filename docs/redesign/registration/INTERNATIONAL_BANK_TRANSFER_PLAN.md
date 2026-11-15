# International bank transfer for the commitment levy

**Status:** Implemented locally following approval. Staging verification is pending.

## 1. Offer bank transfer at checkout

- At the levy step of `/apply`, **Pay by bank transfer** is the only payment option for applicants whose application country is outside Nigeria and who owe a levy. Enforce this in both the checkout UI and the backend initiation route, so new non-Nigerian payments stay on the USD transfer path even when Flutterwave fallback is enabled. Use the existing server-calculated levy and coupon rules and preserve the full-waiver path. Show a support contact if the transfer instructions are unavailable.
- Once the applicant signs the declaration and chooses transfer, issue a unique IFIP transfer reference. Show the exact amount and currency, beneficiary name, bank name, account number, and any SWIFT/BIC, intermediary bank or routing details IFIP's bank requires. Explain the reference to put in the transfer narration, any applicable fee instructions, and when to send proof. [International wire details](https://www.nfiu.gov.ng/AdvisoryAndGuidance?fileName=ADVISORY+ON+FRAUDULENT+PETITIONS+INVOLVING+TRACING+AND+RECOVERY+OF+ELECTRONIC+WIRE+TRANSFERS+FROM+FOREIGN+BANKS+INTO+ACCOUNTS+IN+NIGERIAN+BANKS&filePath=C%3A%5Cinetpub%5Cwwwroot%5CNFIU%5Cwwwroot%5Cdocuments%5CAofwt_VXKM1S&handler=DownloadFile)
- Save the transfer instructions with the quoted amount, account version, cohort, and coupon so the applicant sees the same details when they resume. Reuse an existing transfer request on retry. Continue checking outstanding gateway attempts created before the change on their original provider. Issue transfer instructions after the earlier attempt is confirmed closed without a charge. Once a transfer has been reported, take the applicant back to its review status.

## 2. Receive the transaction ID and receipt

- Make **Upload payment proof** the default. Collect the bank transaction ID or UETR where available, transfer date, and a PDF, PNG or JPEG receipt up to 5 MB. Store receipts privately and serve them through the authorized admin download endpoint. Keep financial documents out of logs and notifications. [What a UETR identifies](https://wise.com/help/articles/62eJD6PSPoelJxzKF3kLXl/what-is-a-uetr-for-swift-payments-and-how-do-i-use-it/gqistvfdwz)
- Offer **Email payment proof** as a fallback using `ifip.program@gmail.com`. Prefill the subject with the IFIP reference and ask the applicant to attach the receipt and include the transaction ID and verified application email. A reviewer links the email evidence to the same transfer request through the admin queue. The email sender address alone establishes neither ownership of the application nor payment.
- Show **Awaiting proof**, **Under review**, **More information needed**, **Approved**, or **Closed** on the resumed application. Acknowledge proof when it reaches the queue. Give a specific next step if the reviewer needs a clearer receipt or a trace reference.

## 3. Reconcile, approve and enroll

- Add a finance review queue under **Admin → Payments**. Show the quoted amount and currency, applicant, cohort, submitted reference, and receipt. Reviewers match the evidence to a settled credit in IFIP's bank records. Capture the bank-side transaction identifier, credited amount and currency, settlement date, reviewer, and decision. Flag a shortfall, duplicate bank credit, wrong currency, or payment arriving after the deadline for review.
- Agree on how long a cohort seat and coupon are held for a bank transfer. Use a separate deadline suited to the receiving bank's settlement window. Release expired unreported holds and review reported or late credits before promising a seat. The admin queue should support a documented decision for a later cohort or refund if the original cohort cannot accept the applicant.
- On approval, atomically claim the bank credit and create or update one successful manual payment. Use the existing enrollment routine to create the participant account and application. Preserve the applicant's signed declaration and check for an existing successful payment or enrollment before approving. Retries and concurrent reviews must reuse the recorded result. Track approval as manual verification and audit who approved it.
- After enrollment succeeds, send the existing password setup link to the applicant's verified registration email. An authenticated applicant returning to the saved application can continue to setup after approval. If enrollment or email delivery fails, let staff retry that step against the approved record without reapproving the payment. Existing account holders continue through sign-in or account recovery.

## 4. Implement and test

1. Add the transfer request and reservation rules, private receipt upload, and resumable applicant status behind an enable switch.
2. Add reviewer intake for emailed proof, the reconciliation queue, guarded approval, and enrollment and password setup recovery.
3. Test the upload and email-assisted paths using isolated accounts and dummy receipts. Include direct API attempts to start a gateway checkout for a non-Nigerian applicant, full waivers, duplicate submissions and bank credits, concurrent review, insufficient or incorrect payment, late settlement, a full cohort, an expired coupon hold, an outstanding gateway payment, and failed enrollment or email delivery. Verify exactly one enrollment and that password setup opens only after bank confirmation and completed enrollment.

Before launch, configure the confirmed account instructions and payments inbox, set reviewer access and the review and reservation windows, and verify both proof submission paths in staging.

## Confirmed receiving account and inbox

IFIP confirmed the **Nextif Mentorship Ltd** Lead Bank account ending in `6481` for receiving USD programme levy payments. The supplied account type is **Personal checking**. Lead publishes `LEADUS49` for USD international wires on the supplied routing number. Use the confirmed account-specific transfer instructions for checkout. [Lead Bank international wire instructions](https://docs.lead.bank/api-integrations/wire/international-wires)

Store the full instructions in backend configuration and display the approved transfer methods at the verified applicant's checkout step. Use the bank's ACH trace number or wire reference/UETR as appropriate for the selected method. Use the existing `ifip.program@gmail.com` inbox for emailed receipts.

## Local configuration and review

- `BANK_TRANSFER_ACCOUNT_NUMBER` supplies the receiving account number on the backend. The local ignored `.env` is configured. USD checkout returns the IFIP support address when the number is absent. Restart the backend after changing its environment.
- `BANK_TRANSFER_HOLD_DAYS` defaults to five days. A receipt can still be reviewed after the hold expires. Approval rechecks the original cohort's status, remaining seats and coupon availability. If these checks fail, finance can record the applicant-facing decision and handle any reassignment or refund separately.
- The Payments screen uses the existing admin and superadmin authorization. Choose **Bank transfers** to open the queue, and **Attach emailed proof** to associate inbox evidence by IFIP reference. Verify the unique bank credit index exists in staging before allowing approvals.
