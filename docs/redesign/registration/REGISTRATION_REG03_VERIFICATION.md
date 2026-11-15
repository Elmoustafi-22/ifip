# REG-03 profile, academic forms and progress

Implemented and verified locally on 13 November 2026 in [ApplyPage](../../../ifip-frontend/app/apply/page.tsx). The form keeps the six persisted step numbers and the named progress indicator on narrow screens. Profile and academic fields use labeled native controls, with radio cards for academic status and independent selects for residence and dialing code. The native selects provide browser type-ahead and retain the existing option values. Previously saved academic status values remain visible if the current list excludes them or fails to load.

Submitting validates the current step, describes errors at the affected controls, and focuses the first invalid field. The date fields now reject impossible calendar dates before saving and retain the existing age check. Failed saves retain entries and allow a retry. A successful applicant PATCH advances the form and announces that progress was saved. The profile save waits for the initial OTP step-index write so an older response cannot overwrite the newer step.

## Local checks

- `node .\node_modules\typescript\bin\tsc --noEmit --incremental false` passed.
- `node .\node_modules\eslint\bin\eslint.js app/apply/page.tsx -f json` reported 12 pre-existing errors and 19 pre-existing warnings, down from 18 errors and 20 warnings. The targeted command still exits with lint failures. The baseline comparison found no new diagnostics.
- Ten Playwright Chromium scenarios passed against the local dev server with API interception and external requests blocked. They covered missing and invalid input, impossible dates and age validation, save rejection and retry, double-submit prevention, OTP save ordering, persisted step and field serialization, reload and Back, geolocation ordering and fallback, academic options loading, empty, failed, retry and saved-option recovery, keyboard submission, radio navigation, focus, status text and responsive reflow.
- The browser runs used synthetic data and reduced motion. Real applicant persistence, backend options, and staging integration remain open under REG-00. A production build and live screen-reader session were outside this verification run.

## Rendered screenshots

| Screen | 320 px | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- | --- |
| Personal profile | [320](verification/reg-03/profile-320.png) | [375](verification/reg-03/profile-375.png) | [768](verification/reg-03/profile-768.png) | [1280](verification/reg-03/profile-1280.png) |
| Academic background | [320](verification/reg-03/academic-320.png) | [375](verification/reg-03/academic-375.png) | [768](verification/reg-03/academic-768.png) | [1280](verification/reg-03/academic-1280.png) |
