# Phase 5 핵심 20개 레시피 감사

이 문서는 현재 로컬 카탈로그를 계획서의 Phase 5 후보와 매핑하고 자동 편집 검사를 실행한 결과다. 자동 점수는 편집 우선순위일 뿐이며 실제 조리, 초보자, 식품 안전, 법무 출처, 이미지 권리 검수를 대신하지 않는다.

## 결과

- 후보: **20개**
- 정확한 메뉴 또는 명시적 조리 변형: **20개**
- 정확한 후보 부재로 유사 메뉴 대체: **0개**
- 자동 편집 점수 90점 이상: **20개**
- 로컬 비트맵 파일 확인: **20개**
- 인간 실제 조리 테스트 증거: **0/20개**
- Phase 5 공개 승인: **0/20개**

## 진실 표면

모든 후보는 DB의 `recipe_sources` 연결, 검수자·검수일·메모가 있는 초보자/식품 안전/법무 출처/이미지 권리 검수, 실제 사람이 수행한 조리 테스트 증거가 없으므로 `blocked_missing_human_evidence`다. 코드의 `published`, `reviewedForBeginner`, 점수 또는 자동 테스트 성공을 이 증거로 승격하지 않는다. 조리·재료·이미지·출처·안전 필드에서 계산한 콘텐츠 버전이 달라지면 사람 증거도 새 버전으로 다시 수집한다.

## 후보 목록

| 순서 | 계획 메뉴 | 선택 메뉴 | 로컬 ID | 콘텐츠 버전 | 대체 사유 | 자동 점수 | 이미지 | 하드 게이트 |
|---:|---|---|---|---|---|---:|---|---|
| 1 | 간장계란밥 | 간장계란밥 | beginner-recipe-001 | phase5-sha256-dd141b3aea37971fd87f5543 | - | 92 | local_bitmap_present | blocked |
| 2 | 계란볶음밥 | 계란볶음밥 | phase5-egg-fried-rice | phase5-sha256-f7fe72bf845504580f0d75d9 | - | 95 | local_bitmap_present | blocked |
| 3 | 참치김치볶음밥 | 참치김치볶음밥 | beginner-recipe-014 | phase5-sha256-50cee2d05424d0c52c681b89 | - | 95 | local_bitmap_present | blocked |
| 4 | 김치볶음밥 | 김치볶음밥 | beginner-recipe-013 | phase5-sha256-4634e1198ea1fb6bf1bff91e | - | 91 | local_bitmap_present | blocked |
| 5 | 계란말이 | 프라이팬 계란말이 | beginner-recipe-003 | phase5-sha256-de9601e4ac96f0e217d95b53 | - | 95 | local_bitmap_present | blocked |
| 6 | 계란찜 | 전자레인지 계란찜 | beginner-recipe-002 | phase5-sha256-fd88017f7c624e2b7856446b | - | 92 | local_bitmap_present | blocked |
| 7 | 두부조림 | 두부조림 | beginner-recipe-028 | phase5-sha256-6ca8f5c0c8656199c40a145a | - | 95 | local_bitmap_present | blocked |
| 8 | 감자조림 | 감자조림 | curated-gamja-jorim | phase5-sha256-cba82e341961c3955a6079d6 | - | 92 | local_bitmap_present | blocked |
| 9 | 어묵볶음 | 어묵볶음 | beginner-recipe-051 | phase5-sha256-8b0f252047294d38796d7056 | - | 91 | local_bitmap_present | blocked |
| 10 | 콩나물무침 | 콩나물무침 | beginner-recipe-032 | phase5-sha256-886e216559a192631daaeef2 | - | 91 | local_bitmap_present | blocked |
| 11 | 된장찌개 | 된장찌개 | beginner-recipe-067 | phase5-sha256-6f1207be131d01a2912bd62d | - | 98 | local_bitmap_present | blocked |
| 12 | 돼지고기 김치찌개 | 돼지고기 김치찌개 | curated-pork-kimchi-jjigae | phase5-sha256-8871bb2d1437f74c32a57bfa | - | 92 | local_bitmap_present | blocked |
| 13 | 미역국 | 미역국 | beginner-recipe-064 | phase5-sha256-d007cf5ede24cc05fce1529a | - | 94 | local_bitmap_present | blocked |
| 14 | 북엇국 | 북엇국 | beginner-recipe-065 | phase5-sha256-ac52ac5cb538d80d8fba0136 | - | 94 | local_bitmap_present | blocked |
| 15 | 제육볶음 | 제육볶음 | curated-jeyuk-bokkeum | phase5-sha256-4f5fc1865f74ddec1a08e644 | - | 92 | local_bitmap_present | blocked |
| 16 | 간장불고기 | 간장불고기 | phase5-soy-beef-bulgogi | phase5-sha256-5a51ed406fd4defebafb2018 | - | 92 | local_bitmap_present | blocked |
| 17 | 잔치국수 | 잔치국수 | beginner-recipe-081 | phase5-sha256-f57edf8fd0e6ebdb1e954280 | - | 94 | local_bitmap_present | blocked |
| 18 | 떡볶이 | 떡볶이 | phase5-tteokbokki | phase5-sha256-1b0f27fca9ee4bf28737dc15 | - | 95 | local_bitmap_present | blocked |
| 19 | 토마토달걀볶음 | 토마토달걀볶음 | beginner-recipe-006 | phase5-sha256-b0647712d0aa38bfe7b28198 | - | 91 | local_bitmap_present | blocked |
| 20 | 닭가슴살 채소볶음 | 닭가슴살 채소볶음 | phase5-chicken-breast-vegetable-stir-fry | phase5-sha256-1782009ac57683905cc79119 | - | 95 | local_bitmap_present | blocked |

## 점수 해석

- 기본 구조 15, 재료·계량 20, 단계 실행 가능성 25, 초보자 언어·복구 15, 식품 안전·보관 15, 출처·이미지 권리 10으로 계산한다.
- 정형 알레르기 정보, 단계별 최소·최대 시간, 재료-단계 연결이 없으면 자동 점수가 차감된다.
- 90점 이상이어도 하드 게이트가 하나라도 없으면 공개 불가다.

## 다음 게이트

1. `docs/phase-5-human-test-packets.md`의 현재 콘텐츠 버전으로 실제 조리를 수행한다.
2. `docs/phase-5-actual-cooking-template.csv`에 익명 테스터 코드와 실패 사례를 포함한 실제 조리 결과를 기록한다.
3. 각 레시피에 구조/편집/초보자/식품 안전/실제 조리/법무 출처 검수를 별도 증거로 남긴다.
4. 이미지 파일과 레시피 단계가 일치하는지 사람이 확인하고 권리 검수 일시를 기록한다.
5. 증거가 완성된 레시피만 관리자 경로에서 DB 공개 필드를 갱신한다.
