# 공중 성채 맵 업데이트
도구: built-in image_gen. 기본맵1장 + 상점전장6장 생성.
파일: assets/map-citadel-{default,forest,frost,ember,arcane,ocean,royal}-v1.png
기본 프롬프트: Create final playable normal defense map based closely on reference floating citadel. Landscape16:9. Perfect orthographic top down, closed rectangular pale stone monster path centered at x10/90%, y10/90%, unobstructed corners, wide empty charcoal blue stone courtyard with faint gold compass, outer battlements braziers blue crystals misty abyss. No characters text interface.
테마 프롬프트: Preserve reference exact overhead camera, road geometry and composition. Change architectural materials and environment for forest (jade moss vines), frost (icy slate silver snow icicles), ember (basalt copper lava), arcane (amethyst silver constellation), ocean (wet teal pearl coral ocean mist), royal (navy gold ivory sunlight). No obstacles inside, no characters no text no interface.
렌더링: 이미지 도로 중심을 게임좌표10/90%로 투영하는9구역 캐시. 기존 돌길 오버레이 제거. 상점/보관함/실전 동일 이미지 사용. 기존 상품ID 및 장착 데이터 유지. 기본맵 단계별 색조 유지.
검증: 164개 테스트 통과. 6상품 매핑, 투영 경계, 캐시 제한 검증. 별도 미리보기 실제 캔버스7종과 이동경로 표시 확인.
