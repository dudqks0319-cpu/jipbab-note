-- 집밥노트 자체 작성 기본 집밥 레시피 6종을 추가합니다.
-- 외부 레시피 문장/이미지 복제가 아니라 앱 추천용 자체 구조화 데이터입니다.

insert into public.recipes (
  id,
  title,
  description,
  category,
  difficulty,
  cooking_time,
  servings,
  thumbnail_url,
  ingredients,
  steps,
  source,
  created_at
) values
(
  '7b80bb98-facc-4cd0-973d-60687b019123',
  '계란말이 기본형',
  '조리법: 부치기 | 열량: 210 | 집밥노트 자체 레시피: 달걀과 자투리 채소로 만드는 기본 반찬입니다.',
  '반찬',
  1,
  15,
  2,
  '/images/recipes/jipbab-curated/gyeran-mari-basic.png',
  '["계란 5개", "대파 2큰술", "당근 2큰술", "양파 2큰술", "소금 1/4작은술", "식용유 약간"]'::jsonb,
  '[
    {"order": 1, "description": "대파, 당근, 양파를 잘게 다져 달걀에 고루 섞이게 준비합니다.", "image_url": null},
    {"order": 2, "description": "달걀을 풀고 소금을 넣은 뒤 다진 채소를 섞어 달걀물을 만듭니다.", "image_url": null},
    {"order": 3, "description": "약불로 달군 팬에 식용유를 얇게 두르고 달걀물을 얇게 붓습니다.", "image_url": null},
    {"order": 4, "description": "가장자리가 익기 시작하면 한쪽 끝에서부터 천천히 말아 모양을 잡습니다.", "image_url": null},
    {"order": 5, "description": "남은 달걀물을 이어 붓고 2~3회 반복해 두툼하게 말아줍니다.", "image_url": null},
    {"order": 6, "description": "한 김 식힌 뒤 먹기 좋은 두께로 썰어 접시에 담습니다.", "image_url": null}
  ]'::jsonb,
  'jipbab-curated:gyeran-mari-basic',
  '2026-04-23T04:00:00+09:00'
),
(
  '18530805-3073-4d04-bb0f-fca1535e0e50',
  '돼지고기 김치찌개 기본형',
  '조리법: 끓이기 | 열량: 430 | 집밥노트 자체 레시피: 신김치와 돼지고기를 먼저 볶아 깊은 맛을 내는 집밥 찌개입니다.',
  '국&찌개',
  1,
  30,
  2,
  '/images/recipes/jipbab-curated/pork-kimchi-jjigae-basic.png',
  '["김치 2컵", "돼지고기 200g", "두부 1/2모", "대파 1/2대", "양파 1/4개", "고춧가루 1큰술", "국간장 1큰술", "마늘 1작은술"]'::jsonb,
  '[
    {"order": 1, "description": "김치는 한입 크기로 자르고 돼지고기, 두부, 대파, 양파를 먹기 좋게 준비합니다.", "image_url": null},
    {"order": 2, "description": "냄비에 돼지고기와 김치를 넣고 중불에서 김치 향이 올라올 때까지 볶습니다.", "image_url": null},
    {"order": 3, "description": "물이나 육수를 붓고 고춧가루, 국간장, 마늘을 넣어 끓입니다.", "image_url": null},
    {"order": 4, "description": "국물이 끓으면 양파와 두부를 넣고 10분 정도 더 끓입니다.", "image_url": null},
    {"order": 5, "description": "마지막에 대파를 넣고 간을 확인한 뒤 부족하면 소금으로 맞춥니다.", "image_url": null}
  ]'::jsonb,
  'jipbab-curated:pork-kimchi-jjigae-basic',
  '2026-04-23T04:01:00+09:00'
),
(
  '33b58833-2739-414e-83df-77f7464683f8',
  '된장찌개 기본형',
  '조리법: 끓이기 | 열량: 260 | 집밥노트 자체 레시피: 된장, 두부, 감자, 애호박으로 빠르게 끓이는 기본 찌개입니다.',
  '국&찌개',
  1,
  25,
  2,
  '/images/recipes/jipbab-curated/doenjang-jjigae-basic.png',
  '["된장 2큰술", "두부 1/2모", "감자 1개", "애호박 1/3개", "양파 1/4개", "버섯 한줌", "대파 1/2대", "마늘 1작은술"]'::jsonb,
  '[
    {"order": 1, "description": "감자, 애호박, 양파, 두부, 버섯을 한입 크기로 썹니다.", "image_url": null},
    {"order": 2, "description": "냄비에 물을 붓고 된장을 풀어 중불에서 끓입니다.", "image_url": null},
    {"order": 3, "description": "감자를 먼저 넣고 5분 정도 끓인 뒤 양파와 애호박을 넣습니다.", "image_url": null},
    {"order": 4, "description": "두부와 버섯, 마늘을 넣고 재료가 익을 때까지 끓입니다.", "image_url": null},
    {"order": 5, "description": "대파를 넣고 한소끔 끓인 뒤 간을 맞춰 마무리합니다.", "image_url": null}
  ]'::jsonb,
  'jipbab-curated:doenjang-jjigae-basic',
  '2026-04-23T04:02:00+09:00'
),
(
  '767e01a0-2027-4d88-80e0-1f955a22ee66',
  '감자조림 기본형',
  '조리법: 조리기 | 열량: 240 | 집밥노트 자체 레시피: 감자와 간장 양념으로 만드는 도시락 반찬입니다.',
  '반찬',
  1,
  25,
  2,
  '/images/recipes/jipbab-curated/gamja-jorim-basic.png',
  '["감자 2개", "양파 1/4개", "진간장 2큰술", "설탕 1큰술", "마늘 1작은술", "식용유 1큰술", "참기름 약간", "통깨 약간"]'::jsonb,
  '[
    {"order": 1, "description": "감자는 한입 크기로 썰고 양파는 굵게 채 썹니다.", "image_url": null},
    {"order": 2, "description": "팬에 식용유를 두르고 감자를 먼저 볶아 겉면을 살짝 익힙니다.", "image_url": null},
    {"order": 3, "description": "간장, 설탕, 마늘, 물을 넣고 중약불에서 조립니다.", "image_url": null},
    {"order": 4, "description": "감자가 부드러워지면 양파를 넣고 국물이 자작해질 때까지 더 조립니다.", "image_url": null},
    {"order": 5, "description": "참기름과 통깨를 넣어 고소하게 마무리합니다.", "image_url": null}
  ]'::jsonb,
  'jipbab-curated:gamja-jorim-basic',
  '2026-04-23T04:03:00+09:00'
),
(
  '5dddeb10-fbf3-4d90-a8e7-958f0ecef217',
  '두부조림 기본형',
  '조리법: 조리기 | 열량: 300 | 집밥노트 자체 레시피: 두부를 노릇하게 굽고 간장 고춧가루 양념에 조리는 기본 반찬입니다.',
  '반찬',
  1,
  20,
  2,
  '/images/recipes/jipbab-curated/dubu-jorim-basic.png',
  '["두부 1모", "대파 1/2대", "양파 1/4개", "진간장 2큰술", "고춧가루 1큰술", "마늘 1작은술", "설탕 1작은술", "식용유 약간"]'::jsonb,
  '[
    {"order": 1, "description": "두부는 도톰하게 썰고 키친타월로 물기를 가볍게 제거합니다.", "image_url": null},
    {"order": 2, "description": "대파와 양파를 잘게 썰고 간장, 고춧가루, 마늘, 설탕을 섞어 양념장을 만듭니다.", "image_url": null},
    {"order": 3, "description": "팬에 식용유를 두르고 두부를 앞뒤로 노릇하게 굽습니다.", "image_url": null},
    {"order": 4, "description": "양념장과 물을 조금 넣고 중약불에서 두부에 양념이 배도록 조립니다.", "image_url": null},
    {"order": 5, "description": "국물이 자작해지면 대파를 올려 마무리합니다.", "image_url": null}
  ]'::jsonb,
  'jipbab-curated:dubu-jorim-basic',
  '2026-04-23T04:04:00+09:00'
),
(
  'a36e34ec-5f17-4e4a-8e07-246b8082447e',
  '참치김치볶음밥',
  '조리법: 볶기 | 열량: 520 | 집밥노트 자체 레시피: 김치와 참치캔, 밥으로 빠르게 만드는 한 그릇 볶음밥입니다.',
  '밥',
  1,
  15,
  1,
  '/images/recipes/jipbab-curated/tuna-kimchi-fried-rice.png',
  '["밥 1공기", "김치 1컵", "참치캔 1/2캔", "대파 1/3대", "진간장 1큰술", "고춧가루 1작은술", "참기름 약간", "계란 1개"]'::jsonb,
  '[
    {"order": 1, "description": "김치는 잘게 썰고 참치캔은 기름을 가볍게 뺍니다.", "image_url": null},
    {"order": 2, "description": "팬에 대파를 먼저 볶아 향을 낸 뒤 김치를 넣고 볶습니다.", "image_url": null},
    {"order": 3, "description": "참치와 고춧가루, 간장을 넣어 김치 양념이 고루 섞이게 볶습니다.", "image_url": null},
    {"order": 4, "description": "밥을 넣고 눌어붙지 않게 풀어가며 볶습니다.", "image_url": null},
    {"order": 5, "description": "참기름을 넣고, 원하면 계란 프라이를 올려 마무리합니다.", "image_url": null}
  ]'::jsonb,
  'jipbab-curated:tuna-kimchi-fried-rice',
  '2026-04-23T04:05:00+09:00'
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  difficulty = excluded.difficulty,
  cooking_time = excluded.cooking_time,
  servings = excluded.servings,
  thumbnail_url = excluded.thumbnail_url,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  source = excluded.source,
  created_at = excluded.created_at;
