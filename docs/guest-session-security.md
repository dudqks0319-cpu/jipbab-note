# Signed guest session security contract

Date: 2026-07-10

## Decision

`device_id` is a local partition and diagnostics hint. It is never an authentication credential and no RLS policy, SECURITY DEFINER function, API authorization decision, or Storage write policy may trust `x-device-id`.

Remote ownership has exactly three states:

1. Unauthenticated: the Supabase `anon` role may read only explicitly public, publication-approved data.
2. Signed guest: Supabase Anonymous Sign-In issues a JWT and `auth.uid()`. Personal fridge, shopping, and favorites rows are owned only by that UID.
3. Permanent user: a signed Supabase user with `is_anonymous = false`. Family sharing, community writes, comments, account operations, and community image uploads require this state.

If a signed session cannot be created or verified, local-first fridge and shopping behavior remains available and remote writes fail closed.

## Client contract

- The shared Supabase client does not inject `x-device-id`.
- Personal sync obtains a server-verified Supabase user before reading or writing remote private rows.
- Anonymous session creation is opt-in through `NEXT_PUBLIC_SUPABASE_ANONYMOUS_AUTH_ENABLED=true`. Keep it disabled until the Supabase project has anonymous sign-ins, rate limits, cleanup, and CAPTCHA or equivalent abuse controls configured.
- Family and community cloud writes require a permanent user. Their existing local fallbacks remain available.
- UI authentication state hides anonymous Auth users; they are a transport identity, not a visible signed-in account.

## Migration contract

- Existing remote rows with `user_id is null` are legacy guest rows. They become inaccessible after the RLS migration and are not reassigned using a caller-supplied device ID.
- Local guest rows are re-owned by the verified signed UID when they are uploaded.
- Converting an anonymous user by linking an identity keeps the same UID.
- Signing into a different existing account requires proof of both sessions. `/api/auth/merge-anonymous` verifies the anonymous and permanent access tokens, then invokes a service-role-only transactional merge function.
- Duplicate favorites and likes are de-duplicated before reassignment. The source anonymous Auth user is deleted only after a successful merge.

## Rollout order

1. Back up affected tables and reconcile the local/remote migration history drift.
2. Apply `20260710140000_replace_device_guest_auth_with_signed_sessions.sql` in staging.
3. Run the negative RLS and Storage live checks with two distinct signed users plus an unauthenticated client.
4. Configure anonymous sign-in abuse controls and only then enable the client feature flag.
5. Observe auth creation rate, RLS denials, merge failures, and legacy-null row counts before production rollout.

## Rollback

Rollback disables anonymous cloud session creation and keeps guest data local. It must not restore header-based ownership. Production recovery may temporarily disable private-table writes while preserving public reads; re-enabling `x-device-id` authorization is not an accepted rollback.

## 2026-07-10 verification record

Runtime debugging hypotheses were exercised against the built application and release artifacts:

1. A forged or missing `x-device-id` might still authorize a private route. `pnpm test:integration` started the production server and observed `401` from unsigned family and anonymous-merge requests; the signed-session negative suite passed 8/8.
2. An unreviewed cached or fallback recipe might bypass the publication boundary. The same integration run observed `/api/recipes` returning zero publishable recipes, matching the 360/390/430 mobile empty-state captures.
3. A compact Android artifact might pass only because it is signed while omitting the executable shell. `pnpm check:android-release` inspected required bundle entries, parsed an HTTPS runtime URL, and independently verified the JAR signature; `pnpm cloudflare:build` also completed for all 36 routes.

The final local security gate passed: signed Auth UID ownership and permanent-user checks are explicit; request bodies and tokens fail closed; production dependencies have no known moderate-or-higher vulnerabilities; no tracked secret files were found; anonymous sign-in remains disabled for abuse control; and negative authorization paths are covered. Residual production risks, owners, and deadlines remain in `release-ledger.yaml`; no production migration or deployment is claimed here.
