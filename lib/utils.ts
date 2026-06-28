// 이 파일은 여러 곳에서 공통으로 쓰는 도우미 함수들을 담당합니다

export type ExpiryStatus = {
  daysLeft: number | null
  isExpired: boolean
  isExpiringSoon: boolean
  label: string
  tone: 'danger' | 'warning' | 'safe' | 'neutral'
}

const ingredientAsset = (filename: string): string => `/images/ingredients/${filename}`

const mapIngredientPhotos = (
  entries: Array<[keywords: string[], filename: string]>,
): Record<string, string> =>
  Object.fromEntries(
    entries.flatMap(([keywords, filename]) =>
      keywords.map((keyword) => [keyword, ingredientAsset(filename)]),
    ),
  )

// 재료명과 별칭을 같은 쇼핑형 썸네일로 연결합니다.
const INGREDIENT_PHOTO_BY_KEYWORD: Record<string, string> = mapIngredientPhotos([
  [['양파', '흰양파', '적양파'], 'onion-shop.png'],
  [['파', '대파', '쪽파'], 'green-onion-shop.png'],
  [['계란', '달걀'], 'egg-shop.png'],
  [['두부', '연두부', '순두부'], 'tofu-shop.png'],
  [['마늘', '통마늘', '깐마늘', '다진마늘', '다진 마늘'], 'garlic-shop.png'],
  [['감자', '수미감자'], 'potato-shop.png'],
  [['고구마', '밤고구마', '호박고구마'], 'sweet-potato-shop.png'],
  [['당근'], 'carrot-shop.png'],
  [['오이'], 'cucumber-shop.png'],
  [['애호박', '쥬키니'], 'zucchini-shop.png'],
  [['양배추', '적양배추'], 'cabbage-shop.png'],
  [['배추'], 'napa-cabbage-shop.png'],
  [['무', '조선무'], 'radish-shop.png'],
  [['브로콜리', '브로컬리'], 'broccoli-shop.png'],
  [['버섯', '양송이버섯', '느타리버섯', '표고버섯', '새송이버섯', '팽이버섯'], 'mushroom-shop.png'],
  [['시금치'], 'spinach-shop.png'],
  [['파프리카', '빨강 파프리카', '노랑 파프리카', '피망', '청피망', '홍피망'], 'paprika-shop.png'],
  [['상추', '양상추'], 'lettuce-shop.png'],
  [['깻잎'], 'perilla-leaf-shop.png'],
  [['콩나물'], 'bean-sprout-shop.png'],
  [['숙주', '숙주나물'], 'mung-bean-sprout-shop.png'],
  [['고추', '청양고추', '홍고추', '풋고추'], 'chili-pepper-shop.png'],
  [['방울토마토', '체리토마토'], 'cherry-tomato-shop.png'],
  [['토마토'], 'tomato-shop.png'],

  [['사과'], 'apple-shop.png'],
  [['배', '신고배'], 'pear-shop.png'],
  [['바나나'], 'banana-shop.png'],
  [['딸기'], 'strawberry-shop.png'],
  [['오렌지'], 'orange-shop.png'],
  [['귤'], 'tangerine-shop.png'],
  [['레몬', '레몬즙', '레몬주스'], 'lemon-shop.png'],
  [['라임'], 'lime-shop.png'],
  [['포도'], 'grape-shop.png'],
  [['블루베리'], 'blueberry-shop.png'],
  [['키위'], 'kiwi-shop.png'],
  [['망고'], 'mango-shop.png'],
  [['파인애플'], 'pineapple-shop.png'],
  [['아보카도'], 'avocado-shop.png'],

  [['소고기', '불고기용 소고기', '불고기', '국거리'], 'beef-shop.png'],
  [['돼지고기', '앞다리살', '뒷다리살', '목살', '오리고기'], 'pork-shop.png'],
  [['삼겹살'], 'pork-belly-shop.png'],
  [['닭고기'], 'chicken-raw-photo.png'],
  [['닭다리'], 'chicken-leg-shop.png'],
  [['닭가슴살'], 'chicken-breast-shop.png'],
  [['베이컨'], 'bacon-shop.png'],
  [['햄'], 'ham-shop.png'],
  [['소시지', '비엔나'], 'sausage-shop.png'],

  [['연어'], 'salmon-shop.png'],
  [['고등어'], 'mackerel-shop.png'],
  [['새우', '새우살', '칵테일새우'], 'shrimp-shop.png'],
  [['오징어'], 'squid-shop.png'],
  [['멸치', '국물멸치', '국멸치', '육수용 멸치'], 'anchovy-shop.png'],
  [['다시마', '건다시마'], 'kelp-shop.png'],
  [['미역', '미역 줄기', '미역줄기'], 'wakame-shop.png'],
  [['바지락', '조개'], 'clam-shop.png'],
  [['김', '조미김', '김밥김'], 'seaweed-shop.png'],
  [['참치', '생참치'], 'tuna-raw-photo.png'],
  [['문어', '낙지'], 'octopus-photo.png'],
  [['어묵'], 'fish-cake-shop.png'],

  [['우유'], 'milk-shop.png'],
  [['두유'], 'soy-milk-shop.png'],
  [['치즈', '슬라이스치즈'], 'cheese-shop.png'],
  [['모짜렐라치즈', '모짜렐라'], 'mozzarella-shop.png'],
  [['크림치즈'], 'cream-cheese-shop.png'],
  [['파마산치즈', '파마산'], 'parmesan-shop.png'],
  [['버터', '무염버터'], 'butter-shop.png'],
  [['요거트', '플레인요거트', '요구르트', '그릭요거트'], 'yogurt-shop.png'],
  [['생크림', '휘핑크림'], 'cream-shop.png'],
  [['마요네즈'], 'mayonnaise-shop.png'],

  [['냉동만두'], 'dumpling-shop.png'],
  [['냉동야채믹스'], 'frozen-vegetable-mix-photo.png'],
  [['냉동볶음밥'], 'cooked-rice-shop.png'],
  [['냉동피자'], 'frozen-pizza-photo.png'],
  [['냉동우동면'], 'udon-shop.png'],
  [['냉동돈까스'], 'frozen-donkatsu-photo.png'],
  [['냉동감자튀김'], 'frozen-fries-photo.png'],
  [['냉동새우'], 'shrimp-shop.png'],
  [['냉동오징어'], 'squid-shop.png'],
  [['냉동닭가슴살'], 'chicken-breast-shop.png'],
  [['냉동어묵'], 'fish-cake-shop.png'],
  [['냉동블루베리'], 'blueberry-shop.png'],

  [['간장', '국간장', '조선간장', '진간장', '양조간장'], 'soy-sauce-shop.png'],
  [['고추장'], 'gochujang-shop.png'],
  [['된장', '저염된장'], 'doenjang-shop.png'],
  [['쌈장'], 'ssamjang-photo.png'],
  [['소금', '굵은소금', '꽃소금'], 'salt-shop.png'],
  [['설탕', '백설탕', '갈색설탕'], 'sugar-shop.png'],
  [['식초'], 'vinegar-shop.png'],
  [['참기름'], 'sesame-oil-shop.png'],
  [['들기름'], 'perilla-oil-photo.png'],
  [['후추', '후춧가루', '흰후추'], 'pepper-shop.png'],
  [['고춧가루'], 'red-pepper-powder-shop.png'],
  [['굴소스'], 'oyster-sauce-shop.png'],
  [['카레가루'], 'curry-powder-shop.png'],
  [['케첩'], 'ketchup-shop.png'],
  [['식용유', '올리브오일', '카놀라유', '포도씨유', '해바라기유'], 'cooking-oil-shop.png'],

  [['참치캔', '참치 통조림'], 'tuna-can-shop.png'],
  [['옥수수', '옥수수캔', '통조림 옥수수', '콘옥수수', '스위트콘'], 'corn-can-shop.png'],
  [['콩통조림', '병아리콩', '강낭콩'], 'mixed-beans-photo.png'],
  [['스팸', '햄통조림'], 'spam-shop.png'],
  [['김치', '배추김치'], 'kimchi-shop.png'],
  [['피클'], 'pickle-shop.png'],
  [['올리브'], 'olive-shop.png'],
  [['잼', '딸기잼', '블루베리잼'], 'jam-shop.png'],
  [['토마토소스', '파스타소스'], 'pasta-sauce-shop.png'],

  [['밥', '즉석밥', '공기밥', '흰밥', '쌀밥', '찬밥'], 'cooked-rice-shop.png'],
  [['쌀', '현미'], 'rice-bag-shop.png'],
  [['밀가루'], 'flour-shop.png'],
  [['전분', '감자전분', '옥수수전분'], 'starch-powder-photo.png'],
  [['국수', '당면'], 'noodle-shop.png'],
  [['라면'], 'ramen-pack-shop.png'],
  [['파스타', '파스타면', '스파게티면'], 'spaghetti-shop.png'],
  [['우동면'], 'udon-shop.png'],
  [['식빵'], 'white-bread-shop.png'],
  [['바게트'], 'baguette-shop.png'],
  [['빵가루'], 'bread-crumbs-shop.png'],
  [['떡', '떡국떡', '떡볶이떡'], 'rice-cake-shop.png'],

  [['생수', '탄산수'], 'water-bottle-shop.png'],
  [['오렌지주스', '사과주스'], 'orange-juice-photo.png'],
  [['커피', '원두커피'], 'coffee-beans-photo.png'],
  [['티백', '홍차', '녹차'], 'tea-bag-shop.png'],
  [['견과류', '아몬드', '호두'], 'mixed-nuts-shop.png'],
  [['꿀'], 'honey-shop.png'],
  [['올리고당'], 'oligosaccharide-syrup-photo.png'],
  [['코코아가루'], 'cocoa-powder-photo.png'],
])

