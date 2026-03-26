import express from "express"
import { WebSocketServer, WebSocket } from "ws"
import * as http from "http"
import * as path from "path"
import { GameState } from "./core/GameState"
import { GameEngine } from "./core/GameEngine"
import { AiDifficulty } from "./systems/AISystem"
import { EntityId } from "./ecs/Entity"
import { TileType } from "./world/Tile"

// ═══════════════════════════════════════════════════════════
//  MUNDOS POR MISIÓN — cada misión tiene su propio layout
// ═══════════════════════════════════════════════════════════

// ─── M1: Sector 7-Gamma · Nodo Alfa — Instalación de extracción NEXUS ──
//
//  BASE JUGADOR (3,11) — corredor — CÁMARA SOURCE (8,11)
//  CÁMARA SOURCE (31,11) — corredor — BASE IA (36,11)
//  Torres relay NEXUS en el centro (x=17-22) flanquean el corredor y=10-11
//
function buildWallsM1(gs: GameState): void {
  const W = TileType.Wall
  const row = (y: number, x1: number, x2: number) => {
    for (let x = x1; x <= x2; x++) gs.worldMap.setTile(x, y, W)
  }
  const col = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) gs.worldMap.setTile(x, y, W)
  }

  // ── CÁMARA DEL SOURCE (jugador) ─────────────────────────
  // Sala más amplia: x=7-13, y=8-14 — abierta por la izquierda (entrada en y=10-12)
  row(8,  7, 13);  row(14, 7, 13);  col(13, 8, 14)

  // ── CORREDOR DE ACCESO (jugador) ────────────────────────
  // Chokepoint en y=10-12, x=5-6 — workers pasan en fila de 1
  row(9,  5, 6);   row(13, 5, 6)

  // ── CÁMARA DEL SOURCE (IA) ──────────────────────────────
  // Espejo exacto: x=26-32, y=8-14 — abierta por la derecha
  row(8,  26, 32); row(14, 26, 32); col(26, 8, 14)

  // ── CORREDOR DE ACCESO (IA) — espejo ────────────────────
  row(9,  33, 34); row(13, 33, 34)

  // ── TORRES RELAY NEXUS — estructura central ──────────────
  // Dos torres simétricas en x=17 y x=22 con vigas horizontales.
  // Corredor central libre en y=10-11. Workers rodean o atraviesan.
  row(5,  17, 22);                      // viga norte superior
  col(17, 5,  9);  col(22, 5,  9)       // columnas norte (y=5..9)
  col(17, 12, 16); col(22, 12, 16)      // columnas sur   (y=12..16)
  row(16, 17, 22)                       // viga sur inferior
}

function buildWorldM1(gs: GameState): void {
  buildWallsM1(gs)
  gs.maxPlayerWorkers = 3
  gs.aiMaxWorkers     = 3   // M1: 1 source × 3 workers = saturación exacta
  // (terrain orgánico se añade al final, tras colocar entidades)

  const addSource = (x: number, y: number, isPlayer: boolean) => {
    const id: EntityId = gs.createEntity()
    gs.entities.add(id)
    gs.positions.set(id, { x, y })
    gs.sources.set(id, { energy: 100, maxEnergy: 100, regenRate: 3, regenCooldown: 20, currentCooldown: 0 })
    if (isPlayer) gs.playerSourceIds.add(id)
  }
  addSource(8, 11, true)
  addSource(31, 11, false)

  // Base jugador
  const baseId: EntityId = gs.createEntity()
  gs.entities.add(baseId)
  gs.positions.set(baseId, { x: 3, y: 11 })
  gs.energyStorages.set(baseId, { current: 0, capacity: 500 })
  gs.baseId = baseId

  // Workers iniciales jugador — idle
  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 4 + i, y: 11 })
    gs.healths.set(w, { current: 100, max: 100 })
    gs.workers.set(w, { isWorker: true })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
  }

  // Base IA
  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 36, y: 11 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 500 })
  gs.aiBaseId = aiBaseId

  // Workers iniciales IA — idle (AISystem los activa en gs.tick === startDelay)
  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 35 - i, y: 11 })
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
    gs.aiWorkers.add(w)
  }
  addOrganicTerrain(gs, 1)
}

// ─── M2: Una sala, 2 sources por lado + montaña central ───
//
//  Sources en S1=(8,6) y S2=(8,16) jugador | S1=(31,6) y S2=(31,16) IA
//  Montaña central en diamante — 3 corredores: norte, centro(y=11), sur
//  Mecánica nueva: gestionar múltiples sources (findNearest)
//
// ─── M2: Sector 7-Gamma · Zona Beta — Dos venas de extracción ──────────
//
//  Dos cámaras de extracción por lado (norte + sur), abiertas hacia la base.
//  Sources jugador: Norte(8,6) · Sur(8,16)   ←  base(3,11)
//  Sources IA:      Norte(31,6) · Sur(31,16)  → base(36,11)
//  Nodo Bifurcador Beta en el centro — torres norte/sur, corredor y=9-13 libre.
//
function buildWallsM2(gs: GameState): void {
  const W = TileType.Wall
  const row = (y: number, x1: number, x2: number) => {
    for (let x = x1; x <= x2; x++) gs.worldMap.setTile(x, y, W)
  }
  const col = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) gs.worldMap.setTile(x, y, W)
  }

  // ── CÁMARA NORTE JUGADOR — source(8,6) ─────────────────────────────────
  // Sala industrial: x=7-12, y=4-8. Abierta al oeste (entrada desde la base).
  row(4, 7, 12); row(8, 7, 12); col(12, 4, 8)

  // ── CÁMARA SUR JUGADOR — source(8,16) ──────────────────────────────────
  row(14, 7, 12); row(18, 7, 12); col(12, 14, 18)

  // ── CÁMARA NORTE IA — source(31,6) — espejo ────────────────────────────
  // Abierta al este (hacia la base IA en x=36).
  row(4, 27, 32); row(8, 27, 32); col(27, 4, 8)

  // ── CÁMARA SUR IA — source(31,16) — espejo ─────────────────────────────
  row(14, 27, 32); row(18, 27, 32); col(27, 14, 18)

  // ── NODO BIFURCADOR BETA — reactor central ──────────────────────────────
  // Dos torres industriales que canalizan el flujo norte/sur.
  // Corredor y=9-13 permanece libre (paso base↔base).
  row(4,  17, 22)                        // viga norte
  col(17, 4,  8);  col(22, 4,  8)        // columnas torre norte (y=4..8)
  col(17, 14, 18); col(22, 14, 18)       // columnas torre sur   (y=14..18)
  row(18, 17, 22)                        // viga sur
}

