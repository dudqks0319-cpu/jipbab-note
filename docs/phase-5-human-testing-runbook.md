# Phase 5 핵심 20개 사람 검수 실행서

Updated: 2026-07-11 KST

이 문서는 자동 점수 90점 이상을 실제 초보자 조리·검수 증거로 바꾸기 위한 운영 절차다. 현재 기록은 모두 `pending`이며, 사람이 앱 안내만 보고 실제로 조리하기 전에는 어떤 레시피도 승인하지 않는다.

## 진실 표면

- 자동 콘텐츠 검사와 코드의 `published` 값은 사람 검수 증거가 아니다.
- 실패, 중단, 안전 문제도 성공 기록과 같은 우선순위로 남긴다.
- 조리 결과와 검수 결과는 해당 `recipe_version` 하나에만 유효하다.
- `pnpm check:phase5-human-evidence`가 20/20을 반환해도 DB를 자동 변경하지 않는다. 승인된 운영자가 원본 증거를 다시 확인한 뒤 별도 관리자 경로로 반영한다.
- 현재 production DB migration과 source link가 준비되지 않았으므로 이 패킷만으로 발행할 수 없다.

## 역할

| 역할 | 책임 |
|---|---|
| 조리 코디네이터 | 레시피 버전과 앱 SHA 고정, 익명 코드 발급, 증거 경로 확인 |
| 초보자 테스터 | 앱 화면만 보고 조리, 성공·실패와 실제 시간을 그대로 기록 |
| 초보자 검수자 | 문장 이해, 실수 지점, 복구 안내를 별도 검수 |
| 식품 안전 검수자 | 교차오염, 익힘, 화상, 보관, 재가열, 폐기 기준 검수 |
| 출처 검수자 | DB 레시피와 `recipe_sources` 연결, 라이선스, attribution 검수 |
| 이미지 권리 검수자 | 메뉴·단계 일치, 생성·사용 권리 또는 승인된 무이미지 상태 검수 |

테스터와 검수자는 이름·이메일·전화번호 대신 `tester-a01`, `safety-r02` 같은 익명 코드만 사용한다.

## 테스트 전 고정

1. GitHub와 실제 테스트 앱의 SHA를 기록한다.
2. 레시피마다 사람이 식별할 수 있는 `recipe_version`을 정한다.
3. 테스트 화면에서 선택 메뉴, 재료, 단계, 이미지가 감사 CSV와 같은지 확인한다.
4. 알레르기와 위험 식재료를 테스터에게 사전 고지한다.
5. 응급 상황에서는 테스트를 즉시 중단하고 조리 완성을 우선하지 않는다.

## Wave 구성

한 사람이 한 번에 여러 메뉴를 몰아서 평가하지 않도록 5개씩 진행한다.

### Wave 1A — 간단한 밥·달걀

- 간장계란밥
- 햄야채볶음밥
- 김치볶음밥
- 전자레인지 계란찜
- 토마토달걀볶음

### Wave 1B — 팬 반찬

- 프라이팬 계란말이
- 두부조림
- 감자조림
- 어묵볶음
- 콩나물무침

### Wave 1C — 국·찌개

- 된장찌개
- 돼지고기 김치찌개
- 미역국
- 북엇국
- 떡국떡달걀국

### Wave 1D — 단백질·면·볶음

- 참치김치볶음밥
- 제육볶음
- 간장마늘 닭조림
- 잔치국수
- 닭가슴살양배추덮밥

대체 메뉴 4개는 계획서 원래 제목이 아니라 실제 선택 메뉴 기준으로 조리한다. 대체 사실은 결과 보고서에 유지한다.

## 증거 폴더

개인정보가 없는 로컬 증거만 다음 경로에 둔다. `output/`은 Git에서 제외된다.

```text
output/phase5-human-evidence/
  <recipe_id>/
    <recipe_version>/
      <session_code>/
        notes.md
        before.jpg
        completed.jpg
        screen-recording.mov
```

사진과 영상에는 얼굴, 주소, 알림, 계정 정보가 보이지 않게 한다. 원본 증거는 승인된 저장소로 옮기기 전 Git에 추가하지 않는다.
검수 CSV의 메모와 경로에 이메일 또는 전화번호 형태가 있으면 검증기가 차단한다.

## 실제 조리 기록

`docs/phase-5-actual-cooking-template.csv`의 최초 20개 행은 레시피별 대기 슬롯이다. 재시험은 기존 행을 지우지 않고 새 행으로 추가하며, 가장 최근 `completed_at`의 시도가 현재 판정이 된다.

- 테스트에 사용한 `app_build_sha`, `test_surface`, `test_device`를 실제 값으로 기록한다.
- 레시피 안에서 중복되지 않는 익명 `attempt_id`를 기록한다.
- 성공: `completed=true`, `safety_issue=none`, `status=approved`
- 완성했지만 문장·이미지 수정 필요: `completed=true`, `status=needs_revision`
- 중단·실패: `completed=false`, 실패 단계와 코드를 기록하고 `needs_revision` 또는 `rejected`
- 안전 문제: `safety_issue=reported`; 완료 여부와 무관하게 `approved` 금지
- 변경 없음도 `copy_change=none`, `image_change=none`으로 명시
- `evidence_path`는 위 증거 폴더 아래의 실제 파일 또는 디렉터리를 가리킨다.

권장 실패 코드: `timing`, `heat`, `quantity`, `tool_size`, `unclear_copy`, `image_mismatch`, `food_safety`, `device`, `other`.

## 사람 검수 기록

`docs/phase-5-human-review-template.csv`에는 레시피마다 4개 행이 있다.

- `beginner`: 앱 안내만으로 이해·복구 가능한지
- `food_safety`: 메뉴별 안전·보관·재가열·폐기 기준
- `legal_source`: DB recipe UUID, `recipe_sources` UUID, 라이선스와 attribution
- `image_rights`: 메뉴·단계 일치와 사용 권리

각 비대기 행은 같은 레시피 버전, 익명 검수자 코드, 검수 시각, 0~100점, 판정, 메모, 실제 증거 경로를 가져야 한다. `legal_source=approved`에는 DB recipe UUID와 source record UUID가 모두 필요하다.

## 실행 순서

```bash
pnpm phase5:audit
pnpm check:phase5-core-audit
pnpm check:phase5-human-evidence
```

첫 두 명령은 템플릿을 최초 생성하되 호환되는 사람 기록을 덮어쓰지 않는다. 마지막 명령은 현재 미완료 상태에서 의도적으로 non-zero와 `BLOCKED`를 반환한다.

## 수정 루프

1. 조리 실패·검수 지적을 레시피 문장 또는 이미지 수정으로 연결한다.
2. 레시피 버전을 올린다.
3. 이전 결과를 삭제하지 않고 조리 CSV에 새 `attempt_id` 행을 추가한다.
4. 변경된 버전으로 실제 조리와 4개 검수를 다시 수행한다.
5. 20개 모두 같은 버전의 다섯 하드 게이트를 통과한 경우에만 DB 반영 후보를 만든다.

## 현재 완료 판정

- 자동 편집 점수 90점 이상: 20/20
- 로컬 비트맵 존재: 20/20
- 실제 조리 승인: 0/20
- 초보자 검수 승인: 0/20
- 식품 안전 검수 승인: 0/20
- 출처 검수 승인: 0/20
- 이미지 권리 검수 승인: 0/20
- 발행 후보: 0/20

현재 Phase 5는 완료가 아니라 사람 테스트 준비 상태다.
