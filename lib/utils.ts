// 이 파일은 여러 곳에서 공통으로 쓰는 도우미 함수들을 담당합니다

export type ExpiryStatus = {
  daysLeft: number | null
  isExpired: boolean
  isExpiringSoon: boolean
  label: string
  tone: 'danger' | 'warning' | 'safe' | 'neutral'
}

const INGREDIENT_PHOTO_BY_KEYWORD: Record<string, string> = {
  방울토마토:
    'https://images.unsplash.com/photo-1561136594-7f68413baa99?auto=format&fit=crop&w=900&q=80',
  참치캔:
    'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80',
  모짜렐라치즈:
    'https://images.unsplash.com/photo-1589881133825-bbb3b9471b1b?auto=format&fit=crop&w=900&q=80',
  크림치즈:
    'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=900&q=80',
  닭가슴살:
    'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=80',
  오렌지주스:
    'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80',
  사과주스:
    'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=900&q=80',
  계란:
    'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=80',
  우유:
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80',
  두유:
    'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=900&q=80',
  치즈:
    'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=80',
  버터:
    'https://images.unsplash.com/photo-1589985270958-53d0e57f34b3?auto=format&fit=crop&w=900&q=80',
  요거트:
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
  생크림:
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80',
  마요네즈:
    'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=80',
  사과:
    'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80',
  바나나:
    'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=900&q=80',
  딸기:
    'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=80',
  오렌지:
    'https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?auto=format&fit=crop&w=900&q=80',
  귤:
    'https://images.unsplash.com/photo-1605549910170-9f28d1d1f8bd?auto=format&fit=crop&w=900&q=80',
  레몬:
    'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=900&q=80',
  라임:
    'https://images.unsplash.com/photo-1611109942996-2619f64d9d0a?auto=format&fit=crop&w=900&q=80',
  포도:
    'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=900&q=80',
  블루베리:
    'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=900&q=80',
  키위:
    'https://images.unsplash.com/photo-1585059895524-72359e06133a?auto=format&fit=crop&w=900&q=80',
  망고:
    'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=80',
  파인애플:
    'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=900&q=80',
  아보카도:
    'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=900&q=80',
  당근:
    'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=900&q=80',
  양파:
    'https://user0514.cdnw.net/shared/img/thumb/9V9A5984_TP_V.jpg',
  대파:
    'https://images.unsplash.com/photo-1622205313162-be1d5712a43c?auto=format&fit=crop&w=900&q=80',
  마늘:
    'https://images.unsplash.com/photo-1587049633312-d628ae50a8ae?auto=format&fit=crop&w=900&q=80',
  감자:
    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80',
  고구마:
    'https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?auto=format&fit=crop&w=900&q=80',
  애호박:
    'https://images.unsplash.com/photo-1598254817018-d5c7ae43d2a5?auto=format&fit=crop&w=900&q=80',
  오이:
    'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=900&q=80',
  양배추:
    'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=900&q=80',
  배추:
    'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=900&q=80',
  브로콜리:
    'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=900&q=80',
  버섯:
    'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=900&q=80',
  시금치:
    'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80',
  파프리카:
    'https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?auto=format&fit=crop&w=900&q=80',
  상추:
    'https://images.unsplash.com/photo-1622205313162-be1d5712a43c?auto=format&fit=crop&w=900&q=80',
  깻잎:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  콩나물:
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
  숙주:
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
  토마토소스:
    'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=900&q=80',
  토마토:
    'https://images.unsplash.com/photo-1546470427-e5ac89cd0b7f?auto=format&fit=crop&w=900&q=80',
  두부:
    'https://images.unsplash.com/photo-1604908176997-4318f16e7f00?auto=format&fit=crop&w=900&q=80',
  돼지고기:
    'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=80',
  소고기:
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
  닭고기:
    'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=900&q=80',
  삼겹살:
    'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=900&q=80',
  목살:
    'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=900&q=80',
  불고기:
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
  닭다리:
    'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=80',
  오리고기:
    'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=900&q=80',
  베이컨:
    'https://images.unsplash.com/photo-1528607929212-2636ec44253e?auto=format&fit=crop&w=900&q=80',
  햄:
    'https://images.unsplash.com/photo-1528607929212-2636ec44253e?auto=format&fit=crop&w=900&q=80',
  소시지:
    'https://images.unsplash.com/photo-1597714026720-8f74c62310ba?auto=format&fit=crop&w=900&q=80',
  고등어:
    'https://images.unsplash.com/photo-1579631542720-3a87824fff86?auto=format&fit=crop&w=900&q=80',
  연어:
    'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=900&q=80',
  참치:
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80',
  새우:
    'https://images.unsplash.com/photo-1625943555419-56a2cb596640?auto=format&fit=crop&w=900&q=80',
  오징어:
    'https://images.unsplash.com/photo-1604908176997-4318f16e7f00?auto=format&fit=crop&w=900&q=80',
  문어:
    'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=900&q=80',
  멸치:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  다시마:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  미역:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  바지락:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  명란:
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80',
  어묵:
    'https://images.unsplash.com/photo-1604908176997-4318f16e7f00?auto=format&fit=crop&w=900&q=80',
  냉동만두:
    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=80',
  냉동볶음밥:
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
  냉동피자:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
  냉동우동면:
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  냉동새우:
    'https://images.unsplash.com/photo-1625943555419-56a2cb596640?auto=format&fit=crop&w=900&q=80',
  냉동오징어:
    'https://images.unsplash.com/photo-1604908176997-4318f16e7f00?auto=format&fit=crop&w=900&q=80',
  냉동닭가슴살:
    'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=80',
  냉동돈까스:
    'https://images.unsplash.com/photo-1604908177522-cbc5d95c2f3d?auto=format&fit=crop&w=900&q=80',
  냉동어묵:
    'https://images.unsplash.com/photo-1604908176997-4318f16e7f00?auto=format&fit=crop&w=900&q=80',
  냉동야채믹스:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
  냉동블루베리:
    'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=900&q=80',
  냉동감자튀김:
    'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=900&q=80',
  간장:
    'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=900&q=80',
  고추장:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  된장:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  쌈장:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  소금:
    'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=900&q=80',
  설탕:
    'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=900&q=80',
  식초:
    'https://images.unsplash.com/photo-1620589125156-fd5028c5e06c?auto=format&fit=crop&w=900&q=80',
  참기름:
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80',
  들기름:
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80',
  후추:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  고춧가루:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  굴소스:
    'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=900&q=80',
  카레가루:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  케첩:
    'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=80',
  쌀:
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
  현미:
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
  밀가루:
    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80',
  전분:
    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80',
  국수:
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  라면:
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  파스타면:
    'https://images.unsplash.com/photo-1551462147-37885acc36f1?auto=format&fit=crop&w=900&q=80',
  우동면:
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  식빵:
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  바게트:
    'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=80',
  빵가루:
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  떡:
    'https://images.unsplash.com/photo-1604908176997-4318f16e7f00?auto=format&fit=crop&w=900&q=80',
  옥수수캔:
    'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=900&q=80',
  콩통조림:
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80',
  스팸:
    'https://images.unsplash.com/photo-1528607929212-2636ec44253e?auto=format&fit=crop&w=900&q=80',
  김치:
    'https://images.unsplash.com/photo-1583224964978-2257b960c3d3?auto=format&fit=crop&w=900&q=80',
  피클:
    'https://images.unsplash.com/photo-1606851091851-e8c8c0fca5ba?auto=format&fit=crop&w=900&q=80',
  올리브:
    'https://images.unsplash.com/photo-1607532941433-304659e8198a?auto=format&fit=crop&w=900&q=80',
  잼:
    'https://images.unsplash.com/photo-1607026092261-7ac42e7c8809?auto=format&fit=crop&w=900&q=80',
  육수팩:
    'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
  생수:
    'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=80',
  탄산수:
    'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80',
  커피:
    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80',
  티백:
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
  견과류:
    'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=900&q=80',
  꿀:
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=80',
  올리고당:
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=80',
  코코아가루:
    'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=900&q=80',
}

