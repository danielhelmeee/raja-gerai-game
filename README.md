# CILOK! Pasar Malam Showdown

A 16-bit pixel-art climbing card game (Big Two tradition) set at a 1980s Malaysian night market.
React + Tailwind for menus, a small custom WebGL2 renderer with normal-mapped dynamic lighting for the
pixel scene, and SNES-style chiptune audio synthesised live with the Web Audio API.

The earlier 3D version is kept in git under the `3d-version` tag.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Rules in one breath

40 dish cards (1–10 × Kopitiam/Nasi/Roti/Kuih). **JUAL** a single, pair, triple, four of a kind or run (3+)
that beats the **GERAI** (same shape, higher number), or **LALU** (pass). When play returns to the Gerai's
owner unbeaten, they take every dish played on it as **HABUAN**. **CILOK!** steals the dish at either end of a
rival's Gerai (2+ dishes) and pays them 1 **DUIT**. Once per round the **CILOK & JUAL** stamp lets you steal and
sell in one turn. The round ends when a hand is empty. Score = Habuan + Duit − cards in hand.

## Layout

- `src/game/`: pure rules engine (`engine.ts` reducer, `rules.ts`, `ai.ts`, scripted `tutorial.ts`)
- `src/pixel/`: sprite art drawn in code (`sprites.ts`), atlas + auto normal maps, WebGL2 deferred-lighting
  renderer, responsive layout, and the `World` frame loop (cards, coins, particles, lights, reactions)
- `src/audio/AudioEngine.ts`: chiptune kroncong BGM, market ambience and all SFX
- `src/ui/`: menus, HUD, settlement and tutorial overlays
