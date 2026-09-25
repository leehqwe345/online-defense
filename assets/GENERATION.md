# v0.3 이미지 에셋

생성 방식: 내장 `image_gen` 도구. 외부 API 키나 CLI는 사용하지 않았습니다.

## 적용 파일

- `champions-v3.png`: 1536×1024 RGBA, 5열×2행 캐릭터 아틀라스.
- `effects-v3.png`: 1536×1024 RGBA, 5열×2행 공격 이펙트 아틀라스.

챔피언 순서: 총기, 활, 검, 얼음, 화염 / 대지, 바람, 독, 폭탄, 성장.

100종은 10가지 기본 캐릭터 그림을 계열별로 공유하며 이름별 색상 변형과 등급별 색·오라를 적용합니다. 100장 모두 다른 원화가 생성된 것은 아닙니다. 도감·보유 목록·상세창·전투 화면이 같은 이미지를 사용합니다.

원본 PNG의 알파 채널은 그대로 유지합니다. `node inspect-art.mjs`로 투명 픽셀과 부분 투명 픽셀을 확인할 수 있습니다. 도구 미리보기에서 배경처럼 보였지만 실제 파일에는 투명도가 들어 있습니다. 최초 투명 이미지 및 수정본 중 최종 선택한 캐릭터 변형만 프로젝트에 저장했습니다.

공격 모션은 생성된 정지 캐릭터를 Canvas에서 좌우 반전·반동·기울기·돌진·상하 이동시키는 방식입니다. 이미지 생성으로 여러 관절 프레임을 만든 스프라이트 애니메이션은 아닙니다. 이펙트는 생성된 텍스처를 발사체 이동·확대·회전·페이드 및 screen 블렌딩으로 재생합니다. 서버 피해 판정과 별도로 시각 효과만 재생하므로 밸런스에 영향을 주지 않습니다. 도감의 `공격 모션 보기`는 서버 게임에 영향을 주지 않는 독립 미리보기입니다.

## 최종 캐릭터 생성 프롬프트

```text
Production 2D video game character sprite atlas, stylized-concept. Landscape 1536x1024, exact 5 columns by 2 rows, each tile equal 307x512. Background is ONE SOLID UNIFORM pure chroma-key magenta #ff00ff everywhere, absolutely flat with no gradient no glow no floor no shadow. Ten SMALL full body chibi fantasy adventurers. Each figure occupies ONLY the central 65% width and 65% height of its cell, abundant magenta gutters separating every figure. Full weapons fit inside own cell. Consistent 3D painted mobile RPG quality, three-quarter camera, facing right, large cute heads. TOP ROW left to right: bronze rifleman with short scoped gun; green elf archer bow; silver sword knight red scarf; blue ice mage crystal staff; red fire sorceress flame staff. BOTTOM ROW: brown earth dwarf stone hammer; turquoise wind monk fans; violet poison plague doctor green flask; orange bomb engineer round bomb; dark violet reaper small scythe. Faces, hands, bodies and boots clearly visible. No words no text no UI no frames. Do NOT fill background with environmental color. Solid RGB255,0,255 background is mandatory for runtime chroma key. No magenta on the characters themselves.
```

결과는 프롬프트의 마젠타 배경 대신 실제 RGBA 투명 배경으로 생성되었습니다. 따라서 크로마키 처리를 추가하지 않고 알파 채널을 사용합니다.

## 최종 이펙트 생성 프롬프트

```text
Use case: stylized-concept. A GAME VFX TEXTURE ATLAS, no characters. One landscape 1536x1024 image, exactly 5 equal columns and 2 equal rows. Every cell on pure black #000000 background for additive blending. Ten separate isolated luminous fantasy combat effects, centered in their cells with large black gaps, never overlapping between cells. Top row in order: 1 sharp golden gun muzzle flash starburst pointing RIGHT, 2 luminous green arrow projectile flying RIGHT with wind trail, 3 broad silver-white crescent sword slash sweeping clockwise, 4 icy cyan crystal explosion with snow shards, 5 vivid orange fireball explosion with flame petals. Bottom row: 6 golden earth impact burst stone shards and dust, 7 turquoise circular wind vortex, 8 acid green poison splash and droplets, 9 orange bomb explosion with round white-hot core and sparks, 10 violet soul reaping crescent with purple wisps. Crisp hand-painted RPG game effects, cinematic colored glow, high contrast, texture details, no scenery, no characters, no lettering, no text, no labels, no decorative panel borders. Black background with each effect fading smoothly into absolute black at cell boundaries. All ten effects distinct and occupy central 65% of each uniform cell.
```
