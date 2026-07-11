# Phase 6 SECURITY DEFINER 검토 보고서

Updated: 2026-07-11 KST

## 변경 전 상태와 원인

`public.handle_user_deletion()`은 `auth.users` 삭제 트리거로 PII를 지우는 `SECURITY DEFINER` 함수였지만, 함수 직접 실행 권한을 app role에서 명시적으로 회수하지 않았고 search path도 `public, auth`였다. 이전 가족 RLS 우회용 `public.family_group_member_count(uuid)`는 signed-session 정책 전환 뒤 호출자가 없어졌지만 definer 함수로 남아 있었다. 나머지 가족·익명 병합·레시피 버전·분산 레이트 리밋 함수의 권한 규칙은 여러 마이그레이션에 흩어져 있어 단일 출시 게이트가 전체 최종 상태를 증명하지 못했다.

## 변경 내용

- Migration: `20260711113000_harden_security_definer_privileges.sql`
- Rollback: `supabase/rollbacks/20260711113000_harden_security_definer_privileges.sql`
- Implementation commit: `c5e06f4d7771fc88529e789319f0145024548c22`
- `handle_user_deletion()`을 trigger-only로 유지하면서 `pg_catalog, public, auth` search path를 고정하고 `public`, `anon`, `authenticated`, `service_role` 직접 실행을 회수했다.
- 인증 사용자용 가족 helper/RPC는 app 역할을 전부 회수한 뒤 `authenticated`에만 다시 부여했다. 함수 본문의 permanent-user 또는 membership 검사는 그대로 유지했다.
- 서버 전용 익명 병합, 레시피 snapshot/capture/restore, rate-limit RPC는 app 역할과 기존 service-role 권한을 모두 회수한 뒤 `service_role`에만 다시 부여했다.
- signed-session 전환 뒤 사용되지 않는 `family_group_member_count(uuid)`를 제거했다. `CASCADE`를 사용하지 않으므로 남은 의존성이 있다면 migration이 안전하게 실패한다.
- `pnpm check:security-definer`를 추가하고 `pnpm release:security-check`에 연결했다.

## 데이터베이스·API·UI 영향

- 데이터 행과 테이블은 변경하지 않는다. 함수 search path, EXECUTE 권한, 사용되지 않는 함수 한 개만 변경한다.
- 계정 삭제 trigger 동작은 유지한다. trigger 실행은 app role의 함수 직접 실행 권한에 의존하지 않는다.
- 가족 RPC API 계약과 응답 형식은 변경하지 않는다. 익명·비회원 직접 호출은 허용하지 않는다.
- 프런트엔드와 사용자 UI 변경은 없다.
- rollback은 broad EXECUTE를 복원하지 않는다. 가족·서버 mutation RPC를 fail-closed로 비활성화하고 저장 데이터와 계정 삭제 trigger를 보존한다.

## 검증 결과

- `pnpm check:security-definer`: 14/14 pass
- 관련 보안 집중 테스트: 29/29 pass
- `pnpm check:supabase-release`: 146/146 pass
- `pnpm test`: lint 0 errors, TypeScript pass, unit 366/366 pass. 기존 App Store screenshot script의 unused import warning 1건은 이번 변경과 무관하다.
- `pnpm test:integration`: pass, 공개 승인 레시피 0개 노출 및 signed-session 음성 경로 유지
- `pnpm release:security-check`: 4/4 pass, production dependency moderate 이상 알려진 취약점 0건 포함
- `pnpm build`: Next.js 16.2.6 compile·TypeScript·38/38 routes pass
- `pnpm release:check`: 기존 11개 pass, Phase 5 사람 증거 0/20 한 항목만 expected fail

## 리뷰와 디버깅 가설

1. 계정 삭제 definer를 app role이 직접 실행할 수 있다는 가설은 이전 마이그레이션에 revoke가 없다는 정적 증거로 확인했고, 최종 hardening migration의 4-role revoke와 테스트로 차단했다.
2. legacy member-count definer가 다른 가족 그룹의 수를 노출할 수 있다는 가설은 signed-session 이후 사용처가 없다는 전체 검색 결과로 확인했고, non-cascade drop으로 공격면을 제거했다.
3. 여러 migration의 grant가 누적되어 최종 역할이 넓어질 수 있다는 가설은 각 역할을 먼저 전부 revoke하고 필요한 역할 하나만 재grant하는 최종 migration과 14개 계약 검사로 차단했다.

자체 5축 리뷰에서 권한 확대, 데이터 삭제, API 계약 변경, secret 노출, 테스트 약화는 발견되지 않았다.

## 미해결 위험과 운영 상태

- 이 머신에는 Supabase CLI만 있고 Docker와 `psql`이 없어 isolated PostgreSQL에서 migration/rollback을 실제 실행하지 못했다.
- 운영 migration history는 `20260508143719`에서 멈춰 있으므로 이 migration만 단독 적용하면 안 된다. 백업, history reconciliation, staging 왕복 검증이 선행돼야 한다.
- Supabase production에는 적용하지 않았다. Vercel Preview `dpl_EZdssB9T4Zv3FQCSrW6oQCnpq2Fq`도 이전 `be66b5f` 소스이며 Phase 6 DB 권한 변경을 포함하지 않는다.
- Phase 5 실제 조리·사람 검수는 여전히 0/20이므로 production 승격과 레시피 발행은 차단 상태다.