function buildWorldM2(gs: GameState): void {
  buildWallsM2(gs)
  gs.maxPlayerWorkers = 6
  gs.aiMaxWorkers     = 6   // M2: 2 sources × 3 workers

  const addSource = (x: number, y: number, isPlayer: boolean) => {
    const id: EntityId = gs.createEntity()
    gs.entities.add(id)
    gs.positions.set(id, { x, y })
    gs.sources.set(id, { energy: 100, maxEnergy: 100, regenRate: 4, regenCooldown: 20, currentCooldown: 0 })
    if (isPlayer) gs.playerSourceIds.add(id)
  }
  // Sources jugador
  addSource(8, 6, true)
  addSource(8, 16, true)
  // Sources IA
  addSource(31, 6, false)
  addSource(31, 16, false)

  // Base jugador
  const baseId: EntityId = gs.createEntity()
  gs.entities.add(baseId)
  gs.positions.set(baseId, { x: 3, y: 11 })
  gs.energyStorages.set(baseId, { current: 0, capacity: 500 })
  gs.baseId = baseId

  // Workers iniciales jugador — idle (uno cerca de cada source)
  const playerSpawns = [{ x: 4, y: 11 }, { x: 4, y: 10 }, { x: 4, y: 12 }]
  for (const pos of playerSpawns) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, pos)
    gs.healths.set(w, { current: 100, max: 100 })
    gs.workers.set(w, { isWorker: true })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
  }

  // Base IA
  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 36, y: 11 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 500 })
  gs.aiBaseId = aiBaseId

  // Workers iniciales IA — idle (AISystem los activa en gs.tick === startDelay)
  const aiSpawns = [{ x: 35, y: 11 }, { x: 35, y: 10 }, { x: 35, y: 12 }]
  for (const pos of aiSpawns) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, pos)
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
    gs.aiWorkers.add(w)
  }
  addOrganicTerrain(gs, 2)
}

// ─── M3: Sector 7-Gamma · Nodo Delta — El Corredor Dividido ─────────────
//
//  Dos cámaras altas por lado (norte + sur), abiertas hacia la base.
//  Sin w.memory: todos los workers van a la misma cámara → colapso.
//  Con w.memory: cada worker reclama su cámara → operación autónoma.
//
//  Sources jugador: Norte(8,5) · Sur(8,17)   ← base(3,11)
//  Sources IA:      Norte(31,5) · Sur(31,17)  → base(36,11)
//
//  Fortaleza central con chokepoint: solo y=11 libre en x=18-21.
//  Corredor norte (y≤7) y sur (y≥15) son los únicos pasos amplios.
//
function buildWallsM3(gs: GameState): void {
  const W = TileType.Wall
  const row = (y: number, x1: number, x2: number) => {
    for (let x = x1; x <= x2; x++) gs.worldMap.setTile(x, y, W)
  }
  const col = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) gs.worldMap.setTile(x, y, W)
  }

  // ── CÁMARA NORTE JUGADOR — source(8,5) ─────────────────────────────────
  // Sala: x=7-12, y=3-7. Abierta al oeste (toda la cara izquierda libre).
  row(3, 7, 12); row(7, 7, 12); col(12, 3, 7)

  // ── CÁMARA SUR JUGADOR — source(8,17) ──────────────────────────────────
  row(15, 7, 12); row(19, 7, 12); col(12, 15, 19)

  // ── CÁMARA NORTE IA — source(31,5) — espejo ────────────────────────────
  // Abierta al este (hacia la base IA en x=36).
  row(3, 27, 32); row(7, 27, 32); col(27, 3, 7)

  // ── CÁMARA SUR IA — source(31,17) — espejo ─────────────────────────────
  row(15, 27, 32); row(19, 27, 32); col(27, 15, 19)

  // ── NODO DELTA — Fortaleza central NEXUS ───────────────────────────────
  // Cuatro pilares densos + garganta con chokepoint único en y=11.
  col(18, 2, 8);   col(21, 2, 8)        // pilares norte (y=2..8)
  col(18, 14, 19); col(21, 14, 19)      // pilares sur   (y=14..19)
  row(9,  18, 21)                       // viga techo de la garganta
  row(13, 18, 21)                       // viga suelo de la garganta
  row(10, 18, 21); row(12, 18, 21)      // cierres internos — solo y=11 libre
}

