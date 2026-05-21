# 집밥노트 현재 출시 상태

Updated: 2026-05-21 20:56 KST

## Local code state

- Repo: `/Users/jyb-m3max/Desktop/codex/jipbab-note`
- Branch: `main`
- Store-readiness PR: PR #2, `feat(release): finalize store readiness gates`, merged into `origin/main` at merge commit `f0752ad2a72fb33081bd46cd02a13b61cfc4685f`.
- Latest pushed commits: use `git log -2 --oneline` for the exact current head.
- Remote tracking branch: `origin/main`
- Working tree after this ledger update: expected clean after the Vercel Production env/app smoke commit is pushed.
- Main branch state: latest store readiness work is merged into `origin/main`.
- PR readiness: completed; follow-up release work now happens on `main`.
- Release verdict: main is a local release candidate, not a production release. Supabase live/read/write/RLS checks, family sharing service-role write checks, Google/Apple/Kakao OAuth start flows, Vercel Production server-only env, production family sharing smoke, production account-deletion route smoke, and Supabase Auth URL Configuration pass. iOS build `2026052001` has been uploaded successfully for App Store Connect processing. Full real-device QA, TestFlight dashboard/internal tester availability for the actual JipbabNote app, and Play Console internal testing are still release blockers.

## Build identity

- Bundle ID: `com.jipbab.note`
- Marketing version: `1.0`
- Current project version observed from Xcode settings: `2026052001`
- Capacitor remote URL mode: `CAPACITOR_SERVER_URL` now points to `https://jipbab-note-app.vercel.app` in local release env.

## Verification evidence

