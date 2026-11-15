# IFIP administrator MFA rollout

Administrator and superadministrator sessions require a password and an authenticator code. The API checks this for all requests carrying administrator privileges. Refresh preserves the original verification time, and a session ends no later than eight hours after that verification. An administrator password change or reset invalidates earlier sessions.

## Enroll an administrator

1. Sign in with the administrator email and password. If you already have an IFIP authenticator entry, use its six-digit code.
2. For first-time enrollment, enter the eight-digit code sent to the administrator mailbox. Scan the QR code in an authenticator app or use the setup key. Enter the six-digit code from that app to finish enrollment.
3. Sign out and sign back in to confirm the authenticator works. If the app is still showing the code just used, wait for the next code.

Protect administrator mailboxes with their own MFA. The mailbox verifies first-time enrollment and password recovery. Returning administrators use their enrolled authenticator. A password reset leaves the authenticator in place.

## Roll out safely

- Test the first-time flow with a staging mailbox and the returning flow with an enrolled administrator. Verify email delivery and that the production-shaped frontend and API domains allow the HTTP-only refresh cookie. Test a browser that blocks cross-site cookies if the frontend and API are hosted on different sites.
- Verify at least two named superadmin accounts and a documented recovery contact before production rollout. Existing privileged sessions issued before this change will require a fresh sign-in. Deploy the backend and frontend together so admins can complete enrollment.
- If an administrator loses their authenticator, verify identity through a separate trusted channel and have an authorized operator reset that account's MFA under an audited recovery procedure. Clear its authenticator secret, last accepted code step and pending challenge, disable its enrollment state, and require a password reset and fresh enrollment. Keep the other superadmin account available during recovery.
- In Admin → Payments, confirm that payment resolution, bank-transfer proof and review actions, approval, and setup-email resend work after sign-in and require fresh sign-in after ten minutes. Verify the same behavior for recording an offline payment and for superadmins changing levy prices or fee coupons. Match a manual credit to the actual bank statement before approving.

## Payment provider and finance follow-up

- In Paystack test mode, verify checkout with a restricted key that can initialize and verify transactions, and a separate webhook signing secret. Confirm the integration works before retiring a broad key. Keep transfer confirmation enabled and restrict portal access. [Paystack API keys](https://paystack.com/docs/developer-tools/api-keys/) · [Transfer confirmation](https://support.paystack.com/en/articles/2132866)
- Decide which named staff may approve bookkeeping changes and set up a second-person review for manual credits and refunds. Assign daily responsibility for reconciling verified payments and settlements against the bank statement. The ten-minute authenticator check supplements these controls.
- Keep admin MFA enabled on all accounts. For a later upgrade, evaluate phishing-resistant passkeys or hardware security keys for the accounts that control funds. [OWASP MFA guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
