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

// ─── M1: Una sala, 1 source por lado ──────────────────────
//
//  BASE JUGADOR (3,11) ── SOURCE (8,11)    SOURCE (31,11) ── BASE IA (36,11)
//  Compounds tipo C a cada lado. Corredor central y=9-13.
//
function buildWallsM1(gs: GameState): void {
  const W = TileType.Wall
  const row = (y: number, x1: number, x2: number) => {
    for (let x = x1; x <= x2; x++) gs.worldMap.setTile(x, y, W)
  }
  const col = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) gs.worldMap.setTile(x, y, W)
  }
  // Compound jugador — source(8,11) — entrada oeste y=9-13
  row(8,  6, 12);  row(14, 6, 12);  col(12, 8, 14)
  // Compound IA — source(31,11) — entrada este y=9-13
  row(8,  27, 33); row(14, 27, 33); col(27, 8, 14)
}

function buildWorldM1(gs: GameState): void {
  buildWallsM1(gs)
  gs.maxPlayerWorkers = 3

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
    gs.energyStorages.set(w, { current: 0, capacity: 10 })
    gs.behaviors.set(w, { state: "idle" })
  }

  // Base IA
  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 36, y: 11 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 500 })
  gs.aiBaseId = aiBaseId

  // Workers iniciales IA — harvesting
  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 35 - i, y: 11 })
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: 10 })
    gs.behaviors.set(w, { state: "harvesting" })
    gs.aiWorkers.add(w)
  }
}

// ─── M2: Una sala, 2 sources por lado + montaña central ───
//
//  Sources en S1=(8,6) y S2=(8,16) jugador | S1=(31,6) y S2=(31,16) IA
//  Montaña central en diamante — 3 corredores: norte, centro(y=11), sur
//  Mecánica nueva: gestionar múltiples sources (findNearest)
//
function buildWallsM2(gs: GameState): void {
  const W = TileType.Wall
  const row = (y: number, x1: number, x2: number) => {
    for (let x = x1; x <= x2; x++) gs.worldMap.setTile(x, y, W)
  }
  const col = (x: number, y1: number, y2: number) => {
    for (let y = y1; y <= y2; y++) gs.worldMap.setTile(x, y, W)
  }

  // Compound jugador S1 — source(8,6) — entrada oeste y=5-7
  row(4, 6, 11);  row(8, 6, 11);  col(11, 4, 8)
  // Compound jugador S2 — source(8,16) — entrada oeste y=15-17
  row(14, 6, 11); row(18, 6, 11); col(11, 14, 18)

  // Compound IA S1 — source(31,6) — entrada este y=5-7
  row(4, 28, 33);  row(8, 28, 33);  col(28, 4, 8)
  // Compound IA S2 — source(31,16) — entrada este y=15-17
  row(14, 28, 33); row(18, 28, 33); col(28, 14, 18)

  // Montaña central — forma de diamante
  // 3 corredores: norte (y≤3), centro (y=11), sur (y≥19)
  row(9,  16, 23)  // cinturón norte
  row(10, 15, 24)  // cinturón norte (más ancho)
  // y=11: corredor central abierto
  row(12, 15, 24)  // cinturón sur (más ancho)
  row(13, 16, 23)  // cinturón sur
}

function buildWorldM2(gs: GameState): void {
  buildWallsM2(gs)
  gs.maxPlayerWorkers = 6

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
    gs.energyStorages.set(w, { current: 0, capacity: 10 })
    gs.behaviors.set(w, { state: "idle" })
  }

  // Base IA
  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 36, y: 11 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 500 })
  gs.aiBaseId = aiBaseId

  // Workers iniciales IA — harvesting (distribuidos)
  const aiSpawns = [{ x: 35, y: 11 }, { x: 35, y: 10 }, { x: 35, y: 12 }]
  for (const pos of aiSpawns) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, pos)
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: 10 })
    gs.behaviors.set(w, { state: "harvesting" })
    gs.aiWorkers.add(w)
  }
}

// ─── Dispatcher ───────────────────────────────────────────
function buildWorld(gs: GameState, missionId: number = 1): void {
  if (missionId === 2) {
    buildWorldM2(gs)
  } else {
    buildWorldM1(gs)
  }
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
