# 집밥노트 현재 출시 상태

Updated: 2026-05-20 23:24 KST

## Local code state

- Repo: `/Users/jyb-m3max/Desktop/codex/jipbab-note`
- Branch: `main`
- Store-readiness PR: PR #2, `feat(release): finalize store readiness gates`, merged into `origin/main` at merge commit `f0752ad2a72fb33081bd46cd02a13b61cfc4685f`.
- Latest pushed commits: use `git log -2 --oneline` for the exact current head.
- Remote tracking branch: `origin/main`
- Working tree after this ledger update: expected clean after the iOS build-number commit is pushed.
- Main branch state: latest store readiness work is merged into `origin/main`.
- PR readiness: completed; follow-up release work now happens on `main`.
- Release verdict: main is a local release candidate, not a production release. Supabase live/read/write/RLS checks and Google/Apple/Kakao OAuth start flows pass, and iOS build `2026052001` has been uploaded successfully for App Store Connect processing. Full real-device QA, TestFlight dashboard/internal tester availability for the actual JipbabNote app, and Play Console internal testing are still release blockers.

## Build identity

- Bundle ID: `com.jipbab.note`
- Marketing version: `1.0`
- Current project version observed from Xcode settings: `2026052001`
- Capacitor remote URL mode: `CAPACITOR_SERVER_URL` now points to `https://jipbab-note-app.vercel.app` in local release env.

## Verification evidence