- Family sharing PR review follow-up: pass on 2026-05-21. Family group create/join no longer depends on unchecked client table writes or the broken public `create_family_group` RPC path; the client now calls `/api/family-groups`, which validates device ID, invite code, member count, and uses the server service-role client only inside the API route.
- Abuse-control hardening: pass on 2026-05-21. Shared API rate-limit keys now use the trusted forwarded/real IP when available instead of combining IP with the user-controlled `x-device-id`, reducing device-header rotation bypass risk.
- Supabase SQL Editor: pass on 2026-05-21 for `public.get_family_group_members(uuid)`. The query returned `Success. No rows returned`. A later `create_family_group` RPC correction attempt hit SQL Editor input instability, so the app path was moved to the server API route and the live release check now verifies the service-role family table flow directly.
- `pnpm test`: pass on 2026-05-21 17:02 KST. Lint, `tsc --noEmit`, and 83 unit tests passed.
- `pnpm check:supabase-release`: pass on 2026-05-21 16:41 KST. 81 Supabase contract checks passed, failures 0.
- `SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live`: pass on 2026-05-21 16:41 KST. 19 checks passed, including temporary guest ingredient isolation and service-role family group insert, owner/joiner member insert, member readback, and cleanup.
- `pnpm release:external-check`: pass on 2026-05-21 16:41 KST. Supabase read-only live checks passed with 6 passes and OAuth live checks passed with 7 passes for Google, Apple, and Kakao provider starts.
- `pnpm release:check`: pass on 2026-05-21 16:43 KST. All 6 local release gates passed; `release-readiness`, `supabase-release`, `partner-links`, `store-assets`, `ios-release`, and `android-release` reported 0 failures.
- `pnpm build`: pass on 2026-05-21 16:43 KST after sandbox escalation. The sandboxed run failed with the known Turbopack local port restriction; the escalated rerun compiled 32 routes successfully, including new dynamic route `/api/family-groups`.
- `pnpm build`: pass again on 2026-05-21 16:55 KST after adding the Vercel production env gate. The build compiled 32 routes successfully.
- `pnpm build`: pass again on 2026-05-21 17:02 KST after adding production family route smoke and generic 503 handling for missing server config. The build compiled 32 routes successfully.
- `pnpm release:external-check`: blocked on 2026-05-21 17:02 KST for the intended reason. Supabase live read checks passed with 6 passes and OAuth live checks passed with 7 passes, then `pnpm check:vercel-production-env` failed because Production is missing `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS`; `check:production-family-route` is chained after that gate and will run after the encrypted envs are present.
- Vercel production deployment: pass on 2026-05-21 17:05 KST. Deployment `https://jipbab-note-hngb8kk9g-youngbeens-projects.vercel.app` completed and was aliased to `https://jipbab-note-app.vercel.app`; Vercel build compiled 32 routes including `/api/family-groups`.
- `pnpm check:production-family-route`: blocked on 2026-05-21 17:06 KST after the latest production deploy. Temporary cleanup succeeded, and create now returns the intended controlled `503` response with the generic Korean message `가족 공유 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.` because Vercel Production still lacks service-role env.
- `pnpm check:vercel-production-env`: blocked again on 2026-05-21 17:09 KST. Production still has 7 required env vars present and 2 missing: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`.
- `xcrun xctrace list devices`: blocked again on 2026-05-21 17:09 KST. iPhone `영빈` is still visible only under `Devices Offline`.
- `adb devices -l`: blocked again on 2026-05-21 17:09 KST. No Android physical device is attached.
- `pnpm test`: pass on 2026-05-21 17:14 KST after hardening `check:production-family-route`. Lint, `tsc --noEmit`, and 83 unit tests passed.
- `pnpm build`: pass on 2026-05-21 17:14 KST after hardening `check:production-family-route`. The build compiled 32 routes successfully.
- `pnpm release:check`: pass on 2026-05-21 17:14 KST. All 6 local release gates passed.
- `pnpm check:production-family-route`: blocked on 2026-05-21 17:14 KST before creating temporary production data. The smoke now checks Vercel Production env first and fails with `Vercel Production env missing: SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS`.
- `pnpm release:external-check`: blocked on 2026-05-21 17:14 KST for the intended reason. Supabase live read checks and OAuth live checks passed, then `pnpm check:vercel-production-env` failed on the same two missing Production env vars.
- `pnpm test`: pass on 2026-05-21 17:20 KST after adding `check:real-device-availability`. Lint, `tsc --noEmit`, and 86 unit tests passed.
- `pnpm build`: pass on 2026-05-21 17:20 KST after adding the real-device availability gate. The build compiled 32 routes successfully.
- `pnpm release:check`: pass on 2026-05-21 17:20 KST. All 6 local release gates passed.
- `pnpm check:real-device-availability`: blocked on 2026-05-21 17:20 KST. The new gate failed with iPhone `영빈` offline and no Android physical device attached; this gate is chained behind production env and family route smoke in `pnpm release:external-check`.
- `pnpm release:goal-check`: still blocked on 2026-05-21 17:20 KST with `Passed: 6`, `Blocked: 4`, `Missing: 0`.
- `pnpm test`: pass on 2026-05-21 17:27 KST after adding `check:store-console-confirmation`. Lint, `tsc --noEmit`, and 89 unit tests passed.
- `pnpm build`: pass on 2026-05-21 17:27 KST after adding the store console confirmation gate. The build compiled 32 routes successfully.
- `pnpm release:check`: pass on 2026-05-21 17:27 KST. All 6 local release gates passed.
- `pnpm check:store-console-confirmation`: blocked on 2026-05-21 17:27 KST. `docs/store-console-confirmation.md` still marks App Store Connect/TestFlight processing, TestFlight internal tester availability, Play Console internal testing, AAB upload, and Play internal testing track as not confirmed.
- `pnpm release:goal-check`: still blocked on 2026-05-21 17:27 KST with `Passed: 6`, `Blocked: 4`, `Missing: 0`.
- Account deletion server-config hardening: pass on 2026-05-21 17:34 KST. Missing server-only Supabase/admin configuration now returns a generic `503` for account-deletion admin routes instead of a raw server-config error.
- `pnpm test`: pass on 2026-05-21 17:34 KST after account-deletion server-config hardening. Lint, `tsc --noEmit`, and 92 unit tests passed.
- `pnpm build`: pass on 2026-05-21 17:34 KST after account-deletion server-config hardening. The build compiled 32 routes successfully.
- `pnpm release:check`: pass on 2026-05-21 17:34 KST. All 6 local release gates passed.
- Vercel production deployment: pass on 2026-05-21 17:39 KST. Deployment `https://jipbab-note-hncsktq8z-youngbeens-projects.vercel.app` completed and was aliased to `https://jipbab-note-app.vercel.app`; Vercel build compiled 32 routes including `/api/account-deletion-requests` and `/api/account-deletion-requests/[id]`.
- Production account-deletion smoke: blocked safely on 2026-05-21 17:39 KST. Both `https://jipbab-note-app.vercel.app/api/account-deletion-requests` and `https://jipbab-note-hncsktq8z-youngbeens-projects.vercel.app/api/account-deletion-requests` returned HTTP `503`, `Cache-Control: no-store`, and only the generic Korean message `계정 삭제 운영 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.`; no server env names, stack traces, or raw internal errors were exposed.
- `pnpm check:vercel-production-env`: blocked again on 2026-05-21 17:41 KST. Production still has 7 required env vars present and 2 missing: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`.
- `check:production-account-deletion-route`: added on 2026-05-21 17:47 KST and chained into `pnpm release:external-check` after the production family route smoke. The gate requires the privileged account-deletion list route to return `403` for unauthenticated access when production admin env is ready, and treats the current generic `503` as a blocked-but-safe state.
- `pnpm check:production-account-deletion-route`: blocked safely on 2026-05-21 17:47 KST. The production alias returned `503` with `Cache-Control: no-store`; the body did not expose server env names or internal traces.
- `pnpm test`: pass on 2026-05-21 17:47 KST after adding the production account-deletion route gate. Lint, `tsc --noEmit`, and 94 unit tests passed.
- `pnpm build`: pass on 2026-05-21 17:47 KST after sandbox escalation. The sandboxed run failed with the known Turbopack local port restriction; the escalated rerun compiled 32 routes successfully.
- `pnpm release:check`: pass on 2026-05-21 17:47 KST. All 6 local release gates passed.
- `pnpm release:external-check`: blocked on 2026-05-21 17:47 KST for the intended reason. Supabase live read checks passed with 6 passes, OAuth live checks passed with 7 passes, then `pnpm check:vercel-production-env` failed because Production is still missing `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS`; production family/account-deletion route gates are chained after that env gate.
- `pnpm release:goal-check`: still blocked on 2026-05-21 17:47 KST with `Passed: 6`, `Blocked: 4`, `Missing: 0`.
- `check:real-device-qa-evidence`: added on 2026-05-21 17:53 KST and chained into `pnpm release:external-check` after `check:real-device-availability`. The gate requires platform-specific iOS/Android evidence in `docs/real-device-qa.md` for core loop, Google/Apple/Kakao login behavior, local notification permission/scheduling, shopping external link, account deletion request, Android back navigation, and raw error disclosure.
- `pnpm check:real-device-qa-evidence`: blocked on 2026-05-21 17:53 KST. `docs/real-device-qa.md` intentionally starts with iOS and Android `not confirmed` because the iPhone is offline and no Android device is attached.
- `xcrun xctrace list devices`: blocked again on 2026-05-21 17:53 KST. iPhone `영빈` is still listed only under `Devices Offline`.
- `adb devices -l`: blocked again on 2026-05-21 17:53 KST. No Android physical device is attached.
- `pnpm test`: pass on 2026-05-21 17:53 KST after adding the real-device QA evidence gate. Lint, `tsc --noEmit`, and 96 unit tests passed.
- `pnpm build`: pass on 2026-05-21 17:53 KST after sandbox escalation. The sandboxed run failed with the known Turbopack local port restriction; the escalated rerun compiled 32 routes successfully.
- `pnpm release:check`: pass on 2026-05-21 17:53 KST. All 6 local release gates passed.
- `pnpm release:external-check`: blocked on 2026-05-21 17:53 KST for the intended reason. Supabase live read checks passed with 6 passes, OAuth live checks passed with 7 passes, then `pnpm check:vercel-production-env` failed because Production is still missing `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS`; real-device availability and real-device QA evidence gates are chained after the production route gates.
- `pnpm release:goal-check`: still blocked on 2026-05-21 17:53 KST with `Passed: 6`, `Blocked: 4`, `Missing: 0`.
- Goal completion direct-evidence gate: pass on 2026-05-21 18:00 KST. `scripts/verify-goal-completion.mjs` now reads `docs/real-device-qa.md` and `docs/store-console-confirmation.md` directly, so real-device QA, App Store Connect/TestFlight, and Play Console internal testing cannot pass from release-ledger wording alone.
- `pnpm test`: pass on 2026-05-21 18:00 KST after strengthening `release:goal-check`. Lint, `tsc --noEmit`, and 100 unit tests passed.
- `pnpm build`: pass on 2026-05-21 18:00 KST after sandbox escalation. The sandboxed run failed with the known Turbopack local port restriction; the escalated rerun compiled 32 routes successfully.
- `pnpm release:check`: pass on 2026-05-21 18:00 KST. All 6 local release gates passed.
- `pnpm release:external-check`: blocked on 2026-05-21 18:00 KST for the intended reason. Supabase live read checks passed with 6 passes, OAuth live checks passed with 7 passes, then `pnpm check:vercel-production-env` failed because Production is still missing `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS`.
- `pnpm release:goal-check`: still blocked on 2026-05-21 18:00 KST with `Passed: 6`, `Blocked: 4`, `Missing: 0`. The blocked evidence now points to direct files for real-device QA and store console confirmation.
- Vercel Production server env: pass on 2026-05-21 18:03 KST. `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` were added to Vercel Production as sensitive environment variables after explicit owner approval; values were not printed.
- `pnpm check:vercel-production-env`: pass on 2026-05-21 18:03 KST. Production now has all 9 required env names present, including server-only env names.
- Vercel Production server env recheck: pass on 2026-05-21 19:18 KST. `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` are present in Production; `pnpm check:production-family-route` and `pnpm check:production-account-deletion-route` both passed without printing secret values.
- Vercel production deployment: pass on 2026-05-21 18:05 KST. Deployment `https://jipbab-note-l9td64y2r-youngbeens-projects.vercel.app` completed and was aliased to `https://jipbab-note-app.vercel.app`; Vercel build compiled 32 routes including `/api/family-groups`, `/api/account-deletion-requests`, and `/api/account-deletion-requests/[id]`.
- Production family route smoke: pass on 2026-05-21 18:06 KST. `pnpm check:production-family-route` created a temporary family group, joined a second member, verified both members were returned, and deleted the temporary group.
- `pnpm check:production-account-deletion-route`: pass on 2026-05-21 18:06 KST. The production account-deletion admin list route returned `403` for unauthenticated access, kept `Cache-Control: no-store`, and did not expose server env names or internal traces.
- `pnpm release:external-check`: blocked on 2026-05-21 18:07 KST for the intended next blocker. Supabase live read checks passed, OAuth live checks passed, Vercel env passed, production family route smoke passed, production account-deletion route smoke passed, then `pnpm check:real-device-availability` failed because iPhone `영빈` is offline and no Android physical device is attached.
- Goal completion Vercel precedence fix: pass on 2026-05-21 18:08 KST. `scripts/verify-goal-completion.mjs` now lets current Vercel pass evidence override older historical blocked entries in this append-only release ledger.
- `pnpm release:goal-check`: blocked on 2026-05-21 18:14 KST with `Passed: 7`, `Blocked: 3`, `Missing: 0`. Remaining blockers are full real-device QA, App Store Connect/TestFlight dashboard confirmation, and Play Console internal testing.
- `pnpm check:store-console-confirmation`: blocked on 2026-05-21 18:14 KST. `docs/store-console-confirmation.md` still lacks confirmed App Store Connect/TestFlight processing, TestFlight internal tester availability, Play Console internal testing, AAB upload, and Play internal testing track evidence.
- `xcrun xctrace list devices`: blocked on 2026-05-21 18:15 KST after sandbox escalation. iPhone `영빈` is still visible only under `Devices Offline`.
- `adb devices -l`: blocked on 2026-05-21 18:15 KST after sandbox escalation. No Android physical device is attached.
- App Store Connect browser check: blocked on 2026-05-21 18:15 KST. Chrome shows the App Store Connect login form at `appstoreconnect.apple.com/login`, so JipbabNote TestFlight processing/internal tester availability cannot be verified from the current authenticated browser state.
- Play Console browser check: blocked on 2026-05-21 18:15 KST. Chrome shows `play.google.com/console/u/0/signup` and the `Play Console 개발자 계정 만들기` flow for `dudqks0319@gmail.com`, so AAB upload/internal testing cannot proceed until developer account registration/payment/identity is complete.
- Supabase Auth URL Configuration: pass on 2026-05-21 18:16 KST. Browser-confirmed Site URL is `https://jipbab-note-app.vercel.app`, and Redirect URLs include `https://jipbab-note-app.vercel.app/**`.
- `xcrun devicectl list devices`: blocked on 2026-05-21 18:24 KST. CoreDevice lists iPhone `영빈` as `unavailable` with model `iPhone 16 Pro (iPhone17,1)`.
- `xcrun xctrace list devices`: blocked again on 2026-05-21 18:24 KST. The same iPhone appears under `Devices Offline`.
- `adb devices -l`: blocked again on 2026-05-21 18:24 KST. No Android physical device is attached.
- App Store Connect browser check: blocked again on 2026-05-21 18:24 KST. Chrome remains at the App Store Connect login form.
- Play Console browser check: blocked again on 2026-05-21 18:24 KST. Chrome remains at the Play Console developer account creation screen for `dudqks0319@gmail.com`.
- Real-device availability gate hardening: pass on 2026-05-21 18:30 KST. `scripts/check-real-device-availability.mjs` now reads both `xcrun xctrace list devices` and `xcrun devicectl list devices`, so the iOS blocker reports CoreDevice `unavailable` instead of only a generic offline state.
- `pnpm test:unit`: pass on 2026-05-21 18:30 KST after the CoreDevice-aware availability gate change. All 100 unit tests passed.
- `pnpm release:external-check`: blocked on 2026-05-21 18:30 KST at the expected real-device gate. Supabase live read checks passed, OAuth live provider checks passed, Vercel Production env passed, production family route smoke passed, and production account-deletion route smoke passed; `pnpm check:real-device-availability` then failed with iPhone `영빈` CoreDevice `unavailable` and no attached Android physical device.
- Store console confirmation gate hardening: pass on 2026-05-21 18:37 KST. `scripts/check-store-console-confirmation.mjs` now reports missing optional store API credential names without printing values, so the App Store Connect and Google Play blockers clearly distinguish manual browser confirmation from unavailable API automation.
- `pnpm check:store-console-confirmation`: blocked on 2026-05-21 18:37 KST. The gate still requires App Store Connect/TestFlight and Google Play internal-testing confirmation evidence; it now also hints that App Store Connect API credential names and Google Play service-account credential names are not configured.
- `pnpm test:unit`: pass on 2026-05-21 18:37 KST after the store console confirmation hint change. All 101 unit tests passed.
- `pnpm release:external-status`: added and run on 2026-05-21 18:45 KST. Unlike `release:external-check`, it runs every external gate instead of stopping at the first failure. Current result is `Passed: 5`, `Blocked: 3`: Supabase live read/RLS, OAuth provider boundary, Vercel Production env, production family route smoke, and production account-deletion route smoke pass; real-device availability, real-device QA evidence, and store console confirmation remain blocked.
- Chrome console recheck: blocked on 2026-05-21 18:45 KST. App Store Connect still shows the login form at `appstoreconnect.apple.com/login`, and Play Console still shows `play.google.com/console/u/0/signup` developer account creation for `dudqks0319@gmail.com`.
- External Supabase live write/RLS gate hardening: pass on 2026-05-21 18:54 KST. `release:external-check` and `release:external-status` now run `check:supabase-live` with `SUPABASE_LIVE_WRITE_TEST=1`, so current external release checks verify temporary ingredient insert/readback/cross-device isolation/delete cleanup and service-role family group/member insert/readback/cleanup instead of read-only REST checks.
- `pnpm release:external-status`: blocked on 2026-05-21 18:54 KST with `Passed: 5`, `Blocked: 3`. Passing surfaces now include Supabase live read/write/RLS with 19 checks and 0 warnings, OAuth provider boundary, Vercel Production env, production family route smoke, and production account-deletion route smoke. Remaining blockers are real-device availability, real-device QA evidence, and store console confirmation.
- `pnpm release:external-check`: blocked on 2026-05-21 18:56 KST at the expected real-device gate. Supabase live read/write/RLS passed with 19 checks and 0 warnings, OAuth live passed, Vercel Production env passed, production family route smoke passed, and production account-deletion route smoke passed before `check:real-device-availability` failed on iPhone `영빈` CoreDevice `unavailable` and no attached Android physical device.
- Real-device/store evidence gate hardening: pass on 2026-05-21 19:00 KST. Real-device and store-console confirmation files now require non-pending evidence dates and artifact paths/URLs in addition to the `confirmed` state strings, so release completion cannot be claimed from confirmation text alone.
- `pnpm release:external-status`: blocked on 2026-05-21 19:02 KST with `Passed: 5`, `Blocked: 3`. Supabase live read/write/RLS, OAuth provider boundary, Vercel Production env, production family route smoke, and production account-deletion route smoke still pass; real-device availability, real-device QA evidence, and store console confirmation still block release completion.
- External evidence capture harness: added on 2026-05-21. `pnpm release:capture-external-evidence` writes external status, real-device availability, real-device QA evidence, store-console confirmation, `xcrun devicectl`, `xcrun xctrace`, and `adb devices -l` output to ignored `output/release-evidence/<timestamp>/` files with basic secret redaction.
- `pnpm release:capture-external-evidence`: run on 2026-05-21 19:10 KST. Generated local artifact directory `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-09-51-343Z`; command capture status was 3 passed, 4 blocked, 0 skipped. This is a local evidence artifact and remains ignored by git.
- Evidence artifact validation hardening: added after the 2026-05-21 19:10 KST capture. Real-device and store-console evidence gates now accept HTTP(S) artifact URLs or local artifact paths only when the path actually exists.
- `pnpm release:external-status`: blocked on 2026-05-21 19:22 KST with `Passed: 5`, `Blocked: 3`. Supabase live read/write/RLS, OAuth provider boundary, Vercel Production env, production family route smoke, and production account-deletion route smoke pass; real-device availability, real-device QA evidence, and store console confirmation remain blocked.
- `pnpm release:capture-external-evidence`: run on 2026-05-21 19:22 KST. Generated local artifact directory `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-22-25-522Z`; command capture status was 3 passed, 4 blocked, 0 skipped. This captures the current iPhone CoreDevice `unavailable`, Android not-attached, and store-console not-confirmed blockers.
- Store console API automation: added after the 2026-05-21 19:22 KST capture. `pnpm check:store-console-confirmation` can now use App Store Connect API credentials to verify build `2026052001` and an internal TestFlight beta group, and Google Play service-account credentials to verify the `internal` track includes Android version code `1`. Missing credentials still keep the gate blocked and no credential values are printed.
- `pnpm release:external-status`: blocked on 2026-05-21 19:31 KST with `Passed: 5`, `Blocked: 3` after adding store-console API automation. Supabase live read/write/RLS, OAuth provider boundary, Vercel Production env, production family route smoke, and production account-deletion route smoke still pass; real-device availability, real-device QA evidence, and store console confirmation still block release completion because store API credentials and manual console evidence are absent.
- Real-device QA packet capture: added on 2026-05-21 19:38 KST. `pnpm release:capture-real-device-qa` now writes device state, installed Android package state, iOS/Android native artifact inventory, and a manual QA confirmation template under ignored `output/release-evidence/<timestamp>-real-device-qa/` without marking QA confirmed.
- `pnpm release:capture-real-device-qa`: run on 2026-05-21 19:38 KST. Generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-38-01-050Z-real-device-qa`; captured iOS archive/app/IPA and Android AAB/debug APK inventory, but real-device availability and Android installed-package checks remain blocked because iPhone `영빈` is still unavailable and no Android device is attached.
- GitHub Actions release gate: added on 2026-05-21 19:46 KST. `.github/workflows/release-gate.yml` now runs `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, `pnpm release:ci-static-check`, and informational `pnpm release:goal-check || true` on push/PR to `main`; CI intentionally excludes machine-local native artifacts, live Supabase/OAuth/Vercel checks, physical-device QA, and store-console confirmation.
- `pnpm release:ci-static-check`: pass on 2026-05-21 19:46 KST. CI-safe static gates passed for Supabase release SQL/RLS contract, partner links, and store assets.
- GitHub Actions Release Gate: pass on 2026-05-21 19:52 KST for pushed commit `47ffefd`. Workflow run `26221496976` completed successfully on `main`.
- Vercel Production server env upsert: pass on 2026-05-21 19:53 KST. `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` were force-upserted from local `.env.local` into Vercel Production as sensitive values; values were not printed.
- Vercel production deployment: pass on 2026-05-21 19:54 KST. Deployment `https://jipbab-note-b9z5lfchw-youngbeens-projects.vercel.app` completed and was aliased to `https://jipbab-note-app.vercel.app`; Vercel build compiled 32 routes including `/api/family-groups`, `/api/account-deletion-requests`, and `/api/account-deletion-requests/[id]`.
- `pnpm check:vercel-production-env`: pass on 2026-05-21 19:55 KST. Production has all 9 required env names present, including `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS`.
- Production family route smoke: pass on 2026-05-21 19:55 KST. `pnpm check:production-family-route` created a temporary family group, joined a second member, verified both members were returned, and deleted the temporary group.
- `pnpm check:production-account-deletion-route`: pass on 2026-05-21 19:55 KST. The production account-deletion admin list route returned `403` for unauthenticated access, kept `Cache-Control: no-store`, and did not expose server env names or internal traces.
- `pnpm release:external-status`: blocked on 2026-05-21 20:29 KST with `Passed: 5`, `Blocked: 3` after sandbox escalation. Supabase live read/write/RLS, OAuth provider boundary, Vercel Production env, production family route smoke, and production account-deletion route smoke passed. Remaining blockers are real-device availability, real-device QA evidence, and store console confirmation.
- Play Console browser check: blocked on 2026-05-21 20:29 KST. The console shows developer account `정영빈`, personal account ID `6643795859283116682`, but account setup is incomplete; identity verification, Android device access verification, and contact phone verification block app creation and internal testing upload. Evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T11-00-store-console-browser/play-console-account-setup.png`.
- App Store Connect browser check: blocked on 2026-05-21 20:29 KST. A logged App Store Connect session showed the existing app menu and a `jipbab-note` app entry, but TestFlight processing/internal tester state for the JipbabNote app was not confirmed before the active tab returned to the App Store Connect login screen. Evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T11-00-store-console-browser/app-store-connect-login-after-jipbab-note-switch.png`.
- Real-device availability: blocked on 2026-05-21 20:29 KST. iPhone `영빈` remains CoreDevice `unavailable`; no Android physical device is attached.
- iPhone Mirroring real-device QA path: blocked on 2026-05-21 20:40 KST. iPhone Mirroring first reported the iPhone was in use and then required the Mac login password for `정영빈`, so unattended screen-based iOS QA cannot proceed. Evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-40-real-device-blockers/iphone-mirroring-mac-password-required.png`.
- External blocker recheck: blocked on 2026-05-21 20:56 KST. `pnpm release:goal-check` remains `Passed: 7`, `Blocked: 3`, `Missing: 0`; `pnpm check:real-device-availability` still reports iPhone `영빈` CoreDevice `unavailable` and no attached Android physical device. iPhone Mirroring still requires the Mac login password. Direct JipbabNote TestFlight URL `apps/6762567054/testflight/ios` redirects to App Store Connect `authResult=FAILED`, so App Store Connect must be reauthenticated before TestFlight state can be confirmed. Play Console still shows developer account setup incomplete and app creation disabled. Evidence artifacts: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-56-external-recheck/app-store-connect-auth-failed.png`, `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-56-external-recheck/play-console-account-setup-still-blocked.png`.
- Historical Vercel env blocker from 2026-05-21 16:49-16:55 KST is superseded by the later 18:03-18:06 KST Vercel Production env, family route smoke, and account-deletion route smoke passes above. Current `release:goal-check` has 3 blockers, not the earlier 4.
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
- `xcrun xctrace list devices`: blocked for real-device QA on 2026-05-20 23:27 KST. The iPhone is visible but listed under `Devices Offline`.
- `adb devices -l`: blocked for real-device QA on 2026-05-20 23:26 KST. The command runs successfully after sandbox escalation, but no Android device is attached.
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
- Supabase Auth URL configuration: pass on 2026-05-21. Site URL is `https://jipbab-note-app.vercel.app`, and Redirect URLs include `https://jipbab-note-app.vercel.app/**`.
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

