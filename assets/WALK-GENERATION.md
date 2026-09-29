# 챔피언 걷기 이미지 생성 기록

Built-in image_gen 사용. 기존 공격 시트를 캐릭터 외형 참고 이미지로 사용하여 10종 × 8프레임을 생성했습니다. 원본 RGBA 투명도를 유지합니다.

## 저장 파일
- assets/champion-0-walk-v1.png (외형 참고: champion-0-attack-v1.png)
- assets/champion-1-walk-v1.png (외형 참고: champion-1-attack-v1.png)
- assets/champion-2-walk-v1.png (외형 참고: champion-2-attack-v1.png)
- assets/champion-3-walk-v1.png (외형 참고: champion-3-attack-v1.png)
- assets/champion-4-walk-v1.png (외형 참고: champion-4-attack-v1.png)
- assets/champion-5-walk-v1.png (외형 참고: champion-5-attack-v1.png)
- assets/champion-6-walk-v1.png (외형 참고: champion-6-attack-v1.png)
- assets/champion-7-walk-v1.png (외형 참고: champion-7-attack-v1.png)
- assets/champion-8-walk-v1.png (외형 참고: champion-8-attack-v1.png)
- assets/champion-9-walk-v1.png (외형 참고: champion-9-attack-v1.png)

## 공통 최종 프롬프트

Use the attached character attack sheet ONLY as an identity reference. Create a NEW game animation sprite sheet of this EXACT SAME character WALKING, preserve face hair costume weapon colors and painted chibi style. Exactly 8 full-body walking poses in strict 4 columns x 2 rows, reading order. Transparent RGBA background. A seamless grounded walk cycle facing right in three-quarter view: left foot forward contact, left foot weight/down, legs passing, right knee forward/up, right foot forward contact, right foot weight/down, legs passing, left knee forward/up. Obvious alternating leg steps and counter-swinging arms, subtle hair and cloth sway. Weapon carried safely close to body; NO attacks NO projectiles NO magic effects NO ground shadows. Keep same body proportions, camera angle and character height across every frame. Entire head, feet, and weapon fully inside its cell with 18% clear transparent gutters on all sides. Equal cells, feet on consistent baseline, no text numbers or grid lines. Landscape 1536x1024.

## 게임 적용

실제 이동 거리 64px당 8프레임 한 주기를 재생합니다. 정지/충돌 시 대기, 일시정지 시 현재 프레임 유지. 공격과 걷기의 발 기준점 및 캐릭터 표시 크기를 맞춥니다.