- `pnpm test`: pass on 2026-05-20 19:54 KST after OAuth hardening. Lint, `tsc --noEmit`, and 73 unit tests passed.
- `pnpm build`: pass on 2026-05-20 19:50 KST after OAuth hardening. The sandboxed run still fails with Turbopack local port restrictions, but the same build passes with the required local build permissions.
- `git diff --check`: pass on 2026-05-20 19:54 KST.
- `pnpm mobile:sync:ios`: pass on 2026-05-20 22:16 KST. `CAPACITOR_SERVER_URL=https://jipbab-note-app.vercel.app` was verified against the production app marker, `ios/App/App/capacitor.config.json` was regenerated, and the App Store-safe iOS package targets were re-applied.
- `pnpm mobile:sync:android`: pass on 2026-05-20 22:16 KST. `CAPACITOR_SERVER_URL=https://jipbab-note-app.vercel.app` was verified against the production app marker and `android/app/src/main/assets/capacitor.config.json` was regenerated.
- iOS build number bump: pass on 2026-05-20 23:12 KST. `CURRENT_PROJECT_VERSION` was increased from `2026050802` to `2026052001`.
- `pnpm mobile:sync:ios`: pass again on 2026-05-20 23:12 KST after the build-number bump. `public/runtime-app-config.json` was regenerated with `https://jipbab-note-app.vercel.app`.
- iOS release archive: pass on 2026-05-20 23:14 KST with `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination generic/platform=iOS -archivePath ios/build/JipbabNote-2026052001.xcarchive archive`.
- iOS App Store upload: pass on 2026-05-20 23:17 KST with `xcodebuild -exportArchive -archivePath ios/build/JipbabNote-2026052001.xcarchive -exportPath ios/build/export-2026052001 -exportOptionsPlist ios/exportOptions-app-store-connect.plist`. Xcode reported `Uploaded package is processing`, `Upload succeeded`, and `Uploaded App`.
- iOS local IPA export: pass on 2026-05-20 23:19 KST with `xcodebuild -exportArchive -archivePath ios/build/JipbabNote-2026052001.xcarchive -exportPath ios/build/export-2026052001 -exportOptionsPlist ios/build/export-2026050802-rerun/ExportOptions.plist`.
- `pnpm check:ios-release`: pass on 2026-05-20 23:20 KST. 18 checks passed, failures 0; project and archive build number are `2026052001`, App Store upload history shows uploaded build `2026052001`, and local IPA SHA-256 is `e949d876d08b3f5b7c71e82e79991307f2b9b6c666e91214a617f9e008070c91`.
- `pnpm release:check`: pass on 2026-05-20 23:20 KST after build `2026052001`. All 6 local gates passed; `release-readiness`, `supabase-release`, `partner-links`, `store-assets`, `ios-release`, and `android-release` reported 0 failures.
- `pnpm build`: pass on 2026-05-20 23:24 KST after sandbox escalation. The sandboxed run failed with Turbopack `Operation not permitted` while binding a local port; the escalated rerun compiled 31 routes successfully.
- `pnpm release:check`: pass on 2026-05-20 22:17 KST. All 6 local gates passed after the Capacitor/runtime URL sync; `release-readiness`, `supabase-release`, `partner-links`, `store-assets`, `ios-release`, and `android-release` reported 0 failures.
- `pnpm release:external-check`: pass on 2026-05-20 22:18 KST. Supabase live REST read checks passed with 6 passes, 0 failures, and Google/Apple/Kakao OAuth provider start checks passed with 7 passes, 0 failures.
- `SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live`: pass on 2026-05-20 22:18 KST. 12 checks passed, including temporary guest insert, same-device readback, cross-device negative read, and delete cleanup.
- `pnpm check:supabase-release`: pass on 2026-05-20 22:20 KST. 68 Supabase contract checks passed, failures 0.
- `node scripts/check-oauth-live.mjs`: pass on 2026-05-20 22:18 KST. Enabled providers are `google`, `apple`, and `kakao`; redirects reach `accounts.google.com`, `appleid.apple.com`, and `kauth.kakao.com`; Kakao provider page no longer returns `KOE205`.
- `pnpm test`: pass on 2026-05-20 22:31 KST. Lint, `tsc --noEmit`, and 75 unit tests passed.
- `pnpm build`: pass on 2026-05-20 22:26 KST with sandbox escalation because Turbopack needed local process/port permissions. The sandboxed run failed with `Operation not permitted` while binding a local port; the escalated rerun compiled 31 routes successfully.
- Login UI browser check: pass on 2026-05-20. Production `/login` renders Google, Apple, and Kakao buttons with provider-appropriate labels and visual treatment (`Google로 계속하기`, `Apple로 로그인`, `카카오 로그인`).
- Apple Developer/Supabase provider setup: pass on 2026-05-20. Apple App ID has Sign in with Apple, Services ID `com.jipbab.note.web` uses the Supabase callback URL, Supabase Apple provider is enabled, and the private key is stored only under ignored `.release-secrets/`.
- Apple production browser check: pass up to provider boundary on 2026-05-20. `Apple로 로그인` redirects to `appleid.apple.com` with Services ID `com.jipbab.note.web`; final Apple account authorization still requires the account holder.
- Kakao Developers console: pass on 2026-05-20. App `1462923` is a personal developer Biz App, representative domain is `https://jipbab-note-app.vercel.app`, app icon is configured, Kakao Login/client secret/redirect URI are configured, `account_email` is required consent, and profile nickname/image are optional consent.
- Kakao real browser login check: pass on 2026-05-20. Production `카카오 로그인` no longer returns `KOE205`; Kakao consent completes and the app returns to the JipbabNote home flow.
- Supabase Auth URL configuration: pass on 2026-05-20. Site URL was changed from the Vercel project default domain to `https://jipbab-note-app.vercel.app`; canonical redirect allow-list update was attempted from the dashboard and should be rechecked once the dashboard state refreshes.
- `node scripts/check-oauth-live.mjs`: pass on 2026-05-20. The script now requires `KAKAO_ACCOUNT_EMAIL_PERMISSION_CONFIRMED=true` because Supabase Kakao requests `account_email` by default, and the configured Kakao Biz App consent satisfies that gate.
- `pnpm test`: pass on 2026-05-19 20:51 KST, including lint, `tsc --noEmit`, and 65 unit tests.
- `pnpm build`: pass on 2026-05-19 20:52 KST with sandbox escalation because Turbopack needed local process/port permissions. Latest rerun compiled 31 routes successfully.
- `pnpm release:check`: pass on 2026-05-19. It runs 6 local gates (`release-readiness`, `supabase-release`, `partner-links`, `store-assets`, `ios-release`, `android-release`) and reports `Passed: 6`, `Failed: 0`. Environment source is `.env.local + .env.android-signing.local + process.env`.
- `pnpm test`: pass again on 2026-05-19 23:00 KST after security hardening, including lint, `tsc --noEmit`, and 70 unit tests.
- `pnpm build`: pass again on 2026-05-19 23:00 KST after security hardening. The first sandboxed run failed with Turbopack `Operation not permitted` while binding a local port; the escalated rerun compiled successfully.
- `pnpm release:check`: pass again on 2026-05-19 23:00 KST. 6 local gates passed, failures 0.
- `git diff --check`: pass on 2026-05-19 22:52 KST.
- Recipe detail local production check: pass on 2026-05-19 23:00 KST. `http://127.0.0.1:3012/recipe/a36e34ec-5f17-4e4a-8e07-246b8082447e` returned `200 OK`, rendered normal recipe HTML, and did not contain `__next_error__`, `An error occurred`, or `문제가 발생했습니다` markers.
- Recipe detail production check: pass after redeploy on 2026-05-19 23:16 KST. `https://jipbab-note-app-youngbeens-projects.vercel.app/recipe/a36e34ec-5f17-4e4a-8e07-246b8082447e` changed from `500` to `200 OK`, and the HTML no longer contains `__next_error__`, `An error occurred`, or `문제가 발생했습니다` markers.
- Vercel production deployment: pass on 2026-05-19 23:15 KST. New deployment `dpl_Erb3iipEj5RscDbeAG4hSFvaKJWb` is Ready, created 2026-05-19 23:13:54 KST, and aliases now include `https://jipbab-note-app.vercel.app`, `https://jipbab-note-app-youngbeens-projects.vercel.app`, and `https://jipbab-note-app-dudqks0319-cpu-youngbeens-projects.vercel.app`.
- Vercel upload fix: pass on 2026-05-19. First deploy attempted to upload 1.9GB and failed with a Vercel API upload error; `.vercelignore` reduced the deploy input to 66.3MB by excluding local/native build artifacts, env files, and release secrets.
- Production recipes API check: pass on 2026-05-19 23:16 KST. `/api/recipes?size=3` returned stored recipe data from Supabase.
- Security hardening checks: request rate-limit keys now prefer network identity over user-controlled device identity, external recipe/product URLs are normalized to app-local or HTTPS URLs only, the global production error page no longer renders raw `error.message`, privileged account-deletion API responses are marked `Cache-Control: no-store`, and invalid privileged JSON/route identifiers are rejected before Supabase admin queries.
- `pnpm store-assets:prepare`: pass on 2026-05-19. Generated App Store 6.9형 screenshots, Play Store phone screenshots, and Play Store feature graphic.
- `pnpm check:store-assets`: pass on 2026-05-19. 13 store asset checks passed, failures 0.
  - App Store screenshots: `docs/app-store-screenshots/2026-05-19-iphone69/*.png`, 1290x2796
  - Play Store phone screenshots: `docs/play-store-assets/phone/*.jpg`, 1080x1920
  - Play Store feature graphic: `docs/play-store-assets/feature-graphic.png`, 1024x500 RGB