- Vercel production: current aliases point to the 2026-05-21 production deployment for commit `e22bffa`. The attached recipe-detail server component error is no longer reproducible on the production alias. Server-only env is now present in Vercel Production, production family sharing create/join/cleanup smoke passes, and the account-deletion admin list route fails closed with unauthenticated `403`, `Cache-Control: no-store`, and no raw server details.
- App Store Connect/TestFlight: not dashboard-confirmed for JipbabNote after upload. Xcode upload for build `2026052001` succeeded and reported that the package is processing, but TestFlight dashboard availability/internal tester distribution has not been verified in the browser. Latest 2026-05-21 18:45 KST browser check is blocked at the App Store Connect login form.
- Store console confirmation evidence: not confirmed. `docs/store-console-confirmation.md` exists and `pnpm check:store-console-confirmation` now blocks external release checks until actual App Store Connect/TestFlight and Play Console internal testing evidence is recorded.
- Store API automation credentials: not configured. Latest 2026-05-21 19:02 KST `pnpm release:external-status` still reports no App Store Connect API env names and no Google Play service-account env name, so browser/dashboard confirmation remains the current path.
- App Store Connect latest browser pass: blocked on 2026-05-21. Chrome shows the App Store Connect login form at `appstoreconnect.apple.com/login`; no JipbabNote TestFlight processing state was verified.
- Supabase project discovery: `JipbabNote` project ref `xqelabiwtjntwrjqcteo` is restored and live checks now pass.
- Supabase account evidence: Gmail showed Supabase pause warning on 2026-05-14 and pause confirmation on 2026-05-15 for project `JipbabNote` (`xqelabiwtjntwrjqcteo`).
- Supabase CLI evidence: `supabase projects list` failed with `Unauthorized`, so local CLI auth cannot currently restore or inspect the hosted project.
- Production Supabase migration/application: local SQL contract verified and live project connection, read checks, write checks, RLS isolation, and family service-role table flow passed from the app harness. `get_family_group_members(uuid)` was applied through SQL Editor; family create/join in the app now uses the server API route to avoid depending on the previously failing public create RPC path.
- OAuth provider dashboard callbacks: verified for Google/Apple/Kakao provider start and callback configuration. Google Supabase redirect reaches `accounts.google.com`; Apple Supabase redirect reaches `appleid.apple.com` using Services ID `com.jipbab.note.web`; Kakao browser login now reaches the consent screen and returns to the app without `KOE205` after Biz App `account_email` consent setup.
- iPhone real-device QA: partial pass from the earlier run. Device `영빈` built, installed, and launched `com.jipbab.note`; screenshot capture was not available through the installed `devicectl` command set. Latest 2026-05-21 19:02 KST release gate shows CoreDevice state `unavailable`, so no additional OAuth/link/account-deletion checks can run yet.
- Android real-device QA: not done. Latest 2026-05-21 19:02 KST external-status recheck still returned no attached Android physical device.
- Real-device QA: not done for the complete release checklist. Current iPhone is visible but offline, and no Android device is connected, so OAuth callback, local notification, shopping link, and account-deletion request checks cannot be completed on physical devices yet. `pnpm check:real-device-availability` and `pnpm check:real-device-qa-evidence` now make both device availability and actual QA evidence machine-checkable.
- Play Console internal testing: not verified in this pass. Latest 2026-05-21 18:45 KST browser check shows Play Console developer account signup for the current Google account, so internal testing upload is blocked until the developer account registration/payment/identity steps are completed.

