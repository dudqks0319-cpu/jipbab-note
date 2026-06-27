# 집밥노트 App Store 스크린샷 가이드

기본 캡처 세트와 제출 규격 변환본은 아래 폴더에 있습니다.

- [`2026-04-21-iphone17`](<repo>/docs/app-store-screenshots/2026-04-21-iphone17)
- [`2026-05-19-iphone69`](<repo>/docs/app-store-screenshots/2026-05-19-iphone69) - App Store 6.9형 portrait 규격 변환본, 1290x2796

## 권장 업로드 순서

1. [01-home.png](<repo>/docs/app-store-screenshots/2026-05-19-iphone69/01-home.png)
   - 메시지: 냉장고 재료로 오늘의 집밥을 바로 찾으세요
2. [02-fridge.png](<repo>/docs/app-store-screenshots/2026-05-19-iphone69/02-fridge.png)
   - 메시지: 재료를 카테고리별로 한눈에 관리
3. [03-recipe.png](<repo>/docs/app-store-screenshots/2026-05-19-iphone69/03-recipe.png)
   - 메시지: 내 냉장고 재료로 먼저 추천
4. [04-recipe-detail.png](<repo>/docs/app-store-screenshots/2026-05-19-iphone69/04-recipe-detail.png)
   - 메시지: 부족한 재료까지 바로 확인
5. [05-shopping.png](<repo>/docs/app-store-screenshots/2026-05-19-iphone69/05-shopping.png)
   - 메시지: 장보기 목록으로 이어서 관리

## Google Play 자산

- 휴대전화 스크린샷: [`docs/play-store-assets/phone`](<repo>/docs/play-store-assets/phone), 1080x1920 JPG 5장
- 기능 그래픽: [`feature-graphic.png`](<repo>/docs/play-store-assets/feature-graphic.png), 1024x500 RGB PNG

## 생성 / 검증 명령

```bash
pnpm store-assets:prepare
pnpm check:store-assets
```

## 메모

- `03-recipe.png` 는 `?demo=appstore` 상태로 다시 촬영한 버전입니다.
- 추가 촬영이 필요하면 다음 경로가 가장 유용합니다.
  - `/?demo=appstore`
  - `/recipe?demo=appstore`
  - `/shopping?demo=appstore`
- 냉장고 화면도 필요하면 이후 `?demo=appstore` 대응을 추가해 더 풍부한 상태로 재촬영할 수 있습니다.