- `pnpm release:goal-check`: still not complete as of 2026-05-20 because full real-device QA, App Store Connect/TestFlight dashboard confirmation for JipbabNote, and Play Console internal testing are not verified. Supabase and OAuth blockers are no longer missing after the 2026-05-20 checks.
- `pnpm release:external-check`: pass on 2026-05-19 after restoring the `JipbabNote` Supabase project. Read-only live checks passed with 6 passes, 0 failures, 1 warning because write testing was intentionally skipped.
- `SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live`: pass on 2026-05-19 after fixing the local recipe source schema check. 12 checks passed, including insert/readback, cross-device isolation, and cleanup.
- `git diff --check`: pass on 2026-05-19 20:53 KST.
- Secret scan: pass on 2026-05-19 20:53 KST. No matches found outside ignored env, secret, build, output, and dependency paths.
- Git push: pass on 2026-05-19. Commit `0a62340 feat(release): finalize store readiness gates` was pushed to `origin/codex/jipbab-store-readiness`.
- Branch comparison: pass on 2026-05-19. `origin/codex/jipbab-store-readiness` is 20 commits ahead of `origin/main` and 0 commits behind.
- `pnpm check:supabase-release`: pass on 2026-05-19. 68 Supabase contract checks passed, failures 0.
- `pnpm check:partner-links`: pass on 2026-05-19. 6 partner-link checks passed, warnings 0, failures 0.
- `pnpm check:ios-release`: pass on 2026-05-19 after creating a fresh archive/export for current build `2026050802`.
  - Archive: `ios/build/JipbabNote-2026050802.xcarchive`
  - IPA: `ios/build/export-2026050802-rerun/App.ipa`
  - SHA-256: `f4a4d9e1e193a7c8247dfa844febc0eef28615c19251261a8ed1036c08e6718f`
  - Warning: archive has no successful App Store upload event yet.