function buildWorldM3(gs: GameState): void {
  buildWallsM3(gs)
  gs.maxPlayerWorkers = 4
  gs.aiMaxWorkers     = 6   // M3: 2 sources (más difícil que M2 en mecánica, no en workers)

  const addSource = (x: number, y: number, isPlayer: boolean) => {
    const id: EntityId = gs.createEntity()
    gs.entities.add(id)
    gs.positions.set(id, { x, y })
    gs.sources.set(id, { energy: 100, maxEnergy: 100, regenRate: 3, regenCooldown: 20, currentCooldown: 0 })
    if (isPlayer) gs.playerSourceIds.add(id)
  }
  addSource(8,  5,  true)
  addSource(8,  17, true)
  addSource(31, 5,  false)
  addSource(31, 17, false)

  // Base jugador
  const baseId: EntityId = gs.createEntity()
  gs.entities.add(baseId)
  gs.positions.set(baseId, { x: 3, y: 11 })
  gs.energyStorages.set(baseId, { current: 0, capacity: 500 })
  gs.baseId = baseId

  // 2 workers iniciales jugador — idle
  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 4 + i, y: 11 })
    gs.healths.set(w, { current: 100, max: 100 })
    gs.workers.set(w, { isWorker: true })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
  }

  // Base IA
  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 36, y: 11 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 500 })
  gs.aiBaseId = aiBaseId

  // Workers iniciales IA
  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 35 - i, y: 11 })
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
    gs.aiWorkers.add(w)
  }
  addOrganicTerrain(gs, 3)
}

// ═══════════════════════════════════════════════════════════
//  buildRoom — helper universal de cuartos con exits
// ═══════════════════════════════════════════════════════════
//
//  Dibuja las 4 paredes de un rectángulo (x1,y1)→(x2,y2)
//  cortando gaps ("exits") en los lados indicados.
//
//  Parámetros de cada exit:
//    dir  — 'N' | 'S' | 'E' | 'W'  (lado donde va el gap)
//    at   — posición del centro del gap en el eje paralelo al lado
//             · N/S: at = coordenada x central del gap
//             · E/W: at = coordenada y central del gap
//    size — ancho del gap en tiles (default 2)
//
//  Ejemplo: buildRoom(gs, 6,8, 12,14, [{dir:'W', at:11}, {dir:'N', at:9}])
//  → cuarto cerrado con una entrada oeste centrada en y=11 y un exit norte en x=9
//
function buildRoom(
  gs: GameState,
  x1: number, y1: number, x2: number, y2: number,
  exits: Array<{ dir: 'N' | 'S' | 'E' | 'W'; at: number; size?: number }> = []
): void {
  const set = (x: number, y: number) => gs.worldMap.setTile(x, y, TileType.Wall)

  // ¿cae 'c' dentro del gap del exit 'e'?
  const inGap = (e: { dir: string; at: number; size?: number }, c: number): boolean => {
    const sz = e.size ?? 2
    const s  = e.at - Math.floor(sz / 2)
    return c >= s && c < s + sz
  }

  const open = (dir: 'N' | 'S' | 'E' | 'W', c: number): boolean =>
    exits.some(e => e.dir === dir && inGap(e, c))

  // N/S controlan las esquinas — W/E sólo cubren el interior vertical
  for (let x = x1; x <= x2; x++) {
    if (!open('N', x)) set(x, y1)   // pared norte (incluye esquinas)
    if (!open('S', x)) set(x, y2)   // pared sur   (incluye esquinas)
  }
  for (let y = y1 + 1; y <= y2 - 1; y++) {  // skip y1/y2 — ya los cubren N/S
    if (!open('W', y)) set(x1, y)   // pared oeste
    if (!open('E', y)) set(x2, y)   // pared este
  }
}

// ─── M4: Sector 9-Epsilon · Nodo de Coordinación — Game.memory ──────────────
//
//  Sala junction conecta la base con 2 cámaras (norte y sur).
//  Sin Game.memory: workers colisionan en la misma cámara cada tick.
//  Con Game.memory: cada worker recuerda su asignación → flujo paralelo.
//
//  Layout jugador: base(3,11) → junction(6-12,8-14) → Norte(8-14,3-8) / Sur(8-14,14-19)
//  Layout IA:      base(36,11) → junction(27-33,8-14) → Norte/Sur espejo
//  Sources jugador: Norte(11,5) · Sur(11,17)
//  Sources IA:      Norte(28,5) · Sur(28,17)
//  Nodo Memoria central — 4 pilares dobles, corredor y=9-13 libre
//
function buildWallsM4(gs: GameState): void {
  // ── JUGADOR — Junction + 2 cámaras ───────────────────────────────────────
  buildRoom(gs, 6, 8, 12, 14, [
    { dir: 'W', at: 11 },  // entrada oeste — gap y=10-11 at x=6 (desde base)
    { dir: 'N', at:  9 },  // exit norte    — gap x=8-9  at y=8 (→ cámara norte)
    { dir: 'S', at:  9 },  // exit sur      — gap x=8-9  at y=14 (→ cámara sur)
  ])
  buildRoom(gs,  8, 3,  14,  8, [{ dir: 'S', at: 9 }])   // Cámara norte — source(11,5)
  buildRoom(gs,  8, 14, 14, 19, [{ dir: 'N', at: 9 }])   // Cámara sur  — source(11,17)

  // ── IA — Junction + 2 cámaras (espejo) ───────────────────────────────────
  buildRoom(gs, 27, 8, 33, 14, [
    { dir: 'E', at: 11 },  // entrada este — gap y=10-11 at x=33 (desde base IA)
    { dir: 'N', at: 30 },  // exit norte   — gap x=29-30 at y=8
    { dir: 'S', at: 30 },  // exit sur     — gap x=29-30 at y=14
  ])
  buildRoom(gs, 25, 3,  31,  8, [{ dir: 'S', at: 30 }])  // Cámara norte IA — source(28,5)
  buildRoom(gs, 25, 14, 31, 19, [{ dir: 'N', at: 30 }])  // Cámara sur  IA — source(28,17)

  // ── NODO MEMORIA — 4 pilares dobles, corredor y=9-13 libre ───────────────
  const row = (y: number, x1: number, x2: number) => {
    for (let x = x1; x <= x2; x++) gs.worldMap.setTile(x, y, TileType.Wall)
  }
  const col = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) gs.worldMap.setTile(x, y, TileType.Wall)
  }
  row(4,  15, 24)                         // viga norte
  col(15, 4, 8);   col(16, 4, 8)          // pilar norte-izquierdo (2 tiles ancho)
  col(23, 4, 8);   col(24, 4, 8)          // pilar norte-derecho
  col(15, 14, 18); col(16, 14, 18)        // pilar sur-izquierdo
  col(23, 14, 18); col(24, 14, 18)        // pilar sur-derecho
  row(18, 15, 24)                         // viga sur
}

