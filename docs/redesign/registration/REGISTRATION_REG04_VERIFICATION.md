# REG-04 program interests, motivation and CV

Implemented locally on 13 November 2026 in [ApplyPage](../../../ifip-frontend/app/apply/page.tsx). Step 4 uses checkboxes for the existing primary-interest array and keeps one optional secondary selection. Restored choices are available even if the current options response excludes them. Step 5 groups experience, motivation, and CV and links. Existing text values, payload keys, numeric steps, and the upload service remain in use.

The CV picker displays the enforced PDF and 5 MB rules before the control. It shows an upload in progress until storage is confirmed, allows a retry after request failure, and directs expired sessions to the existing email resume path. After an uncertain replacement, the previous confirmed URL stays in the local draft and is omitted from the next profile PATCH to avoid overwriting the server’s current value. Upload and draft-save requests cannot overlap through the active form.

## Local checks

- `node .\node_modules\typescript\bin\tsc --noEmit --incremental false` passed.
- `node .\node_modules\eslint\bin\eslint.js app/apply/page.tsx -f json` exited 1 with 9 existing errors and 18 existing warnings, down from 12 errors and 19 warnings. No new diagnostics were found.
- Eleven REG-04 Chromium scenarios passed on the local frontend. They covered keyboard selection, single and multiple interest payloads, archived labels, options retry and empty states, required inputs, PDF type and size including exactly 5 MB, signed upload and persistence, proxy fallback, session expiry, failed replacement and retry, step-save rejection, reload, Back, and reflow.
- Ten REG-03 regression scenarios also passed for the shared step-save and navigation behavior. All API and Cloudinary responses used intercepted fixtures. The fixtures verify frontend behavior, including the multipart fallback path, while staging verification still needs to cover real provider and database persistence.
- The production build and live screen-reader verification were outside this run. The mobile capture shows the browser truncating its native file-input empty text at 320 px. The separate control label, file requirements and upload status remain visible.

## Screenshots

| Screen | 320 px | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- | --- |
| Program interest | [320](verification/reg-04/interest-320.png) | [375](verification/reg-04/interest-375.png) | [768](verification/reg-04/interest-768.png) | [1280](verification/reg-04/interest-1280.png) |
| Skills and motivation | [320](verification/reg-04/skills-320.png) | [375](verification/reg-04/skills-375.png) | [768](verification/reg-04/skills-768.png) | [1280](verification/reg-04/skills-1280.png) |
