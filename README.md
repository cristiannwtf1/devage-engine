<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:040810,50:001a3a,100:00aaff&height=200&section=header&text=CODESTRIKE&fontSize=52&fontColor=00aaff&fontAlignY=40&desc=Real-Time%20Strategy%20%7C%20Code%20Your%20Army&descAlignY=60&descColor=2266aa&animation=fadeIn" />

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-black?style=for-the-badge&logo=socket.io&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![Canvas API](https://img.shields.io/badge/Canvas_60fps-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

<br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Share+Tech+Mono&size=16&pause=1200&color=0099DD&center=true&vCenter=true&width=600&lines=Un+RTS+donde+tu+arma+es+el+código;Escribe+JavaScript.+Controla+tu+ejército.;Compite+contra+una+IA+que+también+piensa;Construido+con+TypeScript+%2B+Node.js+%2B+Canvas)](https://git.io/typing-svg)

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:040810,100:001a3a&height=3&section=header" />

</div>

## ⬡ El concepto

En lugar de hacer clic, **escribes código** para controlar tus unidades. Cada 300ms tu script se ejecuta en el servidor y tus workers obedecen tus instrucciones — mientras una **IA enemiga** con su propia base y su propia estrategia hace exactamente lo mismo en el otro lado del mapa.

<div align="center">

```
╔══════════════════════════════════════════════════════════════╗
║  ◈ TÚ                TICK  0847             ◈ IA ENEMIGA    ║
║  ─────────────────                    ───────────────────   ║
║  1840 / 2000         ████████████░░                         ║
║                              vs                             ║
║                                         ░░████████████      ║
║                                              1620 / 2000    ║
║                                                             ║
║   W ···⚡···  ⚡ · · · · ⚡ · · · · ⚡ ···A···A            ║
║   ·W · · · ·  · · · · · · · · · · · · · · · A · ·          ║
║   🏠· · · · ·  · · · · · · · · · · · · · · · 🔴            ║
╚══════════════════════════════════════════════════════════════╝
```

</div>

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:001a3a,100:002255&height=60&section=header&text=Inicio+rápido&fontSize=22&fontColor=00aaff&fontAlignY=65" />
</div>

```bash
git clone https://github.com/cristiannwtf1/devage-engine
cd devage-engine
npm install
npm run dev
```

Abre **http://localhost:3000**, escribe en el editor y presiona `Ctrl+Enter`:

```javascript
// Tu estrategia corre cada tick mientras el mundo avanza en tiempo real
for (const id in Game.workers) {
  const w = Game.workers[id]

  if (w.energy < w.energyCapacity) {
    let nearest = null, minDist = Infinity
    for (const sid in Game.sources) {
      const s = Game.sources[sid]
      const d = Math.abs(w.x - s.x) + Math.abs(w.y - s.y)
      if (s.energy > 0 && d < minDist) { minDist = d; nearest = s }
    }
    if (nearest) w.harvest(nearest.id)
  } else {
    w.transfer(Game.base.id)
  }
}
```

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:001a3a,100:002255&height=60&section=header&text=API+del+jugador&fontSize=22&fontColor=00aaff&fontAlignY=65" />
</div>

<div align="center">

| Objeto | Tipo | Descripción |
|:---|:---:|:---|
| `Game.workers` | `Record<id, Worker>` | Todos tus workers activos |
| `Game.sources` | `Record<id, Source>` | Fuentes de energía del mapa |
| `Game.base` | `Base` | Tu base principal |
| `Game.tick` | `number` | Tick actual del mundo |

| Método | Descripción |
|:---|:---|
| `worker.moveTo(x, y)` | Moverse a una coordenada |
| `worker.harvest(sourceId)` | Ir a cosechar energía |
| `worker.transfer(targetId)` | Depositar energía en la base |

</div>

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:001a3a,100:002255&height=60&section=header&text=Arquitectura+ECS&fontSize=22&fontColor=00aaff&fontAlignY=65" />
</div>

El engine usa **Entity Component System (ECS)** — un patrón de arquitectura de juegos donde los datos viven separados de la lógica, permitiendo que todos los sistemas operen en paralelo sobre las mismas entidades.

```
GameState (datos)          GameEngine (lógica — 13 sistemas por tick)
───────────────            ──────────────────────────────────────────
entities: Set              1. BehaviorSystem     — estado de cada worker
positions: Map             2. PlayerScriptSystem — tu código JS
healths: Map               3. TargetSystem       — asignación de objetivos
behaviors: Map             4. PathfindingSystem  — BFS con esquiva
targets: Map               5. MovementSystem     — movimiento real
paths: Map                 6. HarvestSystem      — cosecha de energía
sources: Map               7. DepositSystem      — depósito en base
workers: Set               8. HealthSystem       — procesamiento de daño
aiWorkers: Set             9. DeathSystem        — limpieza de entidades
structures: Map           10. SpawnSystem        — nuevos workers
aiBaseId: EntityId        11. ConstructionSystem — extensiones
playerScript: string      12. AISystem           — IA enemiga
                          13. SourceRegenSystem  — regeneración
```

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:1a0005,100:330010&height=60&section=header&text=IA+Oponente&fontSize=22&fontColor=ff5544&fontAlignY=65" />
</div>

La IA tiene **su propia base**, sus **propios workers** y su **propia economía**. Compite por las mismas fuentes de energía en tiempo real, toma decisiones de spawn y construcción de forma autónoma.

<div align="center">

| Personalidad | Workers | Estrategia | Estado |
|:---:|:---:|:---|:---:|
| **Expansionista** | 12 | Crece rápido, construye antes que el jugador | ✅ Activa |
| **Defensiva** | 6 | Acumula, fortifica su territorio | 🔜 |
| **Agresiva** | 10 | Ataca workers enemigos directamente | 🔜 |

</div>

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:001a3a,100:002255&height=60&section=header&text=Visual&fontSize=22&fontColor=00aaff&fontAlignY=65" />
</div>

El renderer corre a **60fps** usando `requestAnimationFrame` con **interpolación de posiciones** entre ticks — las unidades se mueven suavemente aunque el servidor actualice cada 300ms.

<div align="center">

| Feature visual | Descripción |
|:---|:---|
| **Glow neón** | `canvas.shadowColor/shadowBlur` en todas las entidades |
| **Rutas animadas** | Líneas punteadas desde worker hasta su destino |
| **Sources pulsantes** | Anillo de pulso basado en nivel de energía |
| **Interpolación** | Movimiento suave entre ticks del servidor |
| **Scan lines** | Efecto CRT sutil sobre el canvas |
| **Sparklines** | Gráfico de energía en tiempo real para ambas facciones |
| **Barra de dominancia** | Comparación jugador vs IA en tiempo real |

</div>

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:001a3a,100:002255&height=60&section=header&text=Roadmap&fontSize=22&fontColor=00aaff&fontAlignY=65" />
</div>

<div align="center">

| | Feature |
|:---:|:---|
| ✅ | ECS Engine con 13 sistemas |
| ✅ | Pathfinding BFS con esquiva de unidades |
| ✅ | Renderer 60fps con interpolación y efectos neón |
| ✅ | Player JavaScript API con editor en browser |
| ✅ | IA oponente con personalidad expansionista |
| ✅ | Panel con sparklines, dominancia y log de eventos |
| ✅ | Condición de victoria / derrota |
| ✅ | Partículas de energía al cosechar |
| 🔜 | `Game.creeps['nombre']` — unidades con identidad |
| 🔜 | `creep.memory` — memoria persistente entre ticks |
| 🔜 | Personalidades IA: defensiva y agresiva + combate |
| 🔜 | Fog of war |
| 🔜 | Tutorial interactivo integrado |

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00aaff,50:002255,100:040810&height=100&section=footer" />

**© 2026 Cristian. Todos los derechos reservados.**<br/>
*Este repositorio es de uso público para lectura y aprendizaje.<br/>No se permite el uso comercial, redistribución ni modificación sin autorización expresa del autor.*

</div>
