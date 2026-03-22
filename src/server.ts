import express from "express"
import { WebSocketServer, WebSocket } from "ws"
import * as http from "http"
import * as path from "path"
import { GameState } from "./core/GameState"
import { GameEngine } from "./core/GameEngine"
import { EntityId } from "./ecs/Entity"
import { TileType } from "./world/Tile"

// ─── MUNDO ───────────────────────────────────────────────
const gameState = new GameState(30, 20)

// Migrar energy tiles a sources ECS
for (let y = 0; y < gameState.worldMap.height; y++) {
  for (let x = 0; x < gameState.worldMap.width; x++) {
    if (gameState.worldMap.getTile(x, y) === TileType.Energy) {
      const sourceId: EntityId = gameState.createEntity()
      gameState.entities.add(sourceId)
      gameState.positions.set(sourceId, { x, y })
      gameState.sources.set(sourceId, {
        energy: 10,
        maxEnergy: 10,
        regenRate: 1,
        regenCooldown: 5,
        currentCooldown: 0
      })
gameState.worldMap.setTile(x, y, TileType.Floor)
    }
  }
}

// Base del jugador
const baseId: EntityId = gameState.createEntity()
gameState.entities.add(baseId)
gameState.positions.set(baseId, { x: 5, y: 10 })
gameState.energyStorages.set(baseId, { current: 0, capacity: 1000 })
gameState.baseId = baseId

// Workers iniciales
for (let i = 0; i < 2; i++) {
  const w: EntityId = gameState.createEntity()
  gameState.entities.add(w)
  gameState.positions.set(w, { x: 5 + i, y: 10 })
  gameState.healths.set(w, { current: 100, max: 100 })
  gameState.workers.set(w, { isWorker: true })
  gameState.energyStorages.set(w, { current: 0, capacity: 10 })
  gameState.behaviors.set(w, { state: "harvesting" })
}

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
    if (id === gs.baseId) type = "base"
    else if (gs.workers.has(id)) type = "worker"
    else if (gs.sources.has(id)) type = "source"
    else if (gs.structures.has(id)) type = "extension"

    const entry: Record<string, unknown> = { id, x: pos.x, y: pos.y, type }

    const health = gs.healths.get(id)
    if (health) entry.health = health

    const storage = gs.energyStorages.get(id)
    if (storage) entry.energy = storage

    const behavior = gs.behaviors.get(id)
    if (behavior) entry.state = behavior.state

    const source = gs.sources.get(id)
    if (source) entry.source = { energy: source.energy, max: source.maxEnergy }

    entities.push(entry)
  }

  const baseStorage = gs.baseId ? gs.energyStorages.get(gs.baseId) : null

  return {
    tick: gs.tick,
    mapWidth: gs.worldMap.width,
    mapHeight: gs.worldMap.height,
    tiles,
    entities,
    base: baseStorage
      ? { energy: baseStorage.current, capacity: baseStorage.capacity }
      : null,
    workerCount: gs.workers.size,
    extensions: [...gs.structures.values()].filter(s => s.type === "extension").length,
    scriptError: gs.scriptError ?? null
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

  const baseStorage = gs.baseId ? gs.energyStorages.get(gs.baseId) : null
  const harvesting  = workers.filter(w => w.state === "harvesting").length
  const returning   = workers.filter(w => w.state === "returning").length
  const idle        = workers.filter(w => !w.hasTarget).length

  return {
    tick:        gs.tick,
    base:        baseStorage ? `${baseStorage.current}/${baseStorage.capacity}` : "?",
    workers:     { total: workers.length, harvesting, returning, idle, detail: workers },
    sources:     { total: sources.length, active: sources.filter(s => s.energy !== "0/10").length, detail: sources },
    extensions:  [...gs.structures.values()].filter(s => s.type === "extension").length
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

// ─── ENGINE CON BROADCAST EN CADA TICK ───────────────────
const engine = new GameEngine(gameState, 300, () => {
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
  console.log("🚀 DEVAGE ENGINE corriendo en http://localhost:3000")
  // Guardar PID para poder matar el servidor con `npm run stop`
  require("fs").writeFileSync(".server.pid", String(process.pid))
  engine.start()
})