- `pnpm check:android-release`: pass on 2026-05-19 after generating a local upload-key candidate and rebuilding the release AAB. `jarsigner` verification passed.
- `pnpm release:check` now also verifies privacy/terms/support/account-deletion policy content, App Store/Play metadata content, App Store/Play Store image asset dimensions, Android release identity, manifest permissions/features, Android Capacitor HTTPS WebView config, iOS Capacitor HTTPS WebView config, iOS Info.plist store-facing values, iOS SPM native plugin pinning, public runtime remote URL consistency, and chains Supabase/partner/store-assets/iOS/Android artifact checks after the primary environment gate.
- `scripts/check-supabase-live.mjs`: updated on 2026-05-19 to check `recipe_sources` using the live schema fields `provider,title` instead of the stale `source_name` field.
- `pnpm mobile:sync:ios`: pass on 2026-05-19 using the configured remote server URL.
- iOS release archive: pass on 2026-05-19 with `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination generic/platform=iOS -archivePath ios/build/JipbabNote-2026050802.xcarchive archive`.
- iOS release export: pass on 2026-05-19 with `xcodebuild -exportArchive -archivePath ios/build/JipbabNote-2026050802.xcarchive -exportPath ios/build/export-2026050802-rerun -exportOptionsPlist ios/build/export-2026050802/ExportOptions.plist`.
- Previous iOS App Store upload attempt: blocked by App Store Connect because build `2026050802` already exists there (`The bundle version must be higher than the previously uploaded version: '2026050802'.`). This was resolved by uploading build `2026052001`; TestFlight processing and internal tester availability still need dashboard confirmation.
- iOS simulator: iPhone 17, iOS 26.2, `xcodebuild` Debug build succeeded, app installed/launched, Home and Shopping tabs opened.
- `pnpm mobile:sync:android`: pass on 2026-05-19 using the configured remote server URL.
- Android debug build: pass on 2026-05-19 with JDK 21 and Android SDK path set for the command.
  - Command: `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/Users/jyb-m3max/Library/Android/sdk ANDROID_SDK_ROOT=/Users/jyb-m3max/Library/Android/sdk ./gradlew assembleDebug`
  - Output: `android/app/build/outputs/apk/debug/app-debug.apk`
  - SHA-256: `6a93fbea7f6bfa61bf892fff8dd9721d150c3b85ac71b22fdd25fb6ba51338d4`
- Android release AAB build: pass on 2026-05-19 with JDK 21 and Android SDK path set for the command.
  - Command: `pnpm android:bundle-release`
  - Output: `android/app/build/outputs/bundle/release/app-release.aab`
  - SHA-256: `3983ea9d7746a9db812868cea13320543d77b8266c824d7632c621372c98bbbd`
  - Signing: pass with local upload-key candidate. Keystore is `.release-secrets/android-upload.jks`; env file is `.env.android-signing.local`. Both are ignored by git and must be backed up if used for Play Console.
- Android emulator system image: repaired on 2026-05-19 by installing `system-images;android-36.1;google_apis_playstore;arm64-v8a`; system image size is 2.3GB and `kernel-ranchu` is present.
- Android emulator smoke: pass on 2026-05-19 after restarting `Medium_Phone_API_36.1` with explicit DNS servers. Debug APK installed, app launched, Home and Shopping tabs rendered.
- Shopping sync fallback: pass on 2026-05-19. Supabase shopping list reads now merge with cached local shopping items, so a successful but empty remote response does not erase locally added shopping rows.
- Auth migration visibility: pass on 2026-05-19. My Page no longer labels sync as normal when auth or device-data migration errors exist; it shows `확인필요` or `일부확인` based on migration table results.
- Latest screenshot evidence:
  - `output/jipbab-note-release-loop-20260519.png`
  - `output/jipbab-note-shopping-20260519.png`
  - `output/jipbab-note-ios-home-rerun-20260519.jpg`
  - `output/jipbab-note-ios-shopping-rerun-20260519.jpg`
  - `output/jipbab-note-android-smoke-dns-20260519.png`
  - `output/jipbab-note-android-shopping-20260519.png`

