# 몬스터 피격 / 보스 피해 이미지
도구: built-in image_gen (투명 PNG)
- assets/monster-hit-materials-v1.png: 4열 × 6행, 재질별 4프레임. 생물/돌/얼음/나무/금속/영체. 40개 일반 몬스터와 14개 보스에 명시적 매핑.
- assets/boss-damage-stages-v1.png: 3열 × 6행, 체력 75/50/25% 이하 단계별 상처, 균열. 체력 회복 시 현재 구간으로 복원.
피격 애니메이션은 0.36초이며 기존 움츠림/흔들림과 함께 재생. 중/저 옵션에서 피격 프레임 생략, 저에서 보스 상처도 생략. 전투 판정 변경 없음.
생성 프롬프트 1: Game VFX sprite atlas, transparent background, exactly 4 columns by 6 rows, uniform square cells. Each row is a 4-frame left-to-right sequence of a monster receiving a hit, expanding then dissipating. Effects only, no creatures/text/gridlines. Organic subtle red slash and small droplets; stone gray chips dust; ice cyan shards frost; wood bark splinters leaves; metal bronze chips sparks; spectral turquoise violet wisps. Contact, strongest burst, spread, fade. Premium hand-painted fantasy tower defense style.
생성 프롬프트 2: Transparent PNG game damage decal atlas, exactly 3 columns x 6 rows, uniform cells. Columns increasing minor/moderate/severe damage. Rows organic crimson scratches non-graphic; stone jagged cracks; ice navy cracks cyan chips; wood split bark; metal armor dents; spectral violet cyan fissures. No creatures/text/borders, transparent holes to see original boss underneath, sharp edges.
검증: 전체 테스트 157개 통과. 별도 캔버스에서 재질 6종과 보스 HP 100/70/45/20% 비교. 브라우저 오류 없음.
