# API v1 운영 계약

## 범위

`/api/v1/recipes`, `/api/v1/recipes/:id`, `/api/v1/recommendations`는 검수 완료된 `schema_version = 2` 레시피만 반환한다. `POST /api/v1/recipe-feedback`는 검증된 서명 세션의 최소 조리 결과만 비공개로 저장한다. `GET|POST /api/v1/recipe-progress`는 영구 로그인 사용자의 레시피·인분별 구조화 진행만 비공개로 조회·저장한다. `POST /api/v1/shopping/items/from-recipe`는 검증된 서명 세션과 공개 승인 레시피의 선택 재료만 개인 장보기에 추가·병합한다. 서비스 역할 클라이언트를 사용하더라도 애플리케이션 쿼리와 응답 조립 단계에서 발행 조건을 다시 검사한다. 정규화된 재료, 단계, 재료 사용 관계, 출처, 안전 문구, 복구 안내 또는 기준 인분을 포함한 2개 이상의 정확한 `serving_variants`가 불완전하면 목록과 상세 응답 모두 공개되지 않는다.

목록의 `sort`는 `recommended`(기본값), `most-owned`, `least-missing`, `fastest`, `recent`만 허용한다. `recent`는 발행 시각·ID keyset cursor를 사용하고, 나머지 정렬은 현재 출시 최대치인 200개 후보 안에서 정렬 고정 offset cursor를 사용한다. cursor는 정렬 종류와 일치하지 않으면 거부된다.

## 응답과 오류

- 성공: `{ "data": ..., "meta": { "requestId": "..." } }`
- 실패: `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`
- 모든 응답은 `Cache-Control: no-store`와 `X-Request-Id`를 포함한다.
- 제한 초과 또는 의존성 미준비 응답은 `Retry-After`를 포함한다.
- 서버 예외, 환경변수 이름, 스택, DB 오류 본문은 응답이나 로그로 전달하지 않는다.

## 레시피 피드백

- Bearer token은 Supabase에서 다시 검증하며 서명된 익명 사용자와 영구 사용자만 허용한다.
- 본문은 최대 4KB이고 정해진 10개 필드만 허용한다. 이름, 이메일, 전화번호, 자유서술과 호출자 지정 기기 ID는 받지 않는다.
- `completionStatus`는 `completed_independently`, `completed_with_difficulty`, `failed` 중 하나다.
- `difficultStepOrder`는 `null` 또는 1~100이며 `completed_with_difficulty`에서만 허용한다.
- `failed`는 1~100 범위의 `failedStepOrder`가 필수이고 `reasonCode`는 계획서의 8개 코드 중 하나거나 `null`이다. 완료 상태에는 실패 단계와 이유를 보낼 수 없다.
- `tasteResult`는 `delicious`, `acceptable`, `poor`, `repeatIntent`는 `yes`, `after_adjustment`, `no` 중 하나거나 `null`이다. 두 값은 완료 상태에서만 허용한다.
- `actualDurationSeconds`는 `null` 또는 1~43,200초다.
- `(user_id, client_submission_id)` 유일성으로 재시도를 멱등 처리한다.
- `recipe_feedback`은 app role의 직접 접근을 전부 거부하며 서버만 삽입한다. 자유서술용 `comment`는 DB 제약에서도 `null`만 허용한다.

## 조리 진행

- `GET`과 `POST` 모두 Supabase Bearer token을 서버에서 다시 검증하며 영구 로그인 사용자만 허용한다. 익명 세션은 로컬 진행을 계속 사용하고 서버 저장에는 접근하지 못한다.
- 조회 키는 UUID `recipeId`와 1~20 범위 `servings` 하나씩만 허용한다.
- 저장 본문은 최대 8KB이며 exact allowlist만 허용한다. 레시피·버전·인분, 현재/완료 단계, 활성 타이머 하나, 시작·완료·클라이언트 수정 시각, 마지막으로 본 서버 수정 시각만 받는다. 메모·댓글·이름·연락처·기기 ID는 받지 않는다.
- 단계는 최대 100개, 타이머는 최대 24시간이며 시각은 canonical ISO-8601이어야 한다. 완료 단계는 중복 없는 오름차순이어야 하고 완료 시각은 시작 시각보다 빠를 수 없다.
- 첫 저장은 `baseServerUpdatedAt: null`만 허용한다. 기존 행 수정은 마지막 응답의 `serverUpdatedAt`과 정확히 일치할 때만 조건부 update하며, 생성 경쟁이나 오래된 쓰기는 `409 CONFLICT`로 거부한다. 충돌 후 클라이언트는 `GET`으로 서버 상태를 다시 받아 사용자에게 선택을 요청해야 하며 자동 덮어쓰지 않는다.
- `recipe_progress.updated_at`은 DB trigger가 `clock_timestamp()`로 소유한다. 클라이언트 `updatedAt`은 병합 안내용일 뿐 잠금 기준으로 신뢰하지 않는다.
- `(user_id, recipe_id, servings)`는 유일하고 app role 직접 접근은 전부 거부한다. `service_role`만 select·insert·update할 수 있다.

## 레시피 장보기 병합