## External state

- Vercel production: current aliases point to the 2026-05-19 production deployment. The attached recipe-detail server component error is no longer reproducible on the production alias.
- App Store Connect/TestFlight: not dashboard-confirmed for JipbabNote after upload. Xcode upload for build `2026052001` succeeded and reported that the package is processing, but TestFlight dashboard availability/internal tester distribution has not been verified in the browser.
- App Store Connect latest browser pass: blocked on 2026-05-20. Chrome is authenticated enough to show the ASC shell but `/apps` stays blank, while Safari redirects to `/login?targetUrl=%2Fapps&authResult=FAILED`; no JipbabNote TestFlight processing state was verified.
- Supabase project discovery: `JipbabNote` project ref `xqelabiwtjntwrjqcteo` is restored and live checks now pass.
- Supabase account evidence: Gmail showed Supabase pause warning on 2026-05-14 and pause confirmation on 2026-05-15 for project `JipbabNote` (`xqelabiwtjntwrjqcteo`).
- Supabase CLI evidence: `supabase projects list` failed with `Unauthorized`, so local CLI auth cannot currently restore or inspect the hosted project.
- Production Supabase migration application: local SQL contract verified and live project connection, read checks, write checks, and RLS isolation checks passed from the app harness.
- OAuth provider dashboard callbacks: verified for Google/Apple/Kakao provider start and callback configuration. Google Supabase redirect reaches `accounts.google.com`; Apple Supabase redirect reaches `appleid.apple.com` using Services ID `com.jipbab.note.web`; Kakao browser login now reaches the consent screen and returns to the app without `KOE205` after Biz App `account_email` consent setup.
- iPhone real-device QA: partial pass. Device `영빈` built, installed, and launched `com.jipbab.note`; screenshot capture was not available through the installed `devicectl` command set.
- Android real-device QA: not done. No Android device was connected in `adb devices -l`.
- Real-device QA: not done for the complete release checklist. Current iPhone is visible to CoreDevice but `unavailable`, and no Android device is connected, so OAuth callback, local notification, shopping link, and account-deletion request checks cannot be completed on physical devices yet.
- Play Console internal testing: not verified in this pass. Chrome redirects to Play Console developer account signup for the current Google account, so internal testing upload is blocked until the developer account registration/payment/identity steps are completed.

## Current release decisions

- Keep the launch focus on: fridge inventory, recipe recommendation, shopping list, and purchased-item-to-fridge conversion.
- Keep public community disabled by default until report/block/admin moderation and spam controls exist.
- Show users when fridge/shopping data falls back to local device storage.

## Next action

Before external release submission:

1. Recheck Supabase URL Configuration dashboard to confirm `https://jipbab-note-app.vercel.app/**` is present in Redirect URLs, not only as Site URL.
2. Unlock/connect the iPhone until CoreDevice reports `available`, then run physical-device OAuth callback, local notification, shopping link, and account-deletion request checks.
3. Connect an Android physical device or complete Play Console account setup before Android real-device/internal-testing QA.
4. Decide whether to use the generated Android upload-key candidate for Play Console. If yes, back up `.release-secrets/android-upload.jks` and `.env.android-signing.local`; if no, replace them with the real Play upload key and rerun `pnpm android:bundle-release && pnpm check:android-release`.
5. Confirm App Store Connect/TestFlight processing and internal tester availability for uploaded build `2026052001` in the JipbabNote app record, not a different app record.
6. Upload the signed Android AAB to Play Console internal testing after Google Play developer account creation is complete, then confirm processing.
7. Upload `docs/app-store-screenshots/2026-05-19-iphone69` screenshots to App Store Connect and `docs/play-store-assets` images to Play Console.
8. Complete App Store Connect/Play Console privacy, support contact, and review notes.
