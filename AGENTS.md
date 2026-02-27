# 집밥노트 (JipbabNote) - Project Guide

## 프로젝트 개요
- **앱 이름**: 집밥노트
- **설명**: 냉장고 속 재료를 관리하고, 보유 재료 기반으로 레시피를 추천하는 크로스플랫폼 앱
- **타깃**: 30~50대 주부, 자취생, 요리 초보자
- **슬로건**: "냉장고 속 재료로 오늘 뭐 해먹지? 집밥노트가 알려줄게!"

## 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **UI**: React + Tailwind CSS
- **DB/Auth**: Supabase
- **앱 빌드**: Capacitor (Phase 4에서 추가)
- **아이콘**: Lucide React
- **폰트**: Pretendard (한글)
- **배포**: Vercel (웹)

## 디자인 시스템
### 컬러
- Primary: #22C55E (프레시 그린)
- Secondary: #FF8C42 (웜 오렌지)
- Background: #FAFAFA
- Surface (카드): #FFFFFF, shadow-sm
- Text: #333333 (제목), #666666 (본문), #999999 (보조)

### UI 원칙
- 카드 border-radius: 16px (둥글둥글)
- 음식 사진이 카드의 60~70% 차지
- 하단 탭 네비게이션 5개: 홈, 냉장고, 레시피, 커뮤니티, 마이페이지
- 요소 간 간격 넉넉하게 (p-4, gap-4 이상)
- 모바일 퍼스트 (max-width: 430px 기준 설계)
- 깔끔하고 밝은 톤, 여백 많이

### 타이포그래피
- 페이지 제목: 24px bold
- 섹션 제목: 18px semibold
- 카드 제목: 16px medium
- 본문: 14px regular
- 보조: 12px regular

## Supabase 구조

### ingredients 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK, default gen_random_uuid()) | 고유 ID |
| device_id | text, not null | 기기 고유 ID (로그인 전) |
| user_id | uuid, nullable, FK → auth.users | 로그인 후 연결 |
| name | text, not null | 재료 이름 |
| category | text | 채소/과일/육류/수산물/유제품/양념/기타 |
| storage_type | text, default '냉장' | 냉장/냉동/실온 |
| quantity | text | 수량 (예: 500g, 2개) |
| expiry_date | date | 유통기한 |
| barcode | text, nullable | 바코드 번호 |
| image_url | text, nullable | 재료 사진 URL |
| memo | text, nullable | 메모 |
| created_at | timestamptz, default now() | 등록일 |
| updated_at | timestamptz, default now() | 수정일 |

### recipes 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| title | text, not null | 요리 이름 |
| description | text | 간단 설명 |
| category | text | 한식/중식/양식/일식/분식/디저트/국찌개/반찬 |
| difficulty | int (1~3) | 난이도 |
| cooking_time | int | 조리 시간(분) |
| servings | int | 인분 |
| thumbnail_url | text | 완성 사진 URL |
| ingredients | jsonb | [{name, amount, unit}] |
| steps | jsonb | [{order, description, image_url}] |
| source | text | 데이터 출처 |
| created_at | timestamptz | 등록일 |

### favorites 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| device_id | text | 기기 ID |
| user_id | uuid, nullable | 사용자 ID |
| recipe_id | uuid, FK → recipes | 레시피 ID |
| created_at | timestamptz | 등록일 |

### RLS (Row Level Security) 정책
- ingredients: device_id 또는 user_id가 본인인 행만 SELECT/INSERT/UPDATE/DELETE 가능
- favorites: 동일
- recipes: 모든 사용자 SELECT 가능 (공개 데이터)

## 폴더 구조
```txt
jipbab-note/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── fridge/page.tsx
│   ├── recipe/page.tsx
│   ├── recipe/[id]/page.tsx
│   ├── community/page.tsx
│   └── mypage/page.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   ├── fridge/
│   ├── recipe/
│   └── home/
├── lib/
│   ├── supabase.ts
│   ├── device-id.ts
│   ├── matching.ts
│   └── utils.ts
├── hooks/
│   ├── useIngredients.ts
│   ├── useRecipes.ts
│   └── useFavorites.ts
├── types/
│   └── index.ts
├── public/
│   └── icons/
├── styles/
│   └── globals.css
└── AGENTS.md
```

## 개발 순서
1. Phase 1: 프로젝트 세팅 + 디자인 시스템 + 홈/탭 레이아웃
2. Phase 2: 냉장고(재료 관리) CRUD
3. Phase 3: 레시피 연동 + 매칭 알고리즘
4. Phase 4: Capacitor 앱 빌드 + 바코드 스캔
5. Phase 5: 로그인 + 커뮤니티
6. Phase 6: 앱스토어 출시

## 코딩 규칙
- 한글 주석 필수 (비개발자가 읽을 수 있도록)
- 컴포넌트는 함수형 + TypeScript
- Tailwind 클래스 사용, 인라인 스타일 금지
- 'use client'는 필요한 컴포넌트에만
- console.log 디버깅 코드 남기지 않기
- 각 컴포넌트 파일 상단에 "이 파일이 하는 일" 한 줄 주석
