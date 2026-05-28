# 초보자 레시피 운영 기준

집밥노트의 초보자 레시피는 "요리 초보가 냉장고 재료로 오늘 한 끼를 실패 없이 만드는 것"을 기준으로 운영한다.

## 제품 원칙

- 중학생도 이해할 수 있는 문장으로 쓴다.
- "중불", "익음", "색" 같은 표현은 시간과 눈으로 보는 상태를 함께 적는다.
- 실패했을 때 살릴 수 있는 방법을 모든 published 레시피에 둔다.
- 상세 화면의 "망했어요" 안내는 탔을 때, 짰을 때, 덜 익었을 때, 질어졌을 때, 부서졌을 때를 기본 복구 케이스로 다룬다.
- 장보기 추가는 필수 부족 재료만 기본 대상으로 삼고, 선택 재료는 상세 설명에서 대체재와 함께 안내한다.
- 외부 원문, 사진, 썸네일, 자막, 고유 표현은 쓰지 않는다.
- 홈 추천은 초보자 기준을 통과한 published 레시피만 사용한다.

## BeginnerRecipe Schema

필수 필드는 `lib/beginner-recipes.ts`의 `BeginnerRecipe` 타입을 기준으로 한다.

- 기본 정보: `id`, `slug`, `title`, `category`, `oneLineDescription`
- 초보자 기준: `difficultyLevel`, `beginnerScore`, `beginnerLabel`, `servings`, `totalMinutes`, `activeMinutes`
- 조리 구조: `requiredTools`, `ingredients`, `beforeStart`, `steps`, `successCheck`
- 실패 복구: `storageTip`, `reheatTip`, `fallbackMeal`
- 노출 카피: `homeCardCopy`
- 권리/안전: `source`, `safety`, `releaseTier`, `publishStatus`

## Safety Level

- A: 이용 조건이 명확한 공공누리/공공자료 기반. 출처 표시는 필요하며 기관 추천처럼 보이면 안 된다.
- B: 일반 가정식 조리 원리 기반으로 집밥노트가 자체 작성. 앱 본문 노출 가능.
- C: 플랫폼, 영상, SNS, 블로그, 트렌드 참고용. 원문/사진/자막/고유 표현 사용 금지. 기본 비노출.
- D: 앱 콘텐츠로 사용하지 않음. 권리 불명확, 초보자 부적합, 위험 조리 메뉴.

## Publish Rule

앱 본문 노출 조건은 모두 필요하다.

- `publishStatus === "published"`
- `safety.safetyLevel`이 A 또는 B
- `beginnerScore >= 80`
- `difficultyLevel <= 2`
- `totalMinutes <= 20`
- `requiredTools.length <= 3`
- 필수 재료 7개 이하
- 모든 step에 `action`, `heat`, `minutes`, `visualCue`, `commonMistake`, `rescueTip` 존재
- `source.adaptedByJipbabNote === true`
- 이미지 사용 조건과 권리 설명 존재

## C 등급 승격

1. 외부 원문, 이미지, 자막, 썸네일을 사용하지 않는다.
2. 특정 플랫폼 고유 표현을 제거한다.
3. 일반 조리 원리와 집밥노트 문장으로 완전히 다시 쓴다.
4. `source.rightsNote`에 "원문/이미지 미사용, 집밥노트 자체 재작성"을 기록한다.
5. `pnpm validate:recipes`를 통과한 뒤 B로 승격한다.

## 금지 표현

- 유명 인물, 브랜드, 플랫폼 공식 레시피처럼 보이는 표현
- "백종원", "백종원 스타일", "공식 레시피"
- "만개의레시피 원문", "우리의식탁 원문", "유튜브 원문"
- 근거 없는 "최고", "정통", "원조"
- 단독으로 쓰인 "적당히", "노릇하게", "익을 때까지"

## QA Checklist

- 온보딩 10개가 모두 15분 이하, score 89 이상, published, A/B인지 확인한다.
- 출시 30개가 홈 추천 풀로 표시되는지 확인한다.
- 핵심 50개가 카테고리/검색/추천에 쓰이는지 확인한다.
- 부족 재료 장보기는 필수 재료만 추가하고, 대체재가 있는 항목은 사용자가 읽을 수 있게 표시되는지 확인한다.
- C/D/hidden이 일반 사용자 목록에 나오지 않는지 확인한다.
- 360px, 390px, 430px에서 홈 카드와 한 단계씩 보기가 깨지지 않는지 확인한다.
- `pnpm validate:recipes`와 `pnpm check:beginner-goal-readiness`를 모두 통과한 뒤 출시 후보로 본다.
