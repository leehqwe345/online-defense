# 전투 배경 / 통로 이미지

2026-09-27, 내장 image_gen 사용.

- battle-terrains-v6.png: 10지역 배경. 프롬프트: Top-down orthographic fantasy battlefield terrain atlas, 2 columns and 5 rows. Moss forest, golden desert, frozen lake, basalt volcano, arcane ruins, coast, autumn forest, violet cavern, celestial sanctuary, demon fortress. Open central ground, edge decorations only, no paths, units, text or UI. Wide landscape cells.
- battle-road-v1.png: 돌길 텍스처. 프롬프트: Seamless tileable top-down fantasy cobblestone paving texture, small irregular grey taupe worn stone slabs, subtle moss in joints, soft ambient lighting, no border, road shape, objects or text.

생성 결과의 실제 행 경계를 사용해 타일을 분리합니다. 배경은 화면 비율에 맞춰 중심 크롭하며 늘이지 않습니다. 통로는 화면 픽셀에서 같은 폭으로 그리고 실제 몬스터 경로인 10%~90% 위치에 배치합니다. 기존 10라운드별 테마 전환을 유지합니다.
