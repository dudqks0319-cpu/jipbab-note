# Store Console Confirmation

This file is the manual evidence ledger for external store dashboards.
Do not change a line to `confirmed` until the matching console state has been observed in the actual app record.
The checker also requires evidence dates and artifact paths/URLs, not only `confirmed` strings.
Use `pnpm release:capture-external-evidence` before and after console work to capture local gate output under `output/release-evidence/<timestamp>/`.
Use `pnpm release:capture-store-console` during App Store Connect / Play Console work to capture the store-console checker output plus `operator-checklist.md`, `manual-store-console-template.md`, `store-api-env-template.txt`, `upload-artifacts.md`, and `android-release-artifact.txt`.
Use `pnpm release:store-api-credential-status` to check whether local store API credential env names, ignored secret files, and file permissions are ready without printing credential values. Prefer `.env.store-api.local` for store-only credential paths so App Store Connect / Google Play automation stays separate from normal app runtime env.
If browser access keeps failing, use [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md) to configure official API credentials for the same checks without committing secrets.

## App Store Connect / TestFlight

- App Store Connect/TestFlight: confirmed
- Bundle ID: com.jipbab.note
- iOS build: 2026052001
- TestFlight processing: confirmed
- Internal tester availability: confirmed
- Evidence owner: app operator
- Evidence date: 2026-05-22
- App Store Connect evidence date: 2026-05-22
- App Store Connect evidence artifacts: /Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-39-42-614Z-store-console
- Notes: Xcode upload succeeded, and the App Store Connect API check confirmed build `2026052001` is `VALID` with an internal TestFlight group. API key `Jipbab Codex Check` was created with App Manager access, and the private key is stored only in ignored local `.release-secrets/`; credential values are not recorded here. Earlier browser evidence remains for history: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T11-00-store-console-browser/app-store-connect-login-after-jipbab-note-switch.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-56-external-recheck/app-store-connect-auth-failed.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T19-12-external-browser-recheck/app-store-connect-auth-failed.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-20-53-675Z-operator-handoff`.

## Google Play Console / Internal Testing

- Play Console internal testing: not confirmed
- Android package: com.jipbab.note
- AAB upload: not confirmed
- Internal testing track: not confirmed
- Evidence owner: app operator
- Evidence date: pending
- Play Console evidence date: pending
- Play Console evidence artifacts: pending
- Notes: Latest 2026-05-22 19:13 KST Computer Use browser check shows Play Console still at account-type selection for `[redacted-google-account-email]`. Continuing requires choosing personal or organization and moving into account creation/payment/verification, which is an account ownership and billing decision and was not automated. Therefore `com.jipbab.note` AAB upload/internal testing cannot proceed yet. Evidence artifacts: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T11-00-store-console-browser/play-console-account-setup.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-56-external-recheck/play-console-account-setup-still-blocked.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T19-12-external-browser-recheck/play-console-account-type.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T13-15-43-525Z-store-console`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T13-52-06-408Z-store-console`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-20-53-675Z-operator-handoff`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-25T23-07-20-611Z-store-console`. Latest 2026-05-26 08:07 KST `pnpm release:capture-store-console` still reports App Store Connect/TestFlight pass and Google Play Console internal testing blocked; `pnpm release:store-api-credential-status` reports App Store Connect API credentials ready and Google Play Developer API credentials missing. The store-console packet records the upload candidate inventory: iOS IPA `ios/build/export-2026052001/App.ipa` sha256 `e949d876d08b3f5b7c71e82e79991307f2b9b6c666e91214a617f9e008070c91` and Android signed AAB `android/app/build/outputs/bundle/release/app-release.aab` sha256 `3983ea9d7746a9db812868cea13320543d77b8266c824d7632c621372c98bbbd` with jarsigner verification passed. After Play Console account verification and app creation, configure `GOOGLE_APPLICATION_CREDENTIALS` using [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md) to make internal-track verification repeatable.

## Unblock Checklist

### App Store Connect

- Sign in to App Store Connect in Chrome.
- Open the JipbabNote app record for bundle `com.jipbab.note`.
- Confirm uploaded build `2026052001` has finished processing in TestFlight.
- Add or confirm an internal tester group can install the build.
- Change the three App Store Connect confirmation lines above to `confirmed` only after observing the actual app record.
- Optional API automation requires `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, and `APP_STORE_CONNECT_API_PRIVATE_KEY_PATH`.
- API credential setup details: [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md)
- When those values are configured, `pnpm check:store-console-confirmation` queries the App Store Connect API for bundle `com.jipbab.note`, build `2026052001`, processed build state, and an internal TestFlight beta group without printing credential values.

### Google Play Console

- Finish developer account registration/payment/identity for `[redacted-google-account-email]`.
- Create or open the app record for package `com.jipbab.note`.
- Upload the signed `app-release.aab` to an internal testing track.
- Confirm the internal testing track is created and processing/available.
- Change the three Google Play confirmation lines above to `confirmed` only after observing the actual app record.
- Optional API automation requires either `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`.
- API credential setup details: [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md)
- When a Google Play service-account credential is configured, `pnpm check:store-console-confirmation` creates a temporary Android Publisher edit, reads the `internal` track for package `com.jipbab.note`, checks version code `1`, and deletes the temporary edit without printing credential values.
