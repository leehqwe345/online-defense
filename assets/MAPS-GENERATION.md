# 단계별 맵 이미지 v0.5

내장 image_gen 도구로 `assets/maps-v5.png`를 생성했습니다. 5열 × 2행의 한 장짜리 지형 아틀라스이며, 각 영역을 게임에서 캐시해 그립니다. 원본 PNG는 변경하지 않습니다.

1~10 이끼숲 경계 / 11~20 황금 사막 / 21~30 빙정 호수 / 31~40 잿불 화산 / 41~50 비전 유적 / 51~60 해무 해안 / 61~70 황혼의 숲 / 71~80 심연 동굴 / 81~90 별빛 성역 / 91~100 종언의 성채.

전환은 현재 라운드 기준이며 0.8초 동안 배경이 교차 전환됩니다. 몬스터 경로, 기존 몬스터, 챔피언 위치, 사거리와 충돌 규칙은 맵 이미지에 영향받지 않습니다. 전장 브리핑의 지도 미리보기에서 10개 테마를 모두 확인할 수 있습니다.

## 최종 생성 프롬프트

Use case: stylized-concept. Asset: ONE production environment texture atlas for a top-down fantasy tower-defense game. Landscape 2560x1024, EXACTLY FIVE equal columns and TWO equal rows, ten square 512x512 map cells flush together, no margins or borders between cells. Entirely overhead orthographic view, no perspective. Each cell is a different complete square battlefield terrain with broad unobstructed playable flat ground in the middle and small thematic scenery confined to the outermost 5 percent. NO painted paths or roads: game code overlays a square loop road from 10% to 90% bounds. Keep this corridor and middle clear, low contrast, no large objects. Painterly premium stylized fantasy environment matching chibi heroes, detailed earthy textures, muted dark midtones for bright characters to read. Top row left to right: mossy emerald forest clearing with ferns at corners; weathered sandstone desert courtyard with tiny ruins at corners; blue frozen lake with subtle snow and crystal edges; volcanic obsidian floor with glowing lava only at far edges; ancient purple magical ruin courtyard with worn stone tiles. Bottom row left to right: misty teal coastal stone platform with water at far edges; golden autumn forest clearing with scattered leaves; violet mushroom cavern flat ground with bioluminescence at edges; pale celestial marble courtyard with gold seams; dark crimson demon fortress floor with dim embers at edges. Ten clearly different environments, uniformly flat top-down and evenly lit center, matching grid coordinates, no characters, monsters, buildings in center, text, letters, logos, UI, arrows, grid marks or watermark. Opaque background, full-bleed atlas.
