# 집밥노트 현재 출시 상태

Updated: 2026-05-19 21:44 KST

## Local code state

- Repo: `/Users/jyb-m3max/Desktop/codex/jipbab-note`
- Branch: `codex/jipbab-store-readiness`
- Latest pushed release commit: `0a62340 feat(release): finalize store readiness gates`
- Remote tracking branch: `origin/codex/jipbab-store-readiness`
- Working tree before this ledger-only update: clean
- `origin/main` comparison before this ledger-only update: 20 commits ahead, 0 commits behind
- Main branch state: latest store readiness work is not merged into `origin/main` yet.
- PR readiness: PR creation is allowed after this ledger refresh and the local verification rerun.
- Release verdict: local release candidate branch, not a production release. External Supabase, OAuth, real-device QA, and store console confirmations remain blocked.

## Build identity

- Bundle ID: `com.jipbab.note`
- Marketing version: `1.0`
- Current project version observed from Xcode settings: `2026050802`
- Capacitor remote URL mode: `CAPACITOR_SERVER_URL` points to `https://jipbab-note-app-youngbeens-projects.vercel.app`

## Verification evidence

- `pnpm test`: pass on 2026-05-19 20:51 KST, including lint, `tsc --noEmit`, and 65 unit tests.
- `pnpm build`: pass on 2026-05-19 20:52 KST with sandbox escalation because Turbopack needed local process/port permissions. Latest rerun compiled 31 routes successfully.
- `pnpm release:check`: pass on 2026-05-19. It runs 6 local gates (`release-readiness`, `supabase-release`, `partner-links`, `store-assets`, `ios-release`, `android-release`) and reports `Passed: 6`, `Failed: 0`. Environment source is `.env.local + .env.android-signing.local + process.env`.
- `pnpm store-assets:prepare`: pass on 2026-05-19. Generated App Store 6.9형 screenshots, Play Store phone screenshots, and Play Store feature graphic.
- `pnpm check:store-assets`: pass on 2026-05-19. 13 store asset checks passed, failures 0.
  - App Store screenshots: `docs/app-store-screenshots/2026-05-19-iphone69/*.png`, 1290x2796
  - Play Store phone screenshots: `docs/play-store-assets/phone/*.jpg`, 1080x1920
  - Play Store feature graphic: `docs/play-store-assets/feature-graphic.png`, 1024x500 RGB
- `pnpm release:goal-check`: fail as expected on 2026-05-19. It reports `Passed: 4`, `Blocked: 5`, `Missing: 0`; blocked items are production Supabase live/write RLS, OAuth/provider callback confirmation, real-device QA, App Store Connect/TestFlight dashboard confirmation, and Play Console internal testing.
- `pnpm release:full-check`: blocked on 2026-05-19 only at the external Supabase live check. The local gate stage passed first, then `pnpm release:external-check` failed with `ENOTFOUND` for `xqelabiwtjntwrjqcteo.supabase.co`. An escalated network rerun of `pnpm release:external-check` failed the same way.
- `pnpm release:external-check`: blocked again on 2026-05-19 20:53 KST with `ENOTFOUND` for `xqelabiwtjntwrjqcteo.supabase.co`; escalated network rerun failed the same way.
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
- `pnpm check:supabase-live` / `pnpm release:external-check`: blocked on 2026-05-19 20:12 KST with `ENOTFOUND` for `xqelabiwtjntwrjqcteo.supabase.co`, including escalated network reruns before and after local release gates passed.
- `pnpm mobile:sync:ios`: pass on 2026-05-19 using the configured remote server URL.
- iOS release archive: pass on 2026-05-19 with `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination generic/platform=iOS -archivePath ios/build/JipbabNote-2026050802.xcarchive archive`.
- iOS release export: pass on 2026-05-19 with `xcodebuild -exportArchive -archivePath ios/build/JipbabNote-2026050802.xcarchive -exportPath ios/build/export-2026050802-rerun -exportOptionsPlist ios/build/export-2026050802/ExportOptions.plist`.
- iOS App Store upload attempt: blocked by App Store Connect because build `2026050802` already exists there (`The bundle version must be higher than the previously uploaded version: '2026050802'.`). Treat App Store Connect/TestFlight processing as an external follow-up to confirm in the dashboard, or bump `CURRENT_PROJECT_VERSION` before another upload.
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

- App Store Connect/TestFlight: upload attempt indicates build `2026050802` is already present in App Store Connect, but processing/TestFlight availability was not dashboard-confirmed in this pass.
- Supabase project discovery: `JipbabNote` project ref `xqelabiwtjntwrjqcteo` was visible earlier through the Supabase connector, but project status was `INACTIVE`.
- Supabase account evidence: Gmail showed Supabase pause warning on 2026-05-14 and pause confirmation on 2026-05-15 for project `JipbabNote` (`xqelabiwtjntwrjqcteo`).
- Supabase CLI evidence: `supabase projects list` failed with `Unauthorized`, so local CLI auth cannot currently restore or inspect the hosted project.
- Production Supabase migration application: local SQL contract verified; live project application is blocked because the project host does not resolve locally and connector migration listing required reauthentication.
- Real-device QA: not done in this pass.
- OAuth provider dashboard callbacks: not verified in this pass.

## Current release decisions

- Keep the launch focus on: fridge inventory, recipe recommendation, shopping list, and purchased-item-to-fridge conversion.
- Keep public community disabled by default until report/block/admin moderation and spam controls exist.
- Show users when fridge/shopping data falls back to local device storage.

## Next action

Before external release submission:

1. Reactivate/restore the `JipbabNote` Supabase project, then run `pnpm check:supabase-live` and `SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live`.
2. Decide whether to use the generated Android upload-key candidate for Play Console. If yes, back up `.release-secrets/android-upload.jks` and `.env.android-signing.local`; if no, replace them with the real Play upload key and rerun `pnpm android:bundle-release && pnpm check:android-release`.
3. Upload or submit the new iOS build `2026050802` archive/IPA, then confirm App Store Connect/TestFlight processing.
4. Upload the signed Android AAB to Play Console internal testing and confirm processing.
5. Upload `docs/app-store-screenshots/2026-05-19-iphone69` screenshots to App Store Connect and `docs/play-store-assets` images to Play Console.
6. Verify Google/Kakao/Apple OAuth callback URLs on a real iPhone and Android device.
7. Complete App Store Connect/Play Console privacy, support contact, and review notes.