- Supabase Bearer token을 서버에서 다시 검증하며 서명된 익명 사용자와 영구 사용자만 허용한다. 호출자 지정 사용자·기기·가족 범위는 받지 않고 검증된 `user.id`의 개인 장보기만 조회·저장한다.
- 본문은 최대 8KB이고 `recipeId`, `servings`, `selectedIngredientIds` 세 필드만 허용한다. 레시피와 선택 재료는 UUID, 인분은 1~20, 선택 재료는 중복 없는 1~50개여야 한다. 이름·수량·카테고리·레시피 출처는 클라이언트 입력으로 받지 않는다.
- 서버가 공개 승인된 v2 레시피를 다시 조회하고 정확한 recipe ingredient ID와 편집자 검수 `serving_variants`에서 이름·수량·카테고리·출처를 만든다. 공개되지 않은 레시피는 `404`, 레시피 밖 재료나 검수되지 않은 인분은 `400`으로 닫힌다.
- 기존 개인 장보기는 `.eq("user_id", user.id).is("family_group_id", null)`로 제한한다. `달걀`·`계란` 같은 등록 별칭은 한 항목으로 보고 호환 수량을 합치며 구매 완료 항목은 미구매로 되돌리고 레시피 출처를 중복 없이 보존한다.
- 새 항목 ID는 검증된 사용자와 정규화 재료 identity로 안정적으로 만들므로 같은 재시도가 중복 행을 만들지 않는다. 기존 항목의 사용자·기기·ID는 보존하며 다른 사용자나 가족 범위 행이 병합 함수에 들어오면 쓰기를 거부한다.
- 이 경로는 기존 `shopping_items`와 가족 범위 migration을 재사용하며 새 DB migration을 추가하지 않는다. 프런트 로컬-first 병합을 서버 API로 전환하는 작업은 격리 staging에서 서명 익명·영구 사용자 `200/201`, 무서명 `401`, 교차 사용자 차단과 실제 수량 병합을 확인한 뒤 진행한다.

## 분산 레이트 리밋

운영에서는 `API_RATE_LIMIT_HMAC_SECRET`이 32자 이상이어야 한다. 원본 IP 또는 사용자 키는 저장하지 않고 HMAC-SHA256 가명값만 `api_rate_limit_buckets`에 저장한다. 원자적 fixed-window RPC는 `service_role`만 실행할 수 있다. 운영 비밀 또는 RPC가 준비되지 않으면 API는 in-memory 제한기로 우회하지 않고 `503 DEPENDENCY_NOT_READY`로 닫힌다.

비밀은 서버 런타임의 암호화 환경변수로만 설정한다. 저장소, `NEXT_PUBLIC_*`, 로그, 증거 파일에 넣지 않는다. 예시 생성 명령은 값을 화면이나 이 문서에 복사하지 않는 전제에서 다음과 같다.

```bash
openssl rand -base64 48
```

## 배포 순서

1. 운영 migration history와 복구 가능한 백업을 먼저 확인한다.
2. staging에 Phase 0, Phase 1 migration을 순서대로 적용하고 capture/restore 및 권한 음성 경로를 검증한다.
3. staging에 `20260710160000_add_distributed_api_rate_limits.sql`을 적용한다.
4. staging 서버에 `API_RATE_LIMIT_HMAC_SECRET`을 설정한다.
5. staging에 `20260714100000_add_recipe_feedback.sql`, `20260714110000_extend_recipe_feedback_completion_details.sql`을 순서대로 적용하고 app role 직접 접근 거부와 service role 삽입을 확인한다.
6. staging에 `20260715100000_add_recipe_serving_variants.sql`을 적용하고 각 공개 후보에 기준 인분을 포함한 2개 이상의 편집자 검수 수량·도구·시간 값을 입력한다.
7. staging에 `20260715110000_add_recipe_progress.sql`을 적용하고 app role 직접 접근 거부, 영구 사용자별 격리, 서버 시각 trigger와 비파괴 rollback을 확인한다.
8. 완료·실패 상태별 허용/거부 조합과 모든 비파괴 rollback을 실제 PostgreSQL에서 검증한다.
9. 목록·상세·추천의 정상 경로, 불완전한 serving variant의 목록·상세 동시 차단, 피드백의 `201`, 멱등 `200`, 인증 `401`, 잘못된 본문 `400`, 과대 본문 `413`, `429`, 의존성 장애 `503`을 HTTP로 검증한다. 진행 API는 생성 `201`, 수정 `200`, 조회 `200`, 무서명·익명 `401`, 오래된 `baseServerUpdatedAt`과 생성 경쟁 `409`, 본문 `400`·`413`, `429`, 저장소 미준비 `503`을 확인한다. 장보기 병합 API는 새 항목 `201`, 기존 별칭·수량 병합 `200`, 무서명 `401`, 레시피 밖 재료·검수되지 않은 인분 `400`, 과대 본문 `413`, 제한 `429`, 저장소 미준비 `503`, 개인·사용자 범위 격리를 확인한다.
10. matching app build, DB migration, 검수된 serving variant 데이터를 조정된 변경 창에 운영 반영한다.
11. 운영 스모크와 모니터링을 확인한 뒤에만 API 사용 클라이언트를 전환한다.

운영 migration history가 현재 로컬과 불일치하므로 이 문서 작성 시점에는 `supabase db push`를 실행하지 않는다.

## 로컬 검증

```bash
pnpm check:api-v1-contract
pnpm check:supabase-release
node --experimental-strip-types --test \
  tests/api-v1-contract.test.ts \
  tests/distributed-rate-limit.test.ts \
  tests/recipe-api-v1.test.ts \
  tests/recipe-recommendation-v1.test.ts \
  tests/recipe-feedback.test.ts \
  tests/recipe-feedback-contract.test.ts \
  tests/recipe-cook-completion.test.ts \
  tests/recipe-progress.test.ts \
  tests/recipe-progress-contract.test.ts \
  tests/shopping-from-recipe.test.ts \
  tests/shopping-from-recipe-contract.test.ts
```
