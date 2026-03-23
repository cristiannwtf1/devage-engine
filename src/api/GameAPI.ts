import { GameState } from "../core/GameState"

// ─── Return Codes ──────────────────────────────────────────
export const RC = {
  OK:                    0,
  ERR_NOT_IN_RANGE:     -1,
  ERR_NOT_ENOUGH_ENERGY:-2,
  ERR_FULL:             -3,
  ERR_INVALID_TARGET:   -4,
} as const

const SAY_DURATION = 3   // ticks que dura el mensaje

// ─── Worker Proxy ──────────────────────────────────────────
export class WorkerProxy {
  constructor(private gs: GameState, public readonly id: number) {}

  // ── Propiedades básicas ───────────────────────────────
  get x()     { return this.gs.positions.get(this.id)?.x ?? 0 }
  get y()     { return this.gs.positions.get(this.id)?.y ?? 0 }
  get state() { return this.gs.behaviors.get(this.id)?.state ?? "idle" }

  // ── pos — posición como objeto ────────────────────────
  get pos() {
    const p = this.gs.positions.get(this.id)
    return { x: p?.x ?? 0, y: p?.y ?? 0 }
  }

  // ── store — energía explícita ─────────────────────────
  get store() {
    const s = this.gs.energyStorages.get(this.id)
    const energy   = s?.current  ?? 0
    const capacity = s?.capacity ?? 10
    return {
      energy,
      capacity,
      isFull:  () => energy >= capacity,
      isEmpty: () => energy === 0,
    }
  }

  // ── moveTo — acepta (x,y), {x,y} o cualquier objeto con pos ──
  moveTo(xOrObj: number | { x: number; y: number } | { pos: { x: number; y: number } },
         y?: number): number {
    let tx: number, ty: number
    if (typeof xOrObj === "number") {
      tx = xOrObj; ty = y ?? 0
    } else if ("pos" in xOrObj) {
      tx = xOrObj.pos.x; ty = xOrObj.pos.y
    } else {
      tx = xOrObj.x; ty = xOrObj.y
    }
    const current = this.gs.targets.get(this.id)
    if (!current || current.targetX !== tx || current.targetY !== ty) {
      this.gs.targets.set(this.id, { targetX: tx, targetY: ty })
      this.gs.paths.delete(this.id)
    }
    return RC.OK
  }

  // ── harvest — recolectar de una fuente ────────────────
  harvest(sourceId: number): number {
    if (!this.gs.sources.has(sourceId)) return RC.ERR_INVALID_TARGET
    if (this.store.isFull())            return RC.ERR_FULL

    const pos = this.gs.positions.get(sourceId)
    if (!pos) return RC.ERR_INVALID_TARGET

    const beh = this.gs.behaviors.get(this.id)
    if (beh) beh.state = "harvesting"
    this.moveTo(pos.x, pos.y)
    return RC.OK
  }

  // ── transfer — depositar energía en base/extensión ────
  transfer(targetId: number): number {
    if (this.store.isEmpty()) return RC.ERR_NOT_ENOUGH_ENERGY

    const pos = this.gs.positions.get(targetId)
    if (!pos) return RC.ERR_INVALID_TARGET

    const beh = this.gs.behaviors.get(this.id)
    if (beh) beh.state = "returning"
    this.moveTo(pos.x, pos.y)
    return RC.OK
  }

  // ── say — muestra una burbuja de texto sobre el worker ─
  say(msg: string): void {
    this.gs.workerSays.set(this.id, {
      msg: String(msg).substring(0, 32),
      until: this.gs.tick + SAY_DURATION,
    })
  }
}

// ─── Game Object ──────────────────────────────────────────
export function buildGameAPI(gs: GameState) {
  // Limpiar says expirados
  for (const [id, say] of gs.workerSays) {
    if (say.until <= gs.tick) gs.workerSays.delete(id)
  }

  // Workers
  const workers: Record<number, WorkerProxy> = {}
  for (const id of gs.workers.keys()) {
    workers[id] = new WorkerProxy(gs, id)
  }

  // Sources
  const sources: Record<number, {
    id: number; x: number; y: number; pos: { x: number; y: number };
    energy: number; maxEnergy: number
  }> = {}
  for (const [id, src] of gs.sources) {
    const pos = gs.positions.get(id)
    if (pos) sources[id] = {
      id, x: pos.x, y: pos.y,
      pos: { x: pos.x, y: pos.y },
      energy: src.energy, maxEnergy: src.maxEnergy,
    }
  }

  // Base
  const basePos     = gs.baseId !== null ? gs.positions.get(gs.baseId)      : undefined
  const baseStorage = gs.baseId !== null ? gs.energyStorages.get(gs.baseId) : undefined

  const base = (basePos && baseStorage && gs.baseId !== null) ? {
    id:       gs.baseId,
    x:        basePos.x,
    y:        basePos.y,
    pos:      { x: basePos.x, y: basePos.y },
    energy:   baseStorage.current,
    capacity: baseStorage.capacity,
  } : null

  return {
    // Constantes de resultado
    OK:                    RC.OK,
    ERR_NOT_IN_RANGE:      RC.ERR_NOT_IN_RANGE,
    ERR_NOT_ENOUGH_ENERGY: RC.ERR_NOT_ENOUGH_ENERGY,
    ERR_FULL:              RC.ERR_FULL,
    ERR_INVALID_TARGET:    RC.ERR_INVALID_TARGET,

    tick:    gs.tick,
    workers,
    sources,
    base,
    memory:  gs.playerMemory,
  }
}
