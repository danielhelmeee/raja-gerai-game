# CILOK! Pasar Malam Showdown

A 3D climbing card game (Big Two tradition) set at a 1980s Malaysian night market.
React + React Three Fiber + Tailwind; all audio is synthesised live with the Web Audio API.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Rules in one breath

40 dish cards (1–10 × Kopitiam/Nasi/Roti/Kuih). **JUAL** a single, pair, triple, four of a kind or run (3+)
that beats the **GERAI** (same shape, higher number), or **LALU** (pass). When play returns to the Gerai's
owner unbeaten, they take every dish played on it as **HABUAN**. **CILOK!** steals the top dish off a rival's
Gerai (2+ dishes) and pays them 1 **DUIT**. Once per round the **CILOK & JUAL** stamp lets you steal and sell in
one turn. Four of a kind triggers **PUSING**: low beats high until another four of a kind. The round ends when a
hand is empty. Score = Habuan + Duit − cards in hand.

## Layout

- `src/game/`: pure rules engine (`engine.ts` reducer, `rules.ts`, `ai.ts`, scripted `tutorial.ts`)
- `src/three/`: the 3D table, cards, coins, plates, stamps, hawker avatars, camera rig
- `src/audio/AudioEngine.ts`: kroncong BGM, market ambience and all SFX
- `src/ui/`: menus, HUD, settlement and tutorial overlays
