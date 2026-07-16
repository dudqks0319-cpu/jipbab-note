# Phase 3 전역 리뷰·런타임 디버그 감사

작성일: 2026-07-11 KST

## 리뷰 결과

- API v1 클라이언트, 홈, 목록, 상세, 조리 순서, 타입, 테스트, 릴리스 원장을 함께 검토했다.
- 앱의 정상 데이터 표면과 현재 외부 dependency 미적용 표면을 분리했다.
- legacy cache/curated fallback이 v1 발행 게이트를 우회하는 경로는 홈과 목록에서 제거했다.

## 가설 1: URL 복원 전에 기본 요청이 실행되어 중복 API 호출이 발생한다

- 초기 증거: Playwright console에서 기본 요청, 필터 요청, debounce 검색 요청까지 3개의 503을 관찰했다.
- 수정: `urlStateReady` 전에는 hook을 비활성화하고 `debouncedQuery === searchQuery.trim()`일 때만 fetch하도록 했다.
- 최종 증거: 새 브라우저 세션에서 `q=계란&sort=time&advanced=1&time=10` 진입 시 최종 쿼리 1건의 503만 기록됐다.

## 가설 2: 503 안내가 긴 필터 영역 아래 있어 모바일 사용자가 장애를 즉시 알 수 없다

- 초기 증거: 360x800 접근성 snapshot에서 오류 문구가 y=1102에 있어 첫 화면 밖이었다.
- 수정: 오류와 재시도 버튼을 검색창 바로 아래 `role=alert` 카드로 이동했다.
- 최종 증거: 정확한 360/390/430 캡처 모두 첫 화면에서 오류와 재시도 버튼을 보여준다.

## 가설 3: legacy 표시 카테고리가 API v1 정규 카테고리와 달라 정상 레시피가 레일에서 숨겨진다

- 초기 증거: API card는 `밥·한 그릇`, `찌개·전골`, `달걀` 등을 반환하지만 목록은 `김치/밥 요리`, `국/찌개`, `계란요리` 등의 legacy 묶음을 사용했다.
- 수정: 표시 레일과 query mapping을 Phase 1의 15개 canonical category label로 맞췄다.
- 최종 증거: 360px 접근성 snapshot과 캡처에서 15개 정규 카테고리와 2개 가상 필터가 잘림 없이 표시된다.

## 미해결

- 현재 DB migration과 HMAC secret이 없으므로 정상 200 UI는 로컬 production에서 관찰할 수 없다.
- 정규 detail mapper의 정상 경로는 unit fixture로 검증했고, 실제 DB/browser 정상 경로는 staging 준비 후 재검증해야 한다.
