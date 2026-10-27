# Raja Gerai: Pasar Malam Dai Di

Classic 4-player Dai Di (Big Two) at a 1980s Malaysian night market, in 16-bit pixel art.
React + Tailwind for menus, a small custom WebGL2 renderer with normal-mapped dynamic lighting for the
pixel scene, and SNES-style chiptune audio synthesised live with the Web Audio API.

Earlier versions are kept in git: `3d-version` (React Three Fiber) and `cilok-pixel-version` (the CILOK! rules).

```sh
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Rules

- 52 cards, 13 each. Ranks 3 (low) … 10, J, Q, K, A, 2 (high). Four suits, two colours, one picture each:
  **Karipap** (red) < **Teh Tarik** (black) < **Ramly Burger** (red) < **Nasi Lemak** (black), like ◆ ♣ ♥ ♠.
- Round one opens with the Karipap 3 holder, who must include it. Later rounds, the last winner leads.
- **JUAL** a single, pair, three of a kind, or a 5-card hand that beats the GERAI (same card count, higher).
  5-card hands, weakest to strongest: **Barisan** (straight, no 2s), **Tapau** (flush), **Kenduri**
  (full house), **Borong** (four of a kind + 1), **Tapau Barisan** (straight flush). The top Tapau Barisan,
  10-J-Q-K-A of one suit, is the **Hidangan Diraja**.
- **LALU** to pass; you can still play later in the same GERAI. When play returns to the GERAI's owner,
  it's cleared and they lead anything.
- First to empty their hand wins the round. Every other hawker pays **DUIT**: 1 per card left, ×2 with
  10+ cards, ×3 if they never played (13 cards). Most DUIT after the last round is Raja Gerai.

## Layout

- `src/game/`: pure rules engine (`engine.ts` reducer, `rules.ts` hand classification, `ai.ts`, scripted `tutorial.ts`)
- `src/pixel/`: sprite art drawn in code (`sprites.ts`), atlas + auto normal maps, WebGL2 deferred-lighting
  renderer, responsive layout, and the `World` frame loop (cards, coins, particles, lights, reactions)
- `src/audio/AudioEngine.ts`: chiptune kroncong BGM, market ambience and all SFX
- `src/ui/`: menus, HUD, settlement and tutorial overlays
