# Corper Life

A 3D web life-sim about the NYSC service year: orientation camp, your PPA, CDS and Passing Out Parade.

## Run it locally

You need Node.js 18 or newer.

```bash
npm install
npm run dev      # open the link it prints (usually http://localhost:5173)
npm run build    # production build in dist/, ready for Vercel or Netlify
```

## Controls

- Move: WASD or arrow keys (on phones, the on-screen stick). Hold Shift, or push the stick all the way, to run.
- Walk onto a yellow ring to see what you can do there, then press 1–4 (or E) or tap the button.
- P opens your phone: tasks, allawee wallet and profile.

## How the game works

- Time: 1 real second = 2 game minutes. Each service "month" is one in-game week.
- Needs: energy, fullness and mood drain over time. Run out of energy and you faint.
- Camp (Mon–Thu): register, get sworn in, attend drills, lectures and SAED, then collect your posting letter.
- PPA (4 months): each month work 3 days at your PPA, attend CDS on Thursday, then get cleared by the LGI on Friday or Saturday. Allawee (₦77,000) pays on Monday if you were cleared. Rent comes out monthly.
- Side hustles: POS stand at the market and private lessons at the estate. SAED skills raise what they pay.
- Ending: finish the CDS project with a high corps rating and no missed clearance to win a State Honours Award.

## Code map

- `src/game/` – rules: time, stations and their actions, random events, the Zustand store (save/load in localStorage).
- `src/world/` – React Three Fiber scenes: camp, town, player, NPCs, lighting, Rapier physics.
- `src/ui/` – HUD, phone, menus and modals.

To add a new place, add a station to `src/game/stations.ts` with its actions; it appears in the world with a ring and label automatically.