const INGREDIENT_PHOTO_BY_CATEGORY: Record<string, string> = {
  채소:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
  과일:
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80',
  육류:
    'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=900&q=80',
  수산물:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  유제품:
    'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?auto=format&fit=crop&w=900&q=80',
  냉동식품:
    'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80',
  조미료:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  '곡물/면/빵':
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  '통조림/가공식품':
    'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80',
  '음료/기타':
    'https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=900&q=80',
  기타:
    'https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=900&q=80',
}

export function getIngredientPhotoUrl(
  name: string | null | undefined,
  category: string | null | undefined,
): string {
  const normalizedName = (name ?? '').trim()
  if (normalizedName) {
    const keywordHit = Object.keys(INGREDIENT_PHOTO_BY_KEYWORD).find((keyword) =>
      normalizedName.includes(keyword),
    )
    if (keywordHit) {
      return INGREDIENT_PHOTO_BY_KEYWORD[keywordHit]
    }
  }

  return INGREDIENT_PHOTO_BY_CATEGORY[category ?? ''] || INGREDIENT_PHOTO_BY_CATEGORY['음료/기타']
}

export function getCoupangSearchUrl(keyword: string): string {
  return `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}`
}

// 카테고리별 이모지
export function getCategoryEmoji(category: string | null | undefined): string {
  const map: Record<string, string> = {
    채소: '🥬',
    과일: '🍎',
    육류: '🥩',
    수산물: '🐟',
    유제품: '🥛',
    냉동식품: '🧊',
    조미료: '🧂',
    '곡물/면/빵': '🍞',
    '통조림/가공식품': '🥫',
    '음료/기타': '🧃',
  }
  return map[category || ''] || '📦'
}

