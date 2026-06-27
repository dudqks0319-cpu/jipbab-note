# Store Console Confirmation

This file is the manual evidence ledger for external store dashboards.
Do not change a line to `confirmed` until the matching console state has been observed in the actual app record.
The checker also requires evidence dates and artifact paths/URLs, not only `confirmed` strings.
Use `pnpm release:capture-external-evidence` before and after console work to capture local gate output under `output/release-evidence/<timestamp>/`.
Use `pnpm release:capture-store-console` during App Store Connect / Play Console work to capture the store-console checker output plus `operator-checklist.md`, `manual-store-console-template.md`, `store-api-env-template.txt`, `upload-artifacts.md`, and `android-release-artifact.txt`.
Use `pnpm release:store-api-credential-status` to check whether local store API credential env names, ignored secret files, and file permissions are ready without printing credential values. Prefer `.env.store-api.local` for store-only credential paths so App Store Connect / Google Play automation stays separate from normal app runtime env.
If browser access keeps failing, use [store-api-credentials-runbook.md](<repo>/docs/store-api-credentials-runbook.md) to configure official API credentials for the same checks without committing secrets.

## App Store Connect / TestFlight

- App Store Connect/TestFlight: confirmed
- Bundle ID: com.jipbab.note
- iOS build: 2026060803
- TestFlight processing: confirmed
- Internal tester availability: confirmed
- Evidence owner: app operator
- Evidence date: 2026-06-25
- App Store Connect evidence date: 2026-06-25
- App Store Connect evidence artifacts: <repo>/output/release-evidence/2026-06-24T23-44-54-537Z-store-console
- Notes: Xcode archive/export/upload succeeded for build `2026060803`, and the App Store Connect API check confirmed build `2026060803` is `VALID` with an internal TestFlight group. API key `Jipbab Codex Check` is used through ignored local `.release-secrets/` and `.env.store-api.local`; credential values are not recorded here. Earlier browser/API evidence for build `2026052001` remains historical only.

## Google Play Console / Internal Testing

- Play Console internal testing: not confirmed
- Android package: com.jipbab.note
- AAB upload: not confirmed
- Internal testing track: not confirmed
- Evidence owner: app operator
- Evidence date: pending
- Play Console evidence date: pending
- Play Console evidence artifacts: pending
- Notes: Latest 2026-06-25 KST `pnpm release:capture-store-console` still reports App Store Connect/TestFlight pass for build `2026060803` and Google Play Console internal testing blocked. Play Console work remains an account ownership, payment, and verification decision and was not automated. The latest store-console packet records iOS IPA `ios/build/export-2026060803/App.ipa` sha256 `c8b9da612c3e5c7d49d7c7b5b390e3156df95e09a7b7910bb9645122f2c6d440`; Android internal testing remains pending until the Play Console app record and API credentials are set up.

## Unblock Checklist

### App Store Connect

- Sign in to App Store Connect in Chrome.
- Open the JipbabNote app record for bundle `com.jipbab.note`.
- Confirm uploaded build `2026060803` has finished processing in TestFlight.
- Add or confirm an internal tester group can install the build.
- Change the three App Store Connect confirmation lines above to `confirmed` only after observing the actual app record.
- Optional API automation requires `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, and `APP_STORE_CONNECT_API_PRIVATE_KEY_PATH`.
- API credential setup details: [store-api-credentials-runbook.md](<repo>/docs/store-api-credentials-runbook.md)
- When those values are configured, `pnpm check:store-console-confirmation` queries the App Store Connect API for bundle `com.jipbab.note`, the current Xcode build number, processed build state, and an internal TestFlight beta group without printing credential values.

### Google Play Console

- Finish developer account registration/payment/identity for `[redacted-google-account-email]`.
- Create or open the app record for package `com.jipbab.note`.
- Upload the signed `app-release.aab` to an internal testing track.
- Confirm the internal testing track is created and processing/available.
- Change the three Google Play confirmation lines above to `confirmed` only after observing the actual app record.
- Optional API automation requires either `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`.
- API credential setup details: [store-api-credentials-runbook.md](<repo>/docs/store-api-credentials-runbook.md)
- When a Google Play service-account credential is configured, `pnpm check:store-console-confirmation` creates a temporary Android Publisher edit, reads the `internal` track for package `com.jipbab.note`, checks version code `1`, and deletes the temporary edit without printing credential values.
