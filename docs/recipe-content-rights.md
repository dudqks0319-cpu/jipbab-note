# 레시피 콘텐츠 권리 기준

집밥노트 레시피 문장은 앱 내부 운영 콘텐츠로 쓰이므로, 외부 플랫폼의 표현과 이미지를 복제하지 않는다.

## 원칙

- 외부 블로그, 유튜브, 방송, SNS, 레시피 플랫폼 원문 문장을 복사하지 않는다.
- 외부 사진, 영상, 썸네일, 자막을 사용하지 않는다.
- 유명 셰프, 유튜버, 브랜드의 공식 레시피처럼 보이게 쓰지 않는다.
- 메뉴명은 일반명으로만 사용하고, 조리 문장은 집밥노트가 자체 작성한다.

## 공공데이터/API

- 공공데이터는 원천 라이선스, 출처, 사용 조건을 확인한다.
- 공공누리 제1유형은 출처 표시가 필요하다.
- 기관이 집밥노트를 추천하거나 후원한 것처럼 보이면 안 된다.
- 공공 API 원문도 초보자 문장으로 재작성해 앱 경험에 맞춘다.

## 이미지

- 외부 레시피 이미지는 사용하지 않는다.
- 카드 이미지는 로컬 생성 이미지 또는 텍스트/아이콘 UI로 처리한다.
- `source.imageUsageAllowed`가 false인 레시피는 외부 이미지를 절대 표시하지 않는다.
- 새 이미지를 추가할 때는 `public/images/recipes/SOURCES.md`에 생성 방식, 권리, 날짜를 기록한다.

## C 등급 참고 자료

C 등급은 참고 신호일 뿐 앱 본문이 아니다.

- 원문 문장 미사용
- 사진/썸네일/자막 미사용
- 고유 표현 미사용
- 집밥노트 자체 문장으로 완전 재작성
- 검증 통과 후 B 등급 승격

## 기록 필드

각 레시피는 다음을 유지한다.

- `source.sourceType`
- `source.sourceName`
- `source.sourceUrl`
- `source.licenseOrUsageNote`
- `source.rightsNote`
- `source.imageUsageAllowed`
- `source.adaptedByJipbabNote`
- `safety.safetyLevel`
- `safety.copyrightRisk`
- `safety.privacyRisk`
- `safety.commercialUseRisk`
- `safety.notes`
