# Recipe Image Sources

This folder contains release-safe recipe images used by 집밥노트.

## Generated in-house food photos

These images were generated in-house for Korean home-cooking recipe cards. They are not copied from competitor apps, blogs, marketplace listings, or restaurant photos.

- `kimchi-fried-rice.png`: generated Korean home-cooking style finished dish photo
- `soy-garlic-chicken.png`: generated Korean home-cooking style finished dish photo
- `doenjang-jjigae.png`: generated Korean home-cooking style finished dish photo
- `gyeran-mari.png`: generated Korean home-cooking style finished dish photo
- `jipbab-curated/doenjang-jjigae-basic.png`: generated Korean home-cooking style finished dish photo
- `jipbab-curated/gamja-jorim-basic.png`: generated Korean home-cooking style finished dish photo
- `jipbab-curated/tuna-kimchi-fried-rice.png`: generated Korean home-cooking style finished dish photo
- `jipbab-curated/dubu-jorim-basic.png`: generated Korean home-cooking style finished dish photo
- `jipbab-curated/pork-kimchi-jjigae-basic.png`: generated Korean home-cooking style finished dish photo
- `jipbab-curated/gyeran-mari-basic.png`: generated Korean home-cooking style finished dish photo
- `jipbab-curated/soy-egg-rice.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/steamed-egg.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/bean-sprout-soup.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/cucumber-muchim.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/jeyuk-bokkeum.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/beef-seaweed-soup.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/curry-rice.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/tteok-mandu-guk.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/bibim-guksu.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/tuna-mayo-rice-bowl.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/cabbage-egg-stirfry.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/fishcake-bokkeum.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/spinach-namul.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/kimchi-jeon.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `jipbab-curated/tomato-egg-stirfry.png`: cropped from in-house generated 15-dish contact sheet, added 2026-05-06
- `generated/*.png`: in-house generated finished-dish food photos for the expanded beginner recipe library, added 2026-06-10.
- `beginner-food-photos/*.png`: generated in-house with the installed image generation skill for core beginner recipe thumbnails, added 2026-06-10. These are finished-dish food photos only; they are not recipe cards, posters, UI screenshots, SVG stand-ins, marketplace images, restaurant photos, blog images, or competitor assets.
- `beginner-food-photos/beginner-004-egg-drop-soup.png`: in-house generated finished-dish photo for 달걀국, added 2026-06-11.
- `beginner-food-photos/beginner-016-ham-vegetable-fried-rice.png`: in-house generated finished-dish photo for 햄야채볶음밥, added 2026-06-11.
- `beginner-food-photos/beginner-034-gamja-guk.png`: in-house generated finished-dish photo for 감자국, added 2026-06-11.
- `beginner-food-photos/beginner-047-tuna-kimchi-jjigae.png`: in-house generated finished-dish photo for 참치김치찌개, added 2026-06-11.
- `beginner-food-photos/beginner-049-spam-kimchi-bokkeum.png`: in-house generated finished-dish photo for 스팸김치볶음, added 2026-06-11.
- `beginner-food-photos/beginner-052-eomuk-tang.png`: in-house generated finished-dish photo for 어묵탕, added 2026-06-11.

Contact-sheet source for the 2026-05-06 batch:
`/Users/jyb-m3max/.codex/generated_images/019df2bf-9026-7b63-a35b-0c6f3014de26/ig_0f255b6fbfd4f4910169fb0dd6e19c8191a307ed8c93f8db98.png`.
The contact sheet was generated in-house and cropped into local app assets; it does not use competitor app, blog, shopping-mall, or social-media imagery.

## Generated recipe guide assets

These poster/detail assets were generated locally from project scripts and in-house recipe copy. They combine local generated food images with code-native SVG layout.

- `beginner-posters/manifest.json`: manifest for generated BeginnerRecipe poster assets, added 2026-05-29
- `beginner-posters/recipe-poster__*.svg`: code-generated BeginnerRecipe poster assets built from `lib/beginner-recipes.ts`, added 2026-05-29. These are original 집밥노트 layout assets and do not use external photos, blog screenshots, marketplace images, brand logos, or character references.
- `beginner-scenes/manifest.json`: manifest for generated BeginnerRecipe scene-set assets, added 2026-05-29
- `beginner-scenes/{recipeSlug}/cover.svg`: code-generated representative recipe image for each BeginnerRecipe, added 2026-05-29
- `beginner-scenes/{recipeSlug}/ingredients.svg`: code-generated ingredient preparation image for each BeginnerRecipe, added 2026-05-29
- `beginner-scenes/{recipeSlug}/tools.svg`: code-generated cooking-tool image for each BeginnerRecipe, added 2026-05-29
- `beginner-scenes/{recipeSlug}/step-*.svg`: code-generated step-by-step cooking scene images built from `lib/beginner-recipes.ts`, added 2026-05-29. These are original 집밥노트 layout assets and do not use external photos, blog screenshots, marketplace images, brand logos, or character references.
- `beginner-recipe-guides/*.png`: in-house recipe guide images generated from the installed image generation workflow's local food photos plus app-owned Korean recipe copy, added 2026-06-12. These show beginner ingredients, tools, and cooking order for each BeginnerRecipe; they are not copied from recipe cards, blog images, marketplace images, restaurant photos, or competitor assets.
- `beginner-recipe-guides/prep/*.png`: in-house tool-and-ingredient guide photos generated from local food-photo assets plus app-owned Korean ingredient/tool copy, added 2026-06-12.
- `beginner-recipe-guides/steps/*.png`: in-house cooking-order guide photos generated from local food-photo assets plus app-owned Korean step copy, added 2026-06-12.
- `ganjang-egg-rice/*.png`: 집밥노트가 자체 작성한 간장계란밥 조리 단계 사진, added 2026-07-10.
- `butter-soy-egg-rice/*.png`: 집밥노트가 자체 작성한 버터간장계란밥 조리 단계 사진, added 2026-07-10.
- `ganjang-egg-rice/step-04-finished.png`: 집밥노트가 자체 작성한 간장계란밥 완성 사진, added 2026-07-10.
- `butter-soy-egg-rice/step-04-finished.png`: 집밥노트가 자체 작성한 버터간장계란밥 완성 사진, added 2026-07-10.
- `beginner-imagegen-posters/*.png`: in-house Korean recipe infographic poster images generated with the installed image generation skill from app-owned recipe copy, added 2026-06-13. These show tools, ingredients, and step-by-step cooking order in the reference style requested by the user; they are not copied from recipe cards, blog images, marketplace images, restaurant photos, or competitor assets.
- `*-recipe-poster.svg`
- `*-recipe-poster.png`
- `*-photo-recipe-poster.png`
- `*-recipe-detail.svg`
- `*-recipe-detail.png`
- `kimchi-fried-rice-method.svg`
- `kimchi-fried-rice-method.png`

## Asset rules

- Do not use competitor app screenshots or recipe photos.
- Do not use blog, marketplace, social media, or restaurant images unless a license is documented here.
- New recipe images must include source type, generation method or license URL, author if required, and the date added.

## Phase 5 exact-menu covers

The following finished-dish covers were generated in-house on 2026-07-14 with the installed OpenAI image generation skill from app-owned menu specifications. They are representative cover images only and do not count as actual-cooking, food-safety, or human-review evidence.

- `phase5-core/egg-fried-rice.png`: 계란볶음밥; generated from a menu-specific food-photo prompt; no external source image.
- `phase5-core/soy-beef-bulgogi.png`: 간장불고기; generated from a menu-specific food-photo prompt; no external source image.
- `phase5-core/tteokbokki.png`: 떡볶이; generated from a menu-specific food-photo prompt; no external source image.
- `phase5-core/chicken-breast-vegetable-stir-fry.png`: 닭가슴살 채소볶음; generated from a menu-specific food-photo prompt; no external source image.