function buildWorldM4(gs: GameState): void {
  buildWallsM4(gs)
  gs.maxPlayerWorkers = 4
  gs.aiMaxWorkers     = 6   // M4: 2 sources

  const addSource = (x: number, y: number, isPlayer: boolean) => {
    const id: EntityId = gs.createEntity()
    gs.entities.add(id)
    gs.positions.set(id, { x, y })
    gs.sources.set(id, { energy: 100, maxEnergy: 100, regenRate: 3, regenCooldown: 20, currentCooldown: 0 })
    if (isPlayer) gs.playerSourceIds.add(id)
  }
  addSource(11,  5, true);  addSource(11, 17, true)
  addSource(28,  5, false); addSource(28, 17, false)

  const baseId: EntityId = gs.createEntity()
  gs.entities.add(baseId)
  gs.positions.set(baseId, { x: 3, y: 11 })
  gs.energyStorages.set(baseId, { current: 0, capacity: 500 })
  gs.baseId = baseId

  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 4 + i, y: 11 })
    gs.healths.set(w, { current: 100, max: 100 })
    gs.workers.set(w, { isWorker: true })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
  }

  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 36, y: 11 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 500 })
  gs.aiBaseId = aiBaseId

  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 35 - i, y: 11 })
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
    gs.aiWorkers.add(w)
  }
  addOrganicTerrain(gs, 4)
}

// ─── M5: Sector 10-Zeta · Nodo Central — ratio de base ──────────────────────
//
//  Una sola cámara profunda por lado. Fuentes casi en el centro del mapa.
//  La IA juega al máximo — el ratio base.energy/capacity determina cuándo empujar.
//  El map es simétrico y abierto: la presión viene del timing, no del layout.
//
//  Source jugador: (15,11) ← cámara(12-18,8-14) ← base(3,11)
//  Source IA:      (24,11) → cámara(21-27,8-14) → base(36,11)
//  Vigías NEXUS al norte y sur del corredor central (pilares en x=19-20)
//
function buildWallsM5(gs: GameState): void {
  // ── CÁMARA JUGADOR — source(15,11) — entrada oeste ───────────────────────
  buildRoom(gs, 12, 8, 18, 14, [{ dir: 'W', at: 11 }])

  // ── CÁMARA IA — source(24,11) — entrada este ─────────────────────────────
  buildRoom(gs, 21, 8, 27, 14, [{ dir: 'E', at: 11 }])

  // ── VIGÍAS NEXUS — flanquean el gap central entre cámaras (x=19-20) ──────
  const col = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) gs.worldMap.setTile(x, y, TileType.Wall)
  }
  col(19, 2,  7);  col(20, 2,  7)   // vigías norte
  col(19, 15, 19); col(20, 15, 19)  // vigías sur
}

function buildWorldM5(gs: GameState): void {
  buildWallsM5(gs)
  gs.maxPlayerWorkers = 5
  gs.aiMaxWorkers     = 4   // M5: 1 source rico — boss de ritmo, no de cantidad

  const addSource = (x: number, y: number, isPlayer: boolean) => {
    const id: EntityId = gs.createEntity()
    gs.entities.add(id)
    gs.positions.set(id, { x, y })
    // Fuente más rica — el ratio de llenado importa más que la distancia
    gs.sources.set(id, { energy: 200, maxEnergy: 200, regenRate: 5, regenCooldown: 15, currentCooldown: 0 })
    if (isPlayer) gs.playerSourceIds.add(id)
  }
  addSource(15, 11, true)
  addSource(24, 11, false)

  const baseId: EntityId = gs.createEntity()
  gs.entities.add(baseId)
  gs.positions.set(baseId, { x: 3, y: 11 })
  gs.energyStorages.set(baseId, { current: 0, capacity: 500 })
  gs.baseId = baseId

  for (let i = 0; i < 3; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 4 + i, y: 11 })
    gs.healths.set(w, { current: 100, max: 100 })
    gs.workers.set(w, { isWorker: true })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
  }

  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 36, y: 11 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 500 })
  gs.aiBaseId = aiBaseId

  for (let i = 0; i < 3; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 35 - i, y: 11 })
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
    gs.aiWorkers.add(w)
  }
  addOrganicTerrain(gs, 5)
}

