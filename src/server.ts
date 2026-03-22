import express from "express"
import { WebSocketServer, WebSocket } from "ws"
import * as http from "http"
import * as path from "path"
import { GameState } from "./core/GameState"
import { GameEngine } from "./core/GameEngine"
import { AiDifficulty } from "./systems/AISystem"
import { EntityId } from "./ecs/Entity"
import { TileType } from "./world/Tile"

// ─── INICIALIZACIÓN DEL MUNDO ─────────────────────────────
// Mapa 50x28 — layout tipo StarCraft/Screeps
// Jugador: esquina izquierda | IA: esquina derecha
// Mineral lines flanqueando cada base + depósitos neutrales en centro
function buildWorld(gs: GameState): void {

  // ── Mineral lines — 5 player + 4 player + 5 AI + 4 AI + 7 neutrales ──
  const sourcePositions = [
    // Jugador — flancos superior e inferior de su base (x:4, y:14)
    { x: 8, y:10 }, { x: 9, y:10 }, { x:10, y:10 }, { x:11, y:10 }, { x:12, y:10 },
    { x: 8, y:18 }, { x: 9, y:18 }, { x:10, y:18 }, { x:11, y:18 },

    // IA — espejo exacto (base en x:45, y:14)
    { x:37, y:10 }, { x:38, y:10 }, { x:39, y:10 }, { x:40, y:10 }, { x:41, y:10 },
    { x:38, y:18 }, { x:39, y:18 }, { x:40, y:18 }, { x:41, y:18 },

    // Neutrales — expansiones en el centro del mapa (zona de disputa)
    { x:23, y: 8 }, { x:24, y: 8 }, { x:25, y: 8 },
    { x:23, y:20 }, { x:24, y:20 }, { x:25, y:20 },
    { x:25, y:14 },
  ]

  // ── Limpiar muros en posiciones críticas ─────────────────
  const clearZones: { x: number; y: number }[] = [
    ...sourcePositions,

    // Entorno base jugador (x:4, y:14)
    { x:3,y:13 }, { x:4,y:13 }, { x:5,y:13 },
    { x:3,y:14 },               { x:5,y:14 },
    { x:3,y:15 }, { x:4,y:15 }, { x:5,y:15 },

    // Acceso jugador → mineral superior (corredor y=12-13 + conexión y=11)
    { x:6,y:12 }, { x:7,y:12 }, { x:8,y:12 }, { x:9,y:12 }, { x:10,y:12 }, { x:11,y:12 }, { x:12,y:12 },
    { x:6,y:13 }, { x:7,y:13 },
    { x:8,y:11 }, { x:9,y:11 }, { x:10,y:11 }, { x:11,y:11 }, { x:12,y:11 }, // gap y=11 crítico
    // Acceso jugador → mineral inferior (corredor y=15-16 + conexión y=17)
    { x:6,y:15 }, { x:7,y:15 },
    { x:6,y:16 }, { x:7,y:16 }, { x:8,y:16 }, { x:9,y:16 }, { x:10,y:16 }, { x:11,y:16 },
    { x:8,y:17 }, { x:9,y:17 }, { x:10,y:17 }, { x:11,y:17 }, // gap y=17 crítico

    // Entorno base IA (x:45, y:14)
    { x:44,y:13 }, { x:45,y:13 }, { x:46,y:13 },
    { x:44,y:14 },                { x:46,y:14 },
    { x:44,y:15 }, { x:45,y:15 }, { x:46,y:15 },

    // Acceso IA → mineral superior (corredor y=12-13 + conexión y=11)
    { x:37,y:12 }, { x:38,y:12 }, { x:39,y:12 }, { x:40,y:12 }, { x:41,y:12 }, { x:42,y:12 }, { x:43,y:12 },
    { x:43,y:13 }, { x:42,y:13 },
    { x:37,y:11 }, { x:38,y:11 }, { x:39,y:11 }, { x:40,y:11 }, { x:41,y:11 }, // gap y=11 crítico
    // Acceso IA → mineral inferior (corredor y=15-16 + conexión y=17)
    { x:43,y:15 }, { x:42,y:15 },
    { x:38,y:16 }, { x:39,y:16 }, { x:40,y:16 }, { x:41,y:16 }, { x:42,y:16 }, { x:43,y:16 },
    { x:38,y:17 }, { x:39,y:17 }, { x:40,y:17 }, { x:41,y:17 }, // gap y=17 crítico

    // Entorno neutrales superiores
    { x:22,y: 8 }, { x:26,y: 8 },
    { x:22,y: 9 }, { x:23,y: 9 }, { x:24,y: 9 }, { x:25,y: 9 }, { x:26,y: 9 },
    // Entorno neutrales inferiores
    { x:22,y:20 }, { x:26,y:20 },
    { x:22,y:19 }, { x:23,y:19 }, { x:24,y:19 }, { x:25,y:19 }, { x:26,y:19 },
    // Entorno neutral centro
    { x:24,y:13 }, { x:25,y:13 }, { x:26,y:13 },
    { x:24,y:14 },                { x:26,y:14 },
    { x:24,y:15 }, { x:25,y:15 }, { x:26,y:15 },

    // Corredor central — garantiza conectividad
    { x:13,y:14 }, { x:14,y:14 }, { x:15,y:14 }, { x:16,y:14 }, { x:17,y:14 }, { x:18,y:14 },
    { x:19,y:14 }, { x:20,y:14 }, { x:21,y:14 }, { x:22,y:14 },
    { x:27,y:14 }, { x:28,y:14 }, { x:29,y:14 }, { x:30,y:14 }, { x:31,y:14 },
    { x:32,y:14 }, { x:33,y:14 }, { x:34,y:14 }, { x:35,y:14 }, { x:36,y:14 }, { x:37,y:14 },
  ]

  for (const pos of clearZones) {
    gs.worldMap.setTile(pos.x, pos.y, TileType.Floor)
  }

  // ── Crear fuentes ─────────────────────────────────────────
  for (const pos of sourcePositions) {
    const id: EntityId = gs.createEntity()
    gs.entities.add(id)
    gs.positions.set(id, pos)
    gs.sources.set(id, {
      energy: 10, maxEnergy: 10,
      regenRate: 1, regenCooldown: 5, currentCooldown: 0
    })
  }

  // ── Base del jugador ──────────────────────────────────────
  const baseId: EntityId = gs.createEntity()
  gs.entities.add(baseId)
  gs.positions.set(baseId, { x: 4, y: 14 })
  gs.energyStorages.set(baseId, { current: 0, capacity: 1000 })
  gs.baseId = baseId

  // ── Workers iniciales del jugador ─────────────────────────
  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 5 + i, y: 14 })
    gs.healths.set(w, { current: 100, max: 100 })
    gs.workers.set(w, { isWorker: true })
    gs.energyStorages.set(w, { current: 0, capacity: 10 })
    gs.behaviors.set(w, { state: "harvesting" })
  }

  // ── Base de la IA ─────────────────────────────────────────
  const aiBaseId: EntityId = gs.createEntity()
  gs.entities.add(aiBaseId)
  gs.positions.set(aiBaseId, { x: 45, y: 14 })
  gs.energyStorages.set(aiBaseId, { current: 0, capacity: 1000 })
  gs.aiBaseId = aiBaseId

  // ── Workers iniciales de la IA ────────────────────────────
  for (let i = 0; i < 2; i++) {
    const w: EntityId = gs.createEntity()
    gs.entities.add(w)
    gs.positions.set(w, { x: 44 - i, y: 14 })
    gs.healths.set(w, { current: 20, max: 20 })
    gs.energyStorages.set(w, { current: 0, capacity: 10 })
    gs.behaviors.set(w, { state: "harvesting" })
    gs.aiWorkers.add(w)
  }
}

// ─── MUNDO ───────────────────────────────────────────────
let gameState = new GameState(50, 28)
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
    winTick:       gs.winTick
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

function resetGame(playerScript?: string | null, difficulty: AiDifficulty = "expert"): void {
  if (engine) engine.stop()
  gameState = new GameState(50, 28)
  buildWorld(gameState)
  if (playerScript) gameState.playerScript = playerScript
  engine = new GameEngine(gameState, 300, () => broadcast(buildSnapshot(gameState)), difficulty)
  engine.start()
  broadcast(buildSnapshot(gameState))
  console.log(`🔄 Juego reiniciado — dificultad IA: ${difficulty}`)
}

app.post("/api/reset", (req, res) => {
  const { difficulty } = req.body as { difficulty?: string }
  const d: AiDifficulty = VALID_DIFFICULTIES.includes(difficulty as AiDifficulty)
    ? (difficulty as AiDifficulty)
    : "expert"
  resetGame(gameState.playerScript, d)
  res.json({ ok: true })
})

// ─── ENGINE CON BROADCAST EN CADA TICK ───────────────────
engine = new GameEngine(gameState, 300, () => {
  broadcast(buildSnapshot(gameState))
})

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