// 카테고리별 배경색 (파스텔 톤)
export function getCategoryBg(category: string | null | undefined): string {
  const map: Record<string, string> = {
    채소: 'bg-green-50',
    과일: 'bg-rose-50',
    육류: 'bg-pink-50',
    수산물: 'bg-blue-50',
    유제품: 'bg-yellow-50',
    냉동식품: 'bg-cyan-50',
    조미료: 'bg-orange-50',
    '곡물/면/빵': 'bg-amber-50',
    '통조림/가공식품': 'bg-slate-50',
    '음료/기타': 'bg-gray-50',
  }
  return map[category || ''] || 'bg-gray-50'
}

// 날짜 입력값을 YYYY-MM-DD로 정규화
export function toDateOnlyString(dateInput: string | null | undefined): string | null {
  if (!dateInput) return null
  const parsed = new Date(dateInput)
  if (Number.isNaN(parsed.getTime())) return null

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// D-day 계산
export function getDday(expiryDate: string | null | undefined): number {
  if (!expiryDate) return 999
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// 유통기한 상태 라벨 (참고 이미지처럼 "신선", "임박", "만료")
export function getStatusLabel(dday: number): string {
  if (dday < 0) return '만료'
  if (dday <= 3) return '임박'
  if (dday <= 7) return '주의'
  return '신선'
}

// 유통기한 상태별 배지 색상 (파스텔)
export function getStatusBg(dday: number): string {
  if (dday < 0) return 'bg-rose-100 text-rose-500'
  if (dday <= 3) return 'bg-orange-100 text-orange-500'
  if (dday <= 7) return 'bg-yellow-100 text-yellow-600'
  return 'bg-green-100 text-green-600'
}

// 유통기한 색상
export function getExpiryColor(expiryDate: string | null | undefined): 'red' | 'yellow' | 'green' {
  const dday = getDday(expiryDate)
  if (dday <= 3) return 'red'
  if (dday <= 7) return 'yellow'
  return 'green'
}

// IngredientCard 호환용 유통기한 상태 객체
export function getExpiryStatus(expiryDate: string | null | undefined): ExpiryStatus {
  if (!expiryDate) {
    return {
      daysLeft: null,
      isExpired: false,
      isExpiringSoon: false,
      label: '기한 없음',
      tone: 'neutral',
    }
  }

  const daysLeft = getDday(expiryDate)
  const isExpired = daysLeft < 0
  const isExpiringSoon = !isExpired && daysLeft <= 3

  let label = `D-${daysLeft}`
  if (isExpired) label = `${Math.abs(daysLeft)}일 지남`
  if (daysLeft === 0) label = '오늘 만료'

  const tone: ExpiryStatus['tone'] = isExpired ? 'danger' : isExpiringSoon ? 'warning' : 'safe'

  return {
    daysLeft,
    isExpired,
    isExpiringSoon,
    label,
    tone,
  }
}

// 날짜 포맷
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
