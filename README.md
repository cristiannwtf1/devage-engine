<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:040408,50:003322,100:00ffbb&height=160&section=header&text=DEVAGE%20ENGINE&fontSize=42&fontColor=00ffbb&fontAlignY=38&desc=Programa%20tu%20ejército.%20Vence%20a%20la%20IA.&descAlignY=58&descColor=8899bb" />

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![Canvas](https://img.shields.io/badge/HTML_Canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![License](https://img.shields.io/badge/License-MIT-00ffbb?style=for-the-badge)](LICENSE)

<br/>

*Un RTS de un jugador donde tu arma es el código. Gratuito. Open source. Con IA adaptable.*

</div>

---

## ¿Qué es DEVAGE ENGINE?

DEVAGE ENGINE es un juego de estrategia en tiempo real inspirado en **Screeps**, **StarCraft** y **Age of Empires** — pero con un giro: en lugar de hacer clic, escribes **JavaScript** para controlar tus unidades.

Tu código se ejecuta **cada 300ms** (un "tick") mientras compites contra una **IA con personalidad propia** que tiene su base, sus workers y su estrategia de expansión.

<div align="center">

```
┌─────────────────────────────────────────────────────────────┐
│  ◈ JUGADOR           TICK 0847          ◈ IA ENEMIGA        │
│  1840 / 2000   ████████████████░░░░  1620 / 2000            │
│                                                             │
│  W · · · · · ·  ⚡ · · · ⚡ · · · ·  A · A · · · ·        │
│  · W · · · · ·  · · · · · · · · · ·  · · · A · · ·        │
│  · · · · ⚡ · ·  · · · · · · · ⚡ · ·  · · · · A · ·      │
│  🏠 · · · · · ·  · · · · · · · · · ·  · · · · · 🔴        │
└─────────────────────────────────────────────────────────────┘
```

</div>

---

## Inicio rápido

```bash
git clone https://github.com/cristiannwtf1/devage-engine
cd devage-engine
npm install
npm run dev
# → http://localhost:3000
```

Pega este script en el editor del browser y presiona **Ctrl+Enter**:

```javascript
// Este código corre cada tick mientras el juego avanza
for (const id in Game.workers) {
  const w = Game.workers[id]

  if (w.energy < w.energyCapacity) {
    // Buscar la source de energía más cercana
    let nearest = null, minDist = Infinity
    for (const sid in Game.sources) {
      const s = Game.sources[sid]
      const d = Math.abs(w.x - s.x) + Math.abs(w.y - s.y)
      if (s.energy > 0 && d < minDist) { minDist = d; nearest = s }
    }
    if (nearest) w.harvest(nearest.id)
  } else if (Game.base) {
    w.transfer(Game.base.id)  // Depositar en base
  }
}
```

---

## API del jugador

<div align="center">

| Objeto | Descripción |
|---|---|
| `Game.workers` | Todos tus workers `{ id, x, y, energy, energyCapacity, state }` |
| `Game.sources` | Fuentes de energía `{ id, x, y, energy, maxEnergy }` |
| `Game.base` | Tu base `{ id, x, y, energy, capacity }` |
| `Game.tick` | Tick actual |

| Comando | Acción |
|---|---|
| `worker.moveTo(x, y)` | Mover worker a posición |
| `worker.harvest(sourceId)` | Ir a cosechar una source |
| `worker.transfer(targetId)` | Depositar energía en la base |

</div>

---

## Arquitectura

```
devage-engine/
├── src/
│   ├── core/
│   │   ├── GameState.ts        ← ECS data store (todo el estado del mundo)
│   │   └── GameEngine.ts       ← Tick loop + orden de 13 sistemas
│   ├── systems/
│   │   ├── BehaviorSystem.ts   ← Máquina de estados harvesting/returning
│   │   ├── TargetSystem.ts     ← Asignación inteligente de objetivos
│   │   ├── PathfindingSystem.ts← BFS con esquiva de unidades
│   │   ├── MovementSystem.ts   ← Movimiento paso a paso con cooldown
│   │   ├── HarvestSystem.ts    ← Recolección de energía
│   │   ├── DepositSystem.ts    ← Depósito en base correcta (jugador/IA)
│   │   ├── SpawnSystem.ts      ← Spawn automático de workers
│   │   ├── ConstructionSystem.ts← Construcción de extensiones
│   │   ├── PlayerScriptSystem.ts← Sandbox de ejecución del JS del jugador
│   │   ├── AISystem.ts         ← IA con personalidades (expansionista/...)
│   │   ├── HealthSystem.ts     ← Sistema de daño
│   │   ├── DeathSystem.ts      ← Cleanup de entidades muertas
│   │   └── SourceRegenSystem.ts← Regeneración de energía en sources
│   ├── api/
│   │   └── GameAPI.ts          ← WorkerProxy + buildGameAPI()
│   └── server.ts               ← Express + WebSocket + /debug endpoint
└── public/
    ├── index.html              ← UI "La Red de Neones" — HUD tech
    └── game.js                 ← Renderer 60fps, interpolación, sparklines
```

---

## IA Oponente

La IA tiene **base propia**, workers independientes y economía paralela. Compite por las mismas fuentes de energía que el jugador. Sistema de personalidades:

<div align="center">

| Personalidad | Workers máx | Spawn delay | Estrategia |
|---|---|---|---|
| **Expansionista** ✅ | 12 | 3 ticks | Crece rápido, construye antes |
| **Defensiva** 🔜 | 6 | 8 ticks | Acumula, protege territorio |
| **Agresiva** 🔜 | 10 | 4 ticks | Ataca workers enemigos |

</div>

---

## Roadmap

<div align="center">

| Estado | Feature |
|---|---|
| ✅ | ECS Engine con 13 sistemas |
| ✅ | Pathfinding BFS con esquiva de unidades |
| ✅ | Renderer 60fps — canvas con efectos neón y glow |
| ✅ | Player JavaScript API (editor en browser, Ctrl+Enter) |
| ✅ | IA oponente expansionista con economía propia |
| ✅ | Panel v2 — sparklines, dominancia, worker dots, log de eventos |
| 🔜 | `Game.creeps['nombre']` — creeps con identidad |
| 🔜 | `creep.memory` — estado persistente entre ticks |
| 🔜 | Console del jugador en el panel |
| 🔜 | Personalidades IA: defensiva y agresiva + combate |
| 🔜 | Condición de victoria / derrota |
| 🔜 | Fog of war |
| 🔜 | Tutorial CODEX interactivo |

</div>

---

## vs Screeps

<div align="center">

| | Screeps | DEVAGE ENGINE |
|---|---|---|
| Precio | 💰 De pago | ✅ Gratis |
| IA single player | ❌ Solo PvP | ✅ IA con personalidades |
| Open source | ❌ | ✅ MIT |
| Visual | Básico | ✅ Neón 60fps |
| JS API | Completa | En desarrollo |

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00ffbb,50:003322,100:040408&height=80&section=footer" />

*Hecho con TypeScript, Node.js y demasiadas noches de bugs.*

</div>