// ─── M6: Nodo Omega-1 · Núcleo del Sector — boss final Season I ─────────────
//
//  Red de 3 cámaras conectadas por un hub. Boss final de NEXUS.
//  Hub → Cámara Norte + Cámara Sur + Cámara Omega (más profunda, más valiosa).
//  El Omega Gate en el centro separa ambos lados — solo bypass norte y sur.
//
//  Network jugador (base 3,11):
//    hub(6-11,9-13) → Norte(6-10,3-9) · Sur(6-10,13-19) · Omega(11-16,9-13)
//  Network IA (base 36,11):
//    hub(28-33,9-13) → Norte(29-33,3-9) · Sur(29-33,13-19) · Omega(23-28,9-13)
//  Sources jugador: Norte(8,6) · Sur(8,16) · Omega(13,11)
//  Sources IA:      Norte(31,6) · Sur(31,16) · Omega(26,11)
//
function buildWallsM6(gs: GameState): void {
  // ── JUGADOR — Hub central + 3 cámaras ────────────────────────────────────
  buildRoom(gs, 6, 9, 11, 13, [
    { dir: 'W', at: 11 },  // entrada base     — gap y=10-11 at x=6
    { dir: 'N', at:  8 },  // exit norte        — gap x=7-8  at y=9
    { dir: 'S', at:  8 },  // exit sur          — gap x=7-8  at y=13
    { dir: 'E', at: 11 },  // exit omega        — gap y=10-11 at x=11
  ])
  buildRoom(gs, 6, 3,  10,  9, [{ dir: 'S', at: 8  }])  // Cámara Norte  — source(8,6)
  buildRoom(gs, 6, 13, 10, 19, [{ dir: 'N', at: 8  }])  // Cámara Sur   — source(8,16)
  buildRoom(gs, 11, 9, 16, 13, [{ dir: 'W', at: 11 }])  // Cámara Omega — source(13,11)

  // ── IA — Hub central + 3 cámaras (espejo) ────────────────────────────────
  buildRoom(gs, 28, 9, 33, 13, [
    { dir: 'E', at: 11 },
    { dir: 'N', at: 31 },
    { dir: 'S', at: 31 },
    { dir: 'W', at: 11 },
  ])
  buildRoom(gs, 29, 3,  33,  9, [{ dir: 'S', at: 31 }])  // Norte IA — source(31,6)
  buildRoom(gs, 29, 13, 33, 19, [{ dir: 'N', at: 31 }])  // Sur   IA — source(31,16)
  buildRoom(gs, 23, 9,  28, 13, [{ dir: 'E', at: 11 }])  // Omega IA — source(26,11)

  // ── OMEGA GATE — portón NEXUS que separa los dos lados ───────────────────
  // Sólo bypasses norte (y<8) y sur (y>14) — workers no pueden cruzar el centro.
  const row = (y: number, x1: number, x2: number) => {
    for (let x = x1; x <= x2; x++) gs.worldMap.setTile(x, y, TileType.Wall)
  }
  const col = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) gs.worldMap.setTile(x, y, TileType.Wall)
  }
  row(8,  17, 22); row(14, 17, 22)     // vigas horizontales del gate
  col(17, 8,  14); col(22, 8,  14)     // pilares del gate
  col(19, 2,  7);  col(20, 2,  7)      // antenas norte
  col(19, 15, 19); col(20, 15, 19)     // antenas sur
}

function buildWorldM6(gs: GameState): void {
  buildWallsM6(gs)
  gs.maxPlayerWorkers = 6
  gs.aiMaxWorkers     = 9   // M6 boss: 3 sources × 3 workers — el reto final de Season I

  const addSource = (x: number, y: number, isPlayer: boolean, energy = 100) => {
    const id: EntityId = gs.createEntity()
    gs.entities.add(id)
    gs.positions.set(id, { x, y })
    gs.sources.set(id, { energy, maxEnergy: energy, regenRate: 3, regenCooldown: 20, currentCooldown: 0 })
    if (isPlayer) gs.playerSourceIds.add(id)
  }
  // Fuentes jugador: norte y sur normales, omega más rica
  addSource( 8,  6, true);  addSource( 8, 16, true);  addSource(13, 11, true,  150)
  // Fuentes IA: espejo
  addSource(31,  6, false); addSource(31, 16, false); addSource(26, 11, false, 150)

  const baseId: EntityId = gs.createEntity()
  gs.entities.add(baseId)
  gs.positions.set(baseId, { x: 3, y: 11 })
  gs.energyStorages.set(baseId, { current: 0, capacity: 500 })
  gs.baseId = baseId

  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 4 + i, y: 11 })
    gs.healths.set(w, { current: 100, max: 100 })
    gs.workers.set(w, { isWorker: true })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
  }

  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 36, y: 11 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 500 })
  gs.aiBaseId = aiBaseId

  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 35 - i, y: 11 })
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: gs.workerCapacity })
    gs.behaviors.set(w, { state: "idle" })
    gs.aiWorkers.add(w)
  }
  addOrganicTerrain(gs, 6)
}

