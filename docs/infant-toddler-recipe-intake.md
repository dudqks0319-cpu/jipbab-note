# 이유식·유아식 레시피 조사 후보 운영 기준

Updated: 2026-07-13 KST

## 반영 범위

사용자가 제공한 `deep-research-report.md`의 코어 후보 24개를 `lib/infant-toddler-recipes.ts`에 구조화했습니다.

| 연령 필터 | 후보 수 |
|---|---:|
| 4~6개월 | 8 |
| 6~8개월 | 6 |
| 8~11개월 | 4 |
| 12개월 이상 | 6 |

후보는 공통 recipe v2 연구 모델에 `ChildMealGuidance`를 붙여 관리합니다. 비운영 환경에서 서버 전용 `CHILD_MEAL_RESEARCH_ADMIN_ENABLED=true`일 때만 `/admin/content-research/infant-toddler`에서 확인할 수 있습니다. Production과 기본 설정에서는 404이며 `/recipe/infant-toddler` 공개 경로를 만들지 않습니다. 이 후보들은 추천 API, 일반 레시피 목록, 조리 모드와 publication evidence에 포함되지 않습니다.

## 안전 경계

- 월령은 참고값이며 아이의 발달·삼킴·알레르기 상태에 따라 보호자와 소아청소년과가 판단합니다.
- 새 재료는 한 번에 하나씩 도입하고 설사·발진·구토 등 반응을 관찰합니다.
- 만 12개월 전 후보에는 꿀 금지 안내를 필수로 표시합니다.
- 알레르기 가능 재료가 있으면 별도 경고를 표시합니다.
- 외부 자료에 정량이 없거나 일부만 노출된 경우 값을 추정하지 않고 `정량 검수 필요`로 기록합니다.
- 보관·재가열 기준은 실제 조리와 식품안전 검수 전까지 확정하지 않습니다.
- 이 화면은 의료 진단이나 개인별 영양 처방을 대신하지 않습니다.

공식 원칙 확인 자료:

- 질병관리청 국가건강정보포털, [이유기보충식(이유식)](https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5470)
- 대한소아청소년과학회, [영유아 이유식·새 음식 안내](https://www.pediatrics.or.kr/bbs/index.html?code=infantcare&page=9)
- 질병관리청 국가건강정보포털, [보툴리눔독소증](https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5842)
- 식품안전나라, [우리 아이의 건강을 위한 밥상 영유아 레시피](https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs039&menu_grp=MENU_NEW03&menu_no=4847&ntctxt_no=1093548)

## 저작권·출처 경계

- 블로그·카페·민간 플랫폼·영상의 원문, 사진, 썸네일, 캡처를 앱에 복제하지 않습니다.
- 현재 24개는 메뉴명과 정량 같은 사실 정보, 기능적 조리 흐름만 앱 문체로 다시 정리했습니다.
- 식약처 명의 플랫폼 게시물도 정부 원문 라이선스와 플랫폼 이용조건을 함께 확인하기 전에는 `summary_only`로 유지합니다.
- 외부 이미지는 모두 `null`이며 자체 촬영 또는 명시적으로 승인된 이미지 증거가 생기기 전에는 추가하지 않습니다.
- 출처 표시는 이용허락을 대신하지 않습니다.

## 공개 승격 조건

후보별로 다음 증거가 모두 있어야 별도 publication schema로 옮길 수 있습니다.

1. 원문 URL·작성자·게시일·열람일과 라이선스 또는 개별 허가 기록
2. 집밥노트 자체 계량과 전면 재작성
3. 월령·입자·염도·당도·질식·알레르기·꿀 금지 식품안전 검수
4. 실제 조리와 실패·재시험 기록
5. 보호자 사용성 검수
6. 자체 이미지 또는 상업 이용 가능한 이미지 권리 증거
7. 보관·재가열 검수
8. reviewer와 승인 시각이 포함된 publication evidence

현재 상태는 실제 조리 `0/24`, 식품안전 검수 `0/24`, 권리 검수 `0/24`, 이미지 권리 `0/24`, 공개 승인 `0/24`입니다.

## 구현 계약

- 후보 데이터와 공통 recipe v2 변환: `lib/infant-toddler-recipes.ts`
- 내부 연구 화면: `app/admin/content-research/infant-toddler/page.tsx`
- 서버 전용 feature flag: `CHILD_MEAL_RESEARCH_ADMIN_ENABLED` (기본·Production OFF)
- 계약 테스트: `tests/infant-toddler-recipes.test.ts`
- 공개 가능 판정: `canPublishInfantToddlerRecipe()`는 검수 증거 스키마가 생기기 전까지 항상 `false`
- 후보 검증: `validateInfantToddlerRecipeCandidate()`가 권리·안전 필수값을 검사
