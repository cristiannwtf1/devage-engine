import { GameState } from "../core/GameState"
import { EntityId } from "../ecs/Entity"

// ─── Personalidades disponibles ───────────────────────────
export type AiPersonality = "expansionista" | "defensiva" | "agresiva"

const AI_PERSONALITIES = {
  expansionista: {
    maxWorkers:     12,   // más workers que el jugador
    spawnCost:      20,
    spawnDelay:     3,    // spawn más rápido
    buildThreshold: 0.4,  // construye con 40% de capacidad llena
  },
  defensiva: {
    maxWorkers:     6,
    spawnCost:      20,
    spawnDelay:     8,
    buildThreshold: 0.8,
  },
  agresiva: {
    maxWorkers:     10,
    spawnCost:      20,
    spawnDelay:     4,
    buildThreshold: 0.5,
  },
}

export class AISystem {

  private personality:      AiPersonality
  private cfg:              typeof AI_PERSONALITIES["expansionista"]
  private spawnCooldown:    number = 0
  private nextWorkerId:     number = 5000   // IDs de workers IA (evita colisiones con jugador)
  private maxExtensions:    number = 5
  private baseCost:         number = 50
  private costPerLevel:     number = 50

  constructor(personality: AiPersonality = "expansionista") {
    this.personality = personality
    this.cfg         = AI_PERSONALITIES[personality]
    console.log(`🤖 IA iniciada — personalidad: ${personality}`)
  }

  public update(gs: GameState): void {
    if (gs.aiBaseId === null) return

    const aiBaseStorage  = gs.energyStorages.get(gs.aiBaseId)
    const aiBasePosition = gs.positions.get(gs.aiBaseId)
    if (!aiBaseStorage || !aiBasePosition) return

    // 1. Construir extensiones
    this.tryBuild(gs, aiBaseStorage, aiBasePosition)

    // 2. Spawn de workers
    this.trySpawn(gs, aiBaseStorage, aiBasePosition)
  }

  // ── Construcción de extensiones ────────────────────────────
  private tryBuild(
    gs: GameState,
    aiBaseStorage: { current: number; capacity: number },
    aiBasePosition: { x: number; y: number }
  ): void {
    const extensionCount = [...gs.structures.values()]
      .filter(s => s.type === "ai-extension").length

    if (extensionCount >= this.maxExtensions) return

    const cost = this.baseCost + extensionCount * this.costPerLevel
    const fillRatio = aiBaseStorage.current / aiBaseStorage.capacity

    if (fillRatio < this.cfg.buildThreshold) return
    if (aiBaseStorage.current < cost) return

    const newId = gs.createEntity()
    gs.entities.add(newId)

    const offset = this.getOffset(extensionCount)
    gs.positions.set(newId, {
      x: aiBasePosition.x + offset.x,
      y: aiBasePosition.y + offset.y
    })
    gs.structures.set(newId, { type: "ai-extension" })

    aiBaseStorage.capacity += 200
    aiBaseStorage.current  -= cost

    console.log(`🤖🏗 IA Extension #${extensionCount + 1} | Costo: ${cost} | Cap: ${aiBaseStorage.capacity}`)
  }

  // ── Spawn de workers ───────────────────────────────────────
  private trySpawn(
    gs: GameState,
    aiBaseStorage: { current: number; capacity: number },
    aiBasePosition: { x: number; y: number }
  ): void {
    if (this.spawnCooldown > 0) { this.spawnCooldown--; return }
    if (gs.aiWorkers.size >= this.cfg.maxWorkers) return
    if (aiBaseStorage.current < this.cfg.spawnCost) return

    const spawnPos = this.findFreeSpawnTile(gs, aiBasePosition.x, aiBasePosition.y)
    if (!spawnPos) return

    const newId: EntityId = this.nextWorkerId++
    gs.entities.add(newId)
    gs.positions.set(newId, spawnPos)
    gs.healths.set(newId, { current: 20, max: 20 })
    gs.energyStorages.set(newId, { current: 0, capacity: 10 })
    gs.behaviors.set(newId, { state: "harvesting" })
    gs.aiWorkers.add(newId)

    aiBaseStorage.current -= this.cfg.spawnCost
    this.spawnCooldown = this.cfg.spawnDelay

    console.log(`🤖🆕 IA Worker #${newId} | Workers IA: ${gs.aiWorkers.size}`)
  }

  // ── Helpers ────────────────────────────────────────────────
  private findFreeSpawnTile(
    gs: GameState,
    baseX: number,
    baseY: number
  ): { x: number; y: number } | null {
    const offsets = [
      { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 1 }, { x: 1, y: 1 }
    ]
    for (const off of offsets) {
      const tx = baseX + off.x
      const ty = baseY + off.y
      if (!gs.worldMap.isWalkable(tx, ty)) continue
      const occupied = [...gs.positions.values()].some(p => p.x === tx && p.y === ty)
      if (!occupied) return { x: tx, y: ty }
    }
    return null
  }

  private getOffset(index: number): { x: number; y: number } {
    const offsets = [
      { x: -1, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 1 },  { x: 1, y: 1 },
      { x: -2, y: 0 }
    ]
    return offsets[index] ?? { x: -(index + 1), y: 0 }
  }
}
