# Monster locomotion assets · 2026-09-29

Generated using the built-in image generation tool, with transparent backgrounds. Seven atlases contain 42 monster designs with four locomotion frames each (168 frames). The runtime retains alpha, extracts each frame without reducing its resolution, and normalizes body height independently of transparent padding.

## Saved files and row order

- `assets/monster-walk-0-v1.png`: horned green slime, armored goblin, tusked boar, ice crystal elemental, fire imp, moss stone golem.
- `assets/monster-walk-1-v1.png`: purple hooded ghost, tentacled cyclops, cyan bat, poison mushroom, crowned jade guardian, red horned dragon.
- `assets/monster-walk-2-v1.png`: amber crystal snail, thorn-antler deer, carnivorous flower, lantern crow shaman, moss turtle, bee rider.
- `assets/monster-walk-3-v1.png`: wooden totem, mushroom herbalist, jade mantis, crystal crocodile, ice penguin knight, snow saber wolf.
- `assets/monster-walk-4-v1.png`: frost spider, spectral bell keeper, yeti, golden scorpion, baby sphinx, mummy priest.
- `assets/monster-walk-5-v1.png`: glass scarab, sand worm, lava hermit crab, walking furnace, obsidian goat, baby phoenix.
- `assets/monster-walk-6-v1.png`: molten centipede, clockwork insect, mimic chest, abyss squid sorcerer, star jellyfish, baby bone dragon.

## Generation prompt set

Common specification (each atlas substitutes its six row subjects above):

> Production sprite atlas. EXACT FOUR columns by SIX rows, 24 evenly spaced isolated sprites on a TRANSPARENT background. Each row is one consistent monster with four consecutive locomotion frames left to right, facing right in three-quarter view. Alternate limbs or wings; keep body scale and feet baseline consistent. Generous cell gutters, full bodies, no overlap. Polished chibi hand-painted fantasy defense game art, crisp outlines and strong silhouettes. No text or environment.

The first atlas additionally requested a 2048 × 2048 sheet, fixed body scale, feet baseline, generous gutters and no background shadows. Output dimensions are those returned by the image tool; runtime layout uses detected alpha bounds rather than assuming fixed pixel dimensions.

Final transparency refinement for atlases 1–6, referencing each generated atlas:

> Remove all background completely to TRUE TRANSPARENT ALPHA. Keep all 24 sprites in their positions, exact 4 columns × 6 rows, with shapes, colors, identities, frame motion and details unchanged. Cut background gradients, colored haze, backdrops and floor shadows. Transparent gutters. No replacement background or checkerboard. Preserve semitransparent edges. Production isolated sprite atlas.

## Verification

`monster-walk-layout.test.mjs` verifies 24 separate frames per atlas, no lost opaque pixels, and padded frame edges. All seven selected outputs are saved in this project; no runtime dependency on image-generation output directories is required.
