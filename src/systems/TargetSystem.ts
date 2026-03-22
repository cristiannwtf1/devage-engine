import { GameState } from "../core/GameState"
import { computePathLength } from "../utils/PathUtils"

export class TargetSystem {

  public update(gameState: GameState): void {

    for (const [entityId, behavior] of gameState.behaviors) {

      const position = gameState.positions.get(entityId)
      const storage  = gameState.energyStorages.get(entityId)
      if (!position || !storage) continue

      const currentTarget = gameState.targets.get(entityId)

      // ── Source del target se agotó → soltar y buscar otro ────
      if (currentTarget && behavior.state === "harvesting") {
        if (!this.sourceExistsAt(gameState, currentTarget.targetX, currentTarget.targetY)) {
          gameState.targets.delete(entityId)
          gameState.paths.delete(entityId)
        }
      }

      // ── Ya tiene target válido → no reasignar ─────────────────
      if (gameState.targets.has(entityId)) continue

      // ── Asignar nuevo target según estado ─────────────────────
      if (behavior.state === "harvesting") {
        const src = this.findBestSource(gameState, position.x, position.y, entityId)
        if (src) {
          gameState.targets.set(entityId, { targetX: src.x, targetY: src.y })
        }

      } else if (behavior.state === "returning") {
        const homeId = gameState.aiWorkers.has(entityId)
          ? gameState.aiBaseId
          : gameState.baseId
        if (homeId === null) continue
        const basePos = gameState.positions.get(homeId)
        if (!basePos) continue
        gameState.targets.set(entityId, { targetX: basePos.x, targetY: basePos.y })
      }
    }
  }

  // Fuente sin target apuntando a ella, con energía, y path accesible
  private findBestSource(
    gameState: GameState,
    startX: number,
    startY: number,
    selfId: number
  ): { x: number; y: number } | null {

    // Sources ya ocupadas: otro worker las tiene como target O está físicamente encima
    const occupied = new Set<string>()
    for (const [wId, target] of gameState.targets) {
      if (wId === selfId) continue
      occupied.add(`${target.targetX},${target.targetY}`)
    }
    for (const [wId, pos] of gameState.positions) {
      if (wId === selfId) continue
      if (gameState.workers.has(wId) || gameState.aiWorkers.has(wId)) {
        occupied.add(`${pos.x},${pos.y}`)
      }
    }

    let best: { x: number; y: number } | null = null
    let minDist = Infinity

    for (const [sourceId, source] of gameState.sources) {
      if (source.energy <= 0) continue

      const pos = gameState.positions.get(sourceId)
      if (!pos) continue

      // Saltar si está ocupada (target de otro worker o worker encima)
      if (occupied.has(`${pos.x},${pos.y}`)) continue

      const dist = computePathLength(gameState, startX, startY, pos.x, pos.y)
      if (dist === null) continue

      if (dist < minDist) {
        minDist = dist
        best = { x: pos.x, y: pos.y }
      }
    }

    return best
  }

  private sourceExistsAt(gameState: GameState, x: number, y: number): boolean {
    for (const [sourceId, source] of gameState.sources) {
      const pos = gameState.positions.get(sourceId)
      if (pos && pos.x === x && pos.y === y && source.energy > 0) return true
    }
    return false
  }
}