// ═══════════════════════════════════════════════════════════
//  addOrganicTerrain — terreno Screeps-style (autómata celular)
// ═══════════════════════════════════════════════════════════
//
//  Se llama AL FINAL de cada buildWorldM* (después de colocar
//  paredes estructurales y entidades) para añadir montañas
//  orgánicas que enriquecen visualmente el mapa sin romper
//  el layout diseñado.
//
//  Algoritmo:
//   1. LCG determinista — seed = missionId (mismo mapa siempre)
//   2. Snapshot de paredes estructurales — nunca se remueven
//   3. Zonas protegidas — radio alrededor de bases y sources
//   4. Ruido inicial con gradiente de densidad (bordes ≫ centro)
//   5. Autómata celular — 3 generaciones, regla nacimiento ≥5
//   6. Reaplicar paredes estructurales (el autómata no las toca)
//   7. Reconexión BFS — si un punto crítico queda aislado,
//      se abre un corredor mínimo hacia el área alcanzable
//
function addOrganicTerrain(gs: GameState, seed: number): void {
  const W = gs.worldMap.width
  const H = gs.worldMap.height

  // ── 1. LCG RNG determinista ─────────────────────────────
  let s = (seed * 1664525 + 1013904223) | 0
  const rand = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 0xFFFFFFFF
  }

  // ── 2. Snapshot de paredes estructurales ────────────────
  const structural = new Set<string>()
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (gs.worldMap.getTile(x, y) === TileType.Wall) {
        structural.add(`${x},${y}`)
      }
    }
  }

  // ── 3. Zonas protegidas (cuadrado de radio r) ───────────
  const protected_ = new Set<string>()
  const protect = (cx: number, cy: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        protected_.add(`${cx + dx},${cy + dy}`)
      }
    }
  }
  // Bases — radio 3
  if (gs.baseId) {
    const p = gs.positions.get(gs.baseId)
    if (p) protect(p.x, p.y, 3)
  }
  if (gs.aiBaseId) {
    const p = gs.positions.get(gs.aiBaseId)
    if (p) protect(p.x, p.y, 3)
  }
  // Sources — radio 4 (cubre interior de la cámara)
  for (const [id] of gs.sources) {
    const p = gs.positions.get(id)
    if (p) protect(p.x, p.y, 4)
  }
  // Workers iniciales — radio 2
  for (const [id] of gs.workers) {
    const p = gs.positions.get(id)
    if (p) protect(p.x, p.y, 2)
  }
  for (const id of gs.aiWorkers) {
    const p = gs.positions.get(id)
    if (p) protect(p.x, p.y, 2)
  }

  // ── 4. Ruido inicial con gradiente de densidad ──────────
  //  edgeDist = distancia al borde interior más cercano
  //  Densidad alta cerca de los bordes, baja en el centro
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (structural.has(`${x},${y}`)) continue   // muro estructural intocable
      if (protected_.has(`${x},${y}`)) continue   // zona protegida

      const edgeDist = Math.min(x - 1, W - 2 - x, y - 1, H - 2 - y)
      const density = edgeDist <= 1 ? 0.55
                    : edgeDist <= 3 ? 0.38
                    : edgeDist <= 5 ? 0.22
                    : 0.12

      if (rand() < density) {
        gs.worldMap.setTile(x, y, TileType.Wall)
      }
    }
  }

  // ── 5. Autómata celular — 3 generaciones ───────────────
  const countWalls = (x: number, y: number): number => {
    let n = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) { n++; continue }
        if (gs.worldMap.getTile(nx, ny) === TileType.Wall) n++
      }
    }
    return n
  }

  for (let gen = 0; gen < 3; gen++) {
    // Snapshot del estado actual antes de esta generación
    const snap: boolean[][] = Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) => gs.worldMap.getTile(x, y) === TileType.Wall)
    )
    const isWall = (x: number, y: number): boolean =>
      x < 0 || y < 0 || x >= W || y >= H ? true : (snap[y]?.[x] ?? true)
    const wallCount = (x: number, y: number): number => {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          if (isWall(x + dx, y + dy)) n++
        }
      }
      return n
    }

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (structural.has(`${x},${y}`)) continue  // paredes estructurales inmutables
        const inProtected = protected_.has(`${x},${y}`)
        if (inProtected) {
          gs.worldMap.setTile(x, y, TileType.Floor)  // zona protegida → siempre suelo
          continue
        }
        const walls = wallCount(x, y)
        if (walls >= 5)      gs.worldMap.setTile(x, y, TileType.Wall)
        else if (walls <= 3) gs.worldMap.setTile(x, y, TileType.Floor)
        // 4 vecinos = estado estable (no cambia)
      }
    }
  }

  // ── 6. Reaplicar paredes estructurales ─────────────────
  for (const key of structural) {
    const [xs, ys] = key.split(',').map(Number)
    if (xs !== undefined && ys !== undefined) {
      gs.worldMap.setTile(xs, ys, TileType.Wall)
    }
  }

  // ── 7. Reconexión BFS ───────────────────────────────────
  //  Flood-fill desde la base del jugador.
  //  Si un punto crítico (source, base IA) no es alcanzable,
  //  se BFS a través del mapa (incluyendo muros no-estructurales)
  //  para encontrar el camino más corto al área alcanzable y
  //  se abren esos tiles.
  const basePos = gs.baseId ? gs.positions.get(gs.baseId) : null
  if (!basePos) return

  const flood = (): Set<string> => {
    const reachable = new Set<string>()
    const q: Array<{ x: number; y: number }> = [basePos]
    reachable.add(`${basePos.x},${basePos.y}`)
    while (q.length > 0) {
      const cur = q.shift()!
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const nx = cur.x + dx, ny = cur.y + dy
        const key = `${nx},${ny}`
        if (reachable.has(key)) continue
        if (!gs.worldMap.isWalkable(nx, ny)) continue
        reachable.add(key)
        q.push({ x: nx, y: ny })
      }
    }
    return reachable
  }

  const reachable = flood()

  // Puntos críticos que deben ser alcanzables
  const critical: Array<{ x: number; y: number }> = []
  if (gs.aiBaseId) {
    const p = gs.positions.get(gs.aiBaseId)
    if (p) critical.push(p)
  }
  for (const [id] of gs.sources) {
    const p = gs.positions.get(id)
    if (p) critical.push(p)
  }

  for (const target of critical) {
    if (reachable.has(`${target.x},${target.y}`)) continue

    // BFS de target → buscar el tile alcanzable más cercano,
    // atravesando muros (para poder carvar el corredor mínimo).
    // Usamos mapa de padres para reconstruir el camino.
    const parent = new Map<string, string | null>()
    const startKey = `${target.x},${target.y}`
    parent.set(startKey, null)
    const q2: Array<{ x: number; y: number }> = [target]
    let found: string | null = null

    outer: while (q2.length > 0) {
      const cur = q2.shift()!
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const nx = cur.x + dx, ny = cur.y + dy
        if (nx <= 0 || ny <= 0 || nx >= W - 1 || ny >= H - 1) continue
        const key = `${nx},${ny}`
        if (parent.has(key)) continue
        parent.set(key, `${cur.x},${cur.y}`)
        if (reachable.has(key)) { found = key; break outer }
        q2.push({ x: nx, y: ny })
      }
    }

    if (!found) continue

    // Reconstruir el camino desde found → target, limpiar muros no-estructurales
    let cur = parent.get(found)
    while (cur !== null && cur !== undefined) {
      const [cx, cy] = cur.split(',').map(Number)
      if (cx !== undefined && cy !== undefined && !structural.has(cur)) {
        gs.worldMap.setTile(cx, cy, TileType.Floor)
        reachable.add(cur)
      }
      cur = parent.get(cur) ?? null
    }
  }
}