## Current release decisions

- Keep the launch focus on: fridge inventory, recipe recommendation, shopping list, and purchased-item-to-fridge conversion.
- Keep public community disabled by default until report/block/admin moderation and spam controls exist.
- Show users when fridge/shopping data falls back to local device storage.

## Next action

Before external release submission:

0. Run `pnpm release:external-status` to see every current external blocker at once; use `pnpm release:external-check` only when all blockers are expected to pass.
0.1. Run `pnpm release:capture-external-evidence` before and after real-device or store-console attempts, then use the generated `output/release-evidence/<timestamp>/summary.md` path as the matching evidence artifact after reviewing it for sensitive details.
0.2. Run `pnpm release:capture-real-device-qa` when physical devices are attached to create a device-state/artifact packet and a `manual-qa-template.md` that can be copied into `docs/real-device-qa.md` only after the matching checks are actually observed.
0.3. Confirm the GitHub `Release Gate` workflow is green after each push; it proves code/static release gates only and does not replace local native artifact checks or external store/device evidence.
1. Unlock/connect the iPhone until CoreDevice reports `available`, then run physical-device OAuth callback, local notification, shopping link, and account-deletion request checks. Record the results in `docs/real-device-qa.md` and rerun `pnpm check:real-device-qa-evidence`.
2. Connect an Android physical device or complete Play Console account setup before Android real-device/internal-testing QA.
3. Decide whether to use the generated Android upload-key candidate for Play Console. If yes, back up `.release-secrets/android-upload.jks` and `.env.android-signing.local`; if no, replace them with the real Play upload key and rerun `pnpm android:bundle-release && pnpm check:android-release`.
4. Sign in to App Store Connect, then confirm TestFlight processing and internal tester availability for uploaded build `2026052001` in the JipbabNote app record, not a different app record.
5. Finish Google Play developer account registration/payment/identity for `dudqks0319@gmail.com`, upload the signed Android AAB to Play Console internal testing, then confirm processing.
6. Upload `docs/app-store-screenshots/2026-05-19-iphone69` screenshots to App Store Connect and `docs/play-store-assets` images to Play Console.
7. Complete App Store Connect/Play Console privacy, support contact, and review notes.
