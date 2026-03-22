# ⬡ DEVAGE ENGINE

> *Un juego de estrategia en tiempo real donde programas tu ejército en JavaScript*

```
  ◈ JUGADOR              ◈ IA ENEMIGA
  450 / 2000             380 / 1800
  ████████░░░░           ██████░░░░░░
  W W W W W W W W   vs   A A A A A A A A A A A A
```

---

## ¿Qué es?

DEVAGE ENGINE es un RTS de un jugador inspirado en [Screeps](https://screeps.com/) pero **gratuito, open source y con IA adaptable**. En lugar de hacer clic, escribes JavaScript para controlar tus unidades — y compites contra una IA que también tiene su propia base, sus propios workers y su propia estrategia.

---

## Demo rápida

```bash
git clone https://github.com/cristiannwtf1/devage-engine
cd devage-engine
npm install
npm run dev
# Abre http://localhost:3000
```

Escribe tu primer script en el editor del browser:

```javascript
// Tu código corre cada tick (300ms)
for (const id in Game.workers) {
  const w = Game.workers[id]

  if (w.energy < w.energyCapacity) {
    // Encontrar la source más cercana
    let nearest = null, minDist = Infinity
    for (const sid in Game.sources) {
      const s = Game.sources[sid]
      const d = Math.abs(w.x - s.x) + Math.abs(w.y - s.y)
      if (s.energy > 0 && d < minDist) { minDist = d; nearest = s }
    }
    if (nearest) w.harvest(nearest.id)
  } else if (Game.base) {
    w.transfer(Game.base.id)
  }
}
```

---

## Arquitectura

```
src/
├── core/
│   ├── GameState.ts        — Estado del mundo (ECS data store)
│   └── GameEngine.ts       — Loop de tick + orden de sistemas
├── systems/
│   ├── BehaviorSystem      — Máquina de estados (harvesting/returning)
│   ├── TargetSystem        — Asignación de objetivos
│   ├── PathfindingSystem   — BFS con esquiva de obstáculos
│   ├── MovementSystem      — Movimiento paso a paso
│   ├── HarvestSystem       — Recolección de energía
│   ├── DepositSystem       — Depósito en base
│   ├── SpawnSystem         — Creación de nuevos workers
│   ├── ConstructionSystem  — Construcción de extensiones
│   ├── PlayerScriptSystem  — Ejecución del JS del jugador
│   └── AISystem            — IA con personalidades
├── api/
│   └── GameAPI.ts          — API expuesta al jugador (Game.workers, etc.)
└── server.ts               — Express + WebSocket server
public/
├── index.html              — UI del juego (tema neón tech)
└── game.js                 — Renderer 60fps con interpolación + panel
```

**Stack:** TypeScript · Node.js · Express · WebSocket · HTML Canvas

---

## API del jugador

```typescript
Game.workers    // Record<id, WorkerProxy>
Game.sources    // Record<id, { x, y, energy, maxEnergy }>
Game.base       // { id, x, y, energy, capacity }
Game.tick       // número de tick actual

worker.moveTo(x, y)         // mover a posición
worker.harvest(sourceId)    // ir a cosechar source
worker.transfer(baseId)     // ir a depositar en base
```

---

## IA Oponente

La IA tiene su propia base, workers y economía. Actualmente implementada con personalidad **expansionista** (spawn rápido, construye extensiones agresivamente). Próximamente: defensiva y agresiva.

---

## Roadmap

- [x] ECS Engine con 12 sistemas
- [x] Pathfinding BFS con esquiva de workers
- [x] Visual tiempo real — canvas 60fps con efectos neón
- [x] Player JavaScript API (editor en browser)
- [x] IA oponente con personalidad expansionista
- [x] Panel de estadísticas: sparklines, dominancia, log de eventos
- [ ] Creeps con nombre (`Game.creeps['minero1']`)
- [ ] `creep.memory` persistente entre ticks
- [ ] Console del jugador en el panel
- [ ] Personalidades IA: defensiva y agresiva
- [ ] Combate básico entre facciones
- [ ] Fog of war
- [ ] Tutorial interactivo (CODEX)

---

## Licencia

MIT — úsalo, modifícalo, mejóralo.
