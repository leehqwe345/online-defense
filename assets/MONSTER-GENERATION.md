# 몬스터 이미지와 피격·사망 연출 (v0.4)

내장 image_gen 도구로 새로 생성한 RGBA PNG이며 원본 알파를 그대로 사용합니다. CLI/API 대체 도구는 사용하지 않았습니다.

- `assets/monsters-v4.png`: 1536×1024, 4열 × 3행. 일반 10종(방어속성 family 0~9), 보스 2종. 보스는 10라운드마다 두 외형을 번갈아 사용합니다.
- `assets/monster-reactions-v4.png`: 1536×1024, 4열 × 2행. 첫 행은 타격 섬광 4프레임, 둘째 행은 사망 소멸 4프레임.
- 본체는 정지 이미지에 이동 보브, 좌우 방향, 피격 반동·스쿼시·화이트 플래시, 사망 회전·축소·페이드를 적용합니다. 관절별로 그린 프레임 애니메이션은 아닙니다.
- 전투의 몬스터 수·골드·처치 수·웨이브 진행은 기존대로 즉시 갱신됩니다. 사망 이미지는 별도 연출로만 남습니다. 독·광역 처치도 이벤트에 포함되며 면역으로 피해가 없으면 피격 연출이 생기지 않습니다.
- 서버는 사망 이벤트를 게임 시간 1.5초 보관합니다. 클라이언트는 이벤트를 한 번만 재생하며 싱글 일시정지 시 시각 시간도 정지합니다. 일반 사망 0.8초, 보스 사망 1.1초.
- 전장 브리핑의 ‘몬스터 피격·사망 보기’에서 12종의 연출을 확인할 수 있습니다. 미리보기는 실제 방에 행동을 전송하지 않습니다.

## 생성 프롬프트

### monsters-v4.png

Use case: stylized-concept. Asset type: production transparent monster sprite atlas for a fantasy square-loop tower defense game. Generate ONE sprite sheet, exactly FOUR equal columns and THREE equal rows, 1536x1024 landscape canvas, genuine transparent alpha background. Twelve separate full-body creatures, one centered per cell, consistent charming premium painted 3D chibi game style, bold readable silhouettes and high contrast suitable at 48 pixels. Facing three-quarter RIGHT. Rows left to right: row 1 moss-green horned slime, bronze armored goblin with shield, tusked red-brown boar, cyan ice crystal sprite; row 2 red flame imp, chunky sandstone golem, purple shadow wraith, violet floating tentacled eye; row 3 teal wind bat, yellow toxic mushroom creature, imposing jade ancient guardian BOSS with massive stone arms and gold crown, imposing crimson horned dragon BOSS with folded wings. NOT human heroes. All are entire full body with feet/base at 82 percent of cell height. Each creature occupies central 70 percent of cell width and height, generous TRANSPARENT padding on ALL sides, absolutely no overlaps, no scenery, no floor, no text, no labels, no borders, no watermark, no cast shadows. Maintain perfectly equal grid cells; each boss also stays within its own single cell. Subtle warm highlights and dark outline edges. Genuinely transparent empty areas, not a checkerboard drawing.

### monster-reactions-v4.png

Use case: stylized-concept. Asset type: one fantasy tower defense monster reaction VFX animation atlas. 1536x1024 landscape, EXACTLY FOUR equal columns and TWO equal rows, genuine transparent alpha background. Premium hand-painted glowing magic sprites with crisp silhouette and softly fading transparent edges, matching colorful chibi fantasy creatures. TOP ROW is four consecutive animation frames of a warm gold-white HIT SPARK: tiny sharp contact flare, bright starburst with short shards, expanding gold broken ring, faint drifting sparks. BOTTOM ROW is four consecutive frames of a teal and gold magical DEATH DISSOLVE: compact pale teal spirit burst, round teal smoke puff with gold shards, larger fading dispersed smoke with rising soul wisps, very faint separated wisps and golden motes. Frames must be separate, perfectly centered in equal cells, maintain same center between frames. Each effect must fit central 70 percent of its cell with generous transparent padding all sides. No monsters or characters, no blood, no scenery, no backgrounds, no ground, no shadows, no text, no border, no grid lines, no checkerboard drawing. Real transparent empty pixels around each effect. Small-scale videogame readability.

## 검증

추가 테스트: `node --test monster-visuals.test.js` (8개). 실제 브라우저에서 일반 몬스터 피격, 보스 소멸, 전투 화면을 확인했습니다.

작업 전부터 전체 테스트에는 현재 구현과 기존 테스트의 불일치 2개가 있습니다: 챔피언은 현재 10종인데 테스트는 100종을 기대하며, 현재 2배속 고정인데 테스트는 3배속을 기대합니다. 이 업데이트는 해당 규칙을 변경하지 않습니다.

