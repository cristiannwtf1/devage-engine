import { GameState } from "../core/GameState"

// ─── Worker Proxy ─────────────────────────────────────────────────────────────
// Wraps a worker entity — exposes readable properties + command methods
export class WorkerProxy {
  constructor(private gs: GameState, public readonly id: number) {}

  get x()              { return this.gs.positions.get(this.id)?.x ?? 0 }
  get y()              { return this.gs.positions.get(this.id)?.y ?? 0 }
  get energy()         { return this.gs.energyStorages.get(this.id)?.current ?? 0 }
  get energyCapacity() { return this.gs.energyStorages.get(this.id)?.capacity ?? 0 }
  get state()          { return this.gs.behaviors.get(this.id)?.state ?? "idle" }

  // Move worker toward position (x, y) — PathfindingSystem will compute the path
  moveTo(x: number, y: number): void {
    const current = this.gs.targets.get(this.id)
    if (current && current.targetX === x && current.targetY === y) return
    this.gs.targets.set(this.id, { targetX: x, targetY: y })
    this.gs.paths.delete(this.id)
  }

  // Move to source and harvest it
  harvest(sourceId: number): void {
    const pos = this.gs.positions.get(sourceId)
    if (!pos) return
    const beh = this.gs.behaviors.get(this.id)
    if (beh) beh.state = "harvesting"
    this.moveTo(pos.x, pos.y)
  }

  // Move to base and deposit energy
  transfer(targetId: number): void {
    const pos = this.gs.positions.get(targetId)
    if (!pos) return
    const beh = this.gs.behaviors.get(this.id)
    if (beh) beh.state = "returning"
    this.moveTo(pos.x, pos.y)
  }
}

// ─── Game Object ──────────────────────────────────────────────────────────────
// The object exposed to player scripts as `Game`
export function buildGameAPI(gs: GameState) {
  // Workers
  const workers: Record<number, WorkerProxy> = {}
  for (const id of gs.workers.keys()) {
    workers[id] = new WorkerProxy(gs, id)
  }

  // Sources
  const sources: Record<number, {
    id: number; x: number; y: number; energy: number; maxEnergy: number
  }> = {}
  for (const [id, src] of gs.sources) {
    const pos = gs.positions.get(id)
    if (pos) sources[id] = { id, x: pos.x, y: pos.y, energy: src.energy, maxEnergy: src.maxEnergy }
  }

  // Base
  const basePos     = gs.baseId !== null ? gs.positions.get(gs.baseId)     : undefined
  const baseStorage = gs.baseId !== null ? gs.energyStorages.get(gs.baseId) : undefined

  const base = (basePos && baseStorage && gs.baseId !== null) ? {
    id:       gs.baseId,
    x:        basePos.x,
    y:        basePos.y,
    energy:   baseStorage.current,
    capacity: baseStorage.capacity
  } : null

  return {
    tick:    gs.tick,
    workers,
    sources,
    base,
    memory:  gs.playerMemory,
  }
}
