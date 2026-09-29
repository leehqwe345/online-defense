# 신규 챔피언 이미지 생성 기록

2026-09-28. Built-in image_gen. Transparent RGBA, 1536 × 1024, 4 × 2 / eight frames per sheet.

IDs 10–14: 뇌전술사, 그림자 암살자, 용기사, 해일술사, 룬 포격수.
Files: champion-{10..14}-attack-v1.png and champion-{10..14}-walk-v1.png.
Walking sheets reference the corresponding attack sheet. Frame extraction preserves opaque pixels and adds transparent margins.

## Attack prompt
Create a production chibi fantasy RPG game character sprite sheet. Exactly EIGHT attack frames in 4 columns x 2 rows, transparent RGBA background. Full-body three-quarter facing right, richly painted polished style matching the game's existing chibi heroes. Subject: SUBJECT. Same identity, costume, body scale and camera in all eight frames. Read left-to-right: idle anticipation, windup, deeper windup, release, attack peak, followthrough, recovery, idle pose. Keep every limb and weapon fully within its equal cell with 18% transparent gutters. Feet consistent baseline, no text grid labels ground or shadows. Landscape 1536x1024. Distinct coherent action poses, small contained effects.

## Subjects (ID order)
[
  "blue-black haired young male lightning sorcerer in navy and gold robes holding a lightning rod, cyan lightning arcs on casting",
  "silver haired female shadow assassin wearing dark violet leather and hood down wielding twin daggers, swift cross slash",
  "red haired male dragon knight wearing crimson and gold scaled armor with dragon pauldrons and long spear, forward spear thrust",
  "turquoise haired female tide mage wearing flowing pearl white and sea blue robes carrying a coral staff, sweeping water spell",
  "stout female dwarf rune gunner with copper braids and brass goggles carrying a heavy compact rune cannon, braced recoil shot"
]

## Walk prompt
Use attached attack sheet ONLY as character identity reference. Create an 8-frame seamless WALKING animation for EXACT SAME character, preserving face hairstyle costume weapon colors and chibi style. Exactly 4 columns x 2 rows in reading order. Transparent RGBA background, no text no grid no shadows or scenery. Full-body three-quarter view facing right. Eight distinct gait phases: left contact, down, passing, up, right contact, down, passing, up. Clearly alternating feet, bending knees and counter-swinging arms, subtle cloth and hair sway. Carry weapon close to body without attacking. NO projectiles or spell effects. Same body size in every cell, common foot baseline, 18% clear transparent gutters so no weapon or limb crosses cell boundary. Landscape 1536x1024.

## Water mage attack repair prompt
Fix this game sprite sheet using the same turquoise haired pearl-and-seashell water mage identity and white/sea-blue costume. Exactly EIGHT SEPARATE full-body ATTACK poses in precise 4 columns x 2 rows on transparent RGBA. CRITICAL reduce sprite size so each occupies no more than 65% cell width, centered, and leave WIDE empty gutters of 25% between characters. No water wave, no ring around body, NO external spell effects at all. Only staff and body action: idle, raise staff, raise higher, thrust forward, peak cast thrust, followthrough, lower staff, idle. Keep staff held inside each sprite cell. No touching or overlapping neighboring poses. Same height every frame. Transparent background, no text grid or ground. Landscape 1536x1024.
