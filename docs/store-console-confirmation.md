# Store Console Confirmation

This file is the manual evidence ledger for external store dashboards.
Do not change a line to `confirmed` until the matching console state has been observed in the actual app record.
The checker also requires evidence dates and artifact paths/URLs, not only `confirmed` strings.
Use `pnpm release:capture-external-evidence` before and after console work to capture local gate output under `output/release-evidence/<timestamp>/`.

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
- Notes: Xcode upload succeeded, but the JipbabNote TestFlight dashboard state has not been verified. Latest 2026-05-21 18:45 KST browser check shows the App Store Connect login form, so dashboard confirmation is blocked until sign-in. Latest 2026-05-21 18:54 KST external-status run found no App Store Connect API credential env names, so API automation is not currently available.

## Google Play Console / Internal Testing

- Play Console internal testing: not confirmed
- Android package: com.jipbab.note
- AAB upload: not confirmed
- Internal testing track: not confirmed
- Evidence owner: app operator
- Evidence date: pending
- Play Console evidence date: pending
- Play Console evidence artifacts: pending
- Notes: Latest 2026-05-21 18:45 KST browser check shows the Play Console developer account signup flow for `dudqks0319@gmail.com`; developer account registration/payment/identity is still blocking internal testing upload. Latest 2026-05-21 18:54 KST external-status run found no Google Play service-account env name, so API automation is not currently available.

## Unblock Checklist

### App Store Connect

- Sign in to App Store Connect in Chrome.
- Open the JipbabNote app record for bundle `com.jipbab.note`.
- Confirm uploaded build `2026052001` has finished processing in TestFlight.
- Add or confirm an internal tester group can install the build.
- Change the three App Store Connect confirmation lines above to `confirmed` only after observing the actual app record.
- Optional API automation requires `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, and `APP_STORE_CONNECT_API_PRIVATE_KEY_PATH`.

### Google Play Console

- Finish developer account registration/payment/identity for `dudqks0319@gmail.com`.
- Create or open the app record for package `com.jipbab.note`.
- Upload the signed `app-release.aab` to an internal testing track.
- Confirm the internal testing track is created and processing/available.
- Change the three Google Play confirmation lines above to `confirmed` only after observing the actual app record.
- Optional API automation requires either `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`.
