# 초보자 레시피 릴리즈 QA

## 온보딩 10개

- 냉두부
- 계란간장밥
- 전자레인지 계란찜
- 참치마요덮밥
- 김치볶음밥
- 두부부침
- 연두부 간장비빔
- 전자레인지 감자버터
- 콩나물국
- 어묵볶음

확인 항목:

- 모두 `published`
- 모두 safety A/B
- 모두 beginnerScore 89 이상
- 모두 15분 이하
- 빈 냉장고 홈에서도 노출
- 상세의 한 단계씩 보기, 망했어요, 완성 확인, 남았을 때 섹션 표시
- 망했어요 섹션은 탔을 때, 짰을 때, 덜 익었을 때, 질어졌을 때, 부서졌을 때를 모두 안내

## 출시 30개

`lib/beginner-recipes.ts`의 `RELEASE_RECIPE_30_NAMES`를 기준으로 한다.

- 홈 추천 기본 풀로 사용 가능
- 냉장고 재료 매칭 가능
- 필수 부족 재료만 장보기 연결 가능
- 대체재가 있는 부족 재료는 상세와 장보기 보조 UI에서 확인 가능
- difficultyLevel 1 또는 2
- beginnerScore 80 이상

## 100개 라이브러리

- `pnpm validate:recipes` 통과
- `pnpm check:beginner-goal-readiness` 통과
- id, slug, title 중복 없음
- published는 publish rule 통과
- C/D/hidden은 일반 목록과 홈에 비노출
- 금지 표현 미포함

## 모바일 화면

필수 폭:

- 360px
- 390px
- 430px

최신 로컬 브라우저 확인:

- `<workspace>/jipbab-home-360-beginner-family.png`
- `<workspace>/jipbab-home-390-beginner-family.png`
- `<workspace>/jipbab-home-430-beginner-family.png`
- `<workspace>/jipbab-recipe-detail-cook-360.png`
- `<workspace>/jipbab-recipe-detail-cook-390.png`
- `<workspace>/jipbab-recipe-detail-cook-430.png`
- `<workspace>/jipbab-recipe-detail-shopping-360.png`
- `<workspace>/jipbab-recipe-detail-shopping-390.png`
- `<workspace>/jipbab-recipe-detail-shopping-430.png`

확인 화면:

- 홈 추천 카드
- 레시피 목록/카테고리/필터
- 레시피 상세
- 한 단계씩 보기
- 부족 재료 장보기
- 가족 냉장고 추천
- loading/error/empty 상태

## 실기기

- iOS/Android에서 하단 탭이 CTA를 가리지 않는지 확인
- 한 손으로 다음 단계 버튼을 누를 수 있는지 확인
- 장보기 추가 실패 시 에러와 재시도 흐름 확인
- 부족 재료 장보기는 선택 재료를 자동 추가하지 않는지 확인
- 개인 냉장고/장보기와 가족 냉장고/장보기가 섞이지 않는지 확인
- 가족 구성원은 가족 부족 재료를 추가할 수 있고, 비구성원은 family scope row를 읽거나 쓸 수 없는지 확인

## 제출 전 명령

실제 `package.json` 기준으로 가능한 명령을 실행한다.

- `pnpm validate:recipes`
- `pnpm check:beginner-goal-readiness`
- `pnpm check:beginner-mobile-evidence`
- `pnpm test:unit`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- `pnpm check:supabase-release`
- `SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live`
- `pnpm release:security-check`
- `pnpm release:external-status`

외부 환경, 네트워크, 콘솔 승인, 실기기 연결 문제로 실패한 항목은 코드 실패와 분리해 기록한다.
