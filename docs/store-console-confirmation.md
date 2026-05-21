# Store Console Confirmation

This file is the manual evidence ledger for external store dashboards.
Do not change a line to `confirmed` until the matching console state has been observed in the actual app record.
The checker also requires evidence dates and artifact paths/URLs, not only `confirmed` strings.
Use `pnpm release:capture-external-evidence` before and after console work to capture local gate output under `output/release-evidence/<timestamp>/`.
Use `pnpm release:capture-store-console` during App Store Connect / Play Console work to capture the store-console checker output plus `operator-checklist.md` and `manual-store-console-template.md`.
If browser access keeps failing, use [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md) to configure official API credentials for the same checks without committing secrets.

## App Store Connect / TestFlight

- App Store Connect/TestFlight: not confirmed
- Bundle ID: com.jipbab.note
- iOS build: 2026052001
- TestFlight processing: not confirmed
- Internal tester availability: not confirmed
- Evidence owner: app operator
- Evidence date: pending
- App Store Connect evidence date: pending
- App Store Connect evidence artifacts: pending
- Notes: Xcode upload succeeded, but the JipbabNote TestFlight dashboard state has not been verified. Latest 2026-05-21 20:29 KST browser check found a logged App Store Connect session and a `jipbab-note` app menu item, but TestFlight build processing/internal tester state for that app was not confirmed before the active tab returned to the App Store Connect login screen. Latest 2026-05-21 20:56 KST direct JipbabNote TestFlight URL check redirected to App Store Connect `authResult=FAILED`, so dashboard confirmation is blocked until Apple account reauthentication. Evidence artifacts: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T11-00-store-console-browser/app-store-connect-login-after-jipbab-note-switch.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-56-external-recheck/app-store-connect-auth-failed.png`. Latest 2026-05-21 external-status runs found no App Store Connect API credential env names. To avoid repeated browser-login blockers, configure `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, and `APP_STORE_CONNECT_API_PRIVATE_KEY_PATH` using [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md).

## Google Play Console / Internal Testing

- Play Console internal testing: not confirmed
- Android package: com.jipbab.note
- AAB upload: not confirmed
- Internal testing track: not confirmed
- Evidence owner: app operator
- Evidence date: pending
- Play Console evidence date: pending
- Play Console evidence artifacts: pending
- Notes: Latest 2026-05-21 20:56 KST browser check shows the Play Console developer account `정영빈`, personal account ID `6643795859283116682`, but Google Play still says developer account setup must be completed before publishing. Open blockers shown in the console: identity verification, Android device access verification through the Play Console mobile app, and contact phone verification after other verification tasks. The app creation button is disabled until account verification is complete, so `com.jipbab.note` AAB upload/internal testing cannot proceed yet. Evidence artifacts: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T11-00-store-console-browser/play-console-account-setup.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-56-external-recheck/play-console-account-setup-still-blocked.png`. Latest 2026-05-21 external-status runs found no Google Play service-account env name. After Play Console account verification and app creation, configure `GOOGLE_APPLICATION_CREDENTIALS` using [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md) to make internal-track verification repeatable.

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

- Finish developer account registration/payment/identity for `dudqks0319@gmail.com`.
- Create or open the app record for package `com.jipbab.note`.
- Upload the signed `app-release.aab` to an internal testing track.
- Confirm the internal testing track is created and processing/available.
- Change the three Google Play confirmation lines above to `confirmed` only after observing the actual app record.
- Optional API automation requires either `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`.
- API credential setup details: [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md)
- When a Google Play service-account credential is configured, `pnpm check:store-console-confirmation` creates a temporary Android Publisher edit, reads the `internal` track for package `com.jipbab.note`, checks version code `1`, and deletes the temporary edit without printing credential values.