// ─── Dispatcher ───────────────────────────────────────────
function buildWorld(gs: GameState, missionId: number = 1): void {
  if      (missionId === 2) buildWorldM2(gs)
  else if (missionId === 3) buildWorldM3(gs)
  else if (missionId === 4) buildWorldM4(gs)
  else if (missionId === 5) buildWorldM5(gs)
  else if (missionId === 6) buildWorldM6(gs)
  else                      buildWorldM1(gs)
}

// ─── SCRIPT POR DEFECTO DEL JUGADOR ──────────────────────
// Se carga automáticamente en VS IA cuando el jugador no ha escrito nada.
// Lógica básica: harvest + depositar + spawn de workers hasta 8.
const DEFAULT_PLAYER_SCRIPT = `
// Script automático — harvesting y depósito básico
const workers = Object.values(Game.workers)
const sources = Object.values(Game.sources)
const claimed = new Set()

for (const w of workers) {
  if (w.store.isFull()) {
    // Store lleno — llevar energía a la base
    w.transfer(Game.base.id)
  } else if (w.state !== 'harvesting') {
    // No está cosechando — buscar la fuente más cercana no reclamada
    let best = null, bestDist = Infinity
    for (const s of sources) {
      if (claimed.has(s.id)) continue
      const d = Math.abs(s.x - w.x) + Math.abs(s.y - w.y)
      if (d < bestDist) { bestDist = d; best = s }
    }
    if (best) { claimed.add(best.id); w.harvest(best.id) }
  }
}
`.trim()

// ─── MUNDO ───────────────────────────────────────────────
let gameState = new GameState(40, 22)
buildWorld(gameState)

let engine: GameEngine

// ─── SERVIDOR ────────────────────────────────────────────
const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.use(express.static(path.join(__dirname, "../public")))
app.use(express.json())

// ─── ENDPOINT DE DIAGNÓSTICO ──────────────────────────────
app.get("/debug", (_req, res) => {
  res.json(buildDiagnostic(gameState))
})

// ─── SCRIPT DEL JUGADOR ───────────────────────────────────
app.post("/api/script", (req, res) => {
  const { code } = req.body as { code?: string }
  if (typeof code !== "string") {
    res.status(400).json({ error: "Se esperaba { code: string }" })
    return
  }
  gameState.playerScript = code || null
  gameState.scriptError  = null
  console.log(`📝 Script del jugador actualizado (${code.length} chars)`)
  res.json({ ok: true })
})

// ─── SERIALIZAR ESTADO PARA EL BROWSER ───────────────────
function buildSnapshot(gs: GameState) {
  const tiles: string[][] = []
  for (let y = 0; y < gs.worldMap.height; y++) {
    const row: string[] = []
    for (let x = 0; x < gs.worldMap.width; x++) {
      row.push(gs.worldMap.getTile(x, y) ?? ".")
    }
    tiles.push(row)
  }

  const entities: Record<string, unknown>[] = []

  for (const id of gs.entities) {
    const pos = gs.positions.get(id)
    if (!pos) continue

    let type = "unknown"
    if (id === gs.baseId)       type = "base"
    else if (id === gs.aiBaseId) type = "ai-base"
    else if (gs.aiWorkers.has(id)) type = "ai-worker"
    else if (gs.workers.has(id)) type = "worker"
    else if (gs.sources.has(id)) type = "source"
    else if (gs.structures.has(id)) {
      const s = gs.structures.get(id)!
      type = s.type === "ai-extension" ? "ai-extension" : "extension"
    }

    const entry: Record<string, unknown> = { id, x: pos.x, y: pos.y, type }

    const health = gs.healths.get(id)
    if (health) entry.health = health

    const storage = gs.energyStorages.get(id)
    if (storage) entry.energy = storage

    // Target position para dibujar rutas en el renderer
    const target = gs.targets.get(id)
    if (target) { entry.targetX = target.targetX; entry.targetY = target.targetY }

    const behavior = gs.behaviors.get(id)
    if (behavior) entry.state = behavior.state

    const source = gs.sources.get(id)
    if (source) entry.source = { energy: source.energy, max: source.maxEnergy }

    // say() — burbuja de texto del worker
    const say = gs.workerSays.get(id)
    if (say && say.until > gs.tick) entry.say = say.msg

    entities.push(entry)
  }

  const baseStorage   = gs.baseId   ? gs.energyStorages.get(gs.baseId)   : null
  const aiBaseStorage = gs.aiBaseId ? gs.energyStorages.get(gs.aiBaseId) : null

  return {
    tick: gs.tick,
    mapWidth: gs.worldMap.width,
    mapHeight: gs.worldMap.height,
    tiles,
    entities,
    base: baseStorage
      ? { energy: baseStorage.current, capacity: baseStorage.capacity }
      : null,
    aiBase: aiBaseStorage
      ? { energy: aiBaseStorage.current, capacity: aiBaseStorage.capacity }
      : null,
    workerCount:   gs.workers.size,
    aiWorkerCount: gs.aiWorkers.size,
    extensions:    [...gs.structures.values()].filter(s => s.type === "extension").length,
    aiExtensions:  [...gs.structures.values()].filter(s => s.type === "ai-extension").length,
    scriptError:   gs.scriptError ?? null,
    winner:        gs.winner,
    winTick:       gs.winTick,
    gameMode:      gs.gameMode
  }
}