const INGREDIENT_PHOTO_BY_CATEGORY: Record<string, string> = {
  채소: ingredientAsset('onion-shop.png'),
  과일: ingredientAsset('apple-shop.png'),
  육류: ingredientAsset('meat-shop.png'),
  수산물: ingredientAsset('salmon-shop.png'),
  유제품: ingredientAsset('milk-shop.png'),
  냉동식품: ingredientAsset('frozen-ice-pixabay.jpg'),
  조미료: ingredientAsset('soy-sauce-shop.png'),
  '곡물/면/빵': ingredientAsset('rice-bag-shop.png'),
  '통조림/가공식품': ingredientAsset('tuna-can-shop.png'),
  '음료/기타': ingredientAsset('water-bottle-shop.png'),
  기타: ingredientAsset('water-bottle-shop.png'),
}

export function getIngredientPhotoUrl(
  name: string | null | undefined,
  category: string | null | undefined,
): string {
  const normalizedName = normalizeIngredientPhotoKey(name ?? '')
  if (normalizedName) {
    const exactHit = Object.keys(INGREDIENT_PHOTO_BY_KEYWORD)
      .find((keyword) => normalizeIngredientPhotoKey(keyword) === normalizedName)
    if (exactHit) {
      return INGREDIENT_PHOTO_BY_KEYWORD[exactHit]
    }

  }

  return INGREDIENT_PHOTO_BY_CATEGORY[category ?? ''] || INGREDIENT_PHOTO_BY_CATEGORY['음료/기타']
}

function normalizeIngredientPhotoKey(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
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