// ─── DIAGNÓSTICO DETALLADO ────────────────────────────────
function buildDiagnostic(gs: GameState) {
  const workers = [...gs.workers.keys()].map(id => {
    const pos      = gs.positions.get(id)
    const behavior = gs.behaviors.get(id)
    const storage  = gs.energyStorages.get(id)
    const hasTarget = gs.targets.has(id)
    const hasPath   = gs.paths.has(id)
    return {
      id,
      pos:     pos ? `(${pos.x},${pos.y})` : "?",
      state:   behavior?.state ?? "?",
      energy:  storage ? `${storage.current}/${storage.capacity}` : "?",
      hasTarget,
      hasPath,
      pathLen: gs.paths.get(id)?.steps.length ?? 0
    }
  })

  const sources = [...gs.sources.entries()].map(([id, src]) => {
    const pos = gs.positions.get(id)
    return {
      id,
      pos:      pos ? `(${pos.x},${pos.y})` : "?",
      energy:   `${src.energy}/${src.maxEnergy}`,
      cooldown: src.currentCooldown,
      targeted: [...gs.targets.values()].some(t => t.targetX === pos?.x && t.targetY === pos?.y)
    }
  })

  const baseStorage   = gs.baseId   ? gs.energyStorages.get(gs.baseId)   : null
  const aiBaseStorage = gs.aiBaseId ? gs.energyStorages.get(gs.aiBaseId) : null
  const harvesting    = workers.filter(w => w.state === "harvesting").length
  const returning     = workers.filter(w => w.state === "returning").length
  const idle          = workers.filter(w => !w.hasTarget).length

  const aiWorkers = [...gs.aiWorkers].map(id => {
    const pos      = gs.positions.get(id)
    const behavior = gs.behaviors.get(id)
    const storage  = gs.energyStorages.get(id)
    return {
      id,
      pos:    pos ? `(${pos.x},${pos.y})` : "?",
      state:  behavior?.state ?? "?",
      energy: storage ? `${storage.current}/${storage.capacity}` : "?"
    }
  })

  return {
    tick:       gs.tick,
    base:       baseStorage   ? `${baseStorage.current}/${baseStorage.capacity}`   : "?",
    aiBase:     aiBaseStorage ? `${aiBaseStorage.current}/${aiBaseStorage.capacity}` : "?",
    workers:    { total: workers.length, harvesting, returning, idle, detail: workers },
    aiWorkers:  { total: aiWorkers.length, detail: aiWorkers },
    sources:    { total: sources.length, active: sources.filter(s => s.energy !== "0/10").length, detail: sources },
    extensions: [...gs.structures.values()].filter(s => s.type === "extension").length,
    aiExtensions: [...gs.structures.values()].filter(s => s.type === "ai-extension").length
  }
}

// ─── BROADCAST A TODOS LOS CLIENTES ──────────────────────
function broadcast(data: unknown) {
  const msg = JSON.stringify(data)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}

// ─── RESET DEL JUEGO ──────────────────────────────────────
const VALID_DIFFICULTIES: AiDifficulty[] = ["tutorial", "easy", "medium", "hard", "expert"]
type GameMode = "vs-ia" | "sandbox" | "campaign"

function resetGame(
  playerScript?: string | null,
  difficulty: AiDifficulty = "medium",
  mode: GameMode = "vs-ia",
  missionId: number = 1
): void {
  if (engine) engine.stop()
  gameState = new GameState(40, 22)
  gameState.gameMode = mode
  buildWorld(gameState, missionId)

  // En sandbox no hay IA: remover base y workers de la IA
  if (mode === "sandbox") {
    if (gameState.aiBaseId !== null) {
      gameState.entities.delete(gameState.aiBaseId)
      gameState.positions.delete(gameState.aiBaseId)
      gameState.energyStorages.delete(gameState.aiBaseId)
      gameState.aiBaseId = null
    }
    for (const id of gameState.aiWorkers) {
      gameState.entities.delete(id)
      gameState.positions.delete(id)
      gameState.energyStorages.delete(id)
      gameState.behaviors.delete(id)
    }
    gameState.aiWorkers.clear()
  }

  // Cargar script: el provisto, o el por defecto en vs-ia/sandbox
  if (playerScript) {
    gameState.playerScript = playerScript
  } else if (mode !== "campaign") {
    gameState.playerScript = DEFAULT_PLAYER_SCRIPT
  }

  engine = new GameEngine(gameState, 300, () => broadcast(buildSnapshot(gameState)), difficulty)
  engine.start()
  broadcast(buildSnapshot(gameState))
  console.log(`🔄 Juego reiniciado — modo: ${mode} | dificultad IA: ${difficulty}`)
}

// ─── VELOCIDAD DE SIMULACIÓN ──────────────────────────────
app.post("/api/speed", (req, res) => {
  const { multiplier } = req.body as { multiplier?: number }
  const m = typeof multiplier === "number" && [1, 2, 3].includes(multiplier) ? multiplier : 1
  engine.setSpeed(m)
  res.json({ ok: true, multiplier: m })
})

app.post("/api/reset", (req, res) => {
  const { difficulty, mode, missionId } = req.body as { difficulty?: string; mode?: string; missionId?: number }
  const d: AiDifficulty = VALID_DIFFICULTIES.includes(difficulty as AiDifficulty)
    ? (difficulty as AiDifficulty)
    : "medium"
  const m: GameMode = (mode === "sandbox" || mode === "campaign") ? mode : "vs-ia"
  const mid: number = typeof missionId === "number" ? missionId : 1
  resetGame(gameState.playerScript, d, m, mid)
  res.json({ ok: true })
})

// ─── ENGINE CON BROADCAST EN CADA TICK ───────────────────
// Cargar script por defecto al arrancar (modo vs-ia inicial)
gameState.playerScript = DEFAULT_PLAYER_SCRIPT
engine = new GameEngine(gameState, 300, () => {
  broadcast(buildSnapshot(gameState))
}, "medium")

wss.on("connection", (ws) => {
  console.log("🖥  Cliente conectado")
  ws.send(JSON.stringify(buildSnapshot(gameState)))

  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString())
    if (data.action === "pause") engine.pause()
    if (data.action === "resume") engine.resume()
  })
})

server.listen(3000, () => {
  console.log("🚀 CODESTRIKE corriendo en http://localhost:3000")
  // Guardar PID para poder matar el servidor con `npm run stop`
  require("fs").writeFileSync(".server.pid", String(process.pid))
  engine.start()
})
