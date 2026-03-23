import { GameState } from "../core/GameState"
import { computePathLength } from "../utils/PathUtils"

export class TargetSystem {

  public update(gameState: GameState): void {

    for (const [entityId, behavior] of gameState.behaviors) {

      const position = gameState.positions.get(entityId)
      const storage  = gameState.energyStorages.get(entityId)
      if (!position || !storage) continue

      const currentTarget = gameState.targets.get(entityId)

      // ── Ya tiene target válido → no reasignar ─────────────────
      if (gameState.targets.has(entityId)) continue

      // ── "idle" — worker del jugador esperando código, no auto-asignar ──
      if (behavior.state === "idle") continue

      // ── Asignar nuevo target según estado ─────────────────────
      if (behavior.state === "harvesting") {
        const src = this.findBestSource(gameState, position.x, position.y, entityId)
        if (src) {
          // Apuntar al tile adyacente al source — evita amontonamiento (Screeps: range 1)
          const adj = this.findHarvestTile(gameState, src.x, src.y, position.x, position.y, entityId)
          gameState.targets.set(entityId, { targetX: adj.x, targetY: adj.y })
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

  // Source con energía más cercana y accesible
  private findBestSource(
    gameState: GameState,
    startX: number,
    startY: number,
    selfId: number
  ): { x: number; y: number } | null {

    let best: { x: number; y: number } | null = null
    let minDist = Infinity

    for (const [sourceId, source] of gameState.sources) {
      if (source.energy <= 0) continue

      // Workers IA solo cosechan su propio source (no el del jugador), y viceversa
      if (gameState.aiWorkers.has(selfId) && gameState.playerSourceIds.has(sourceId)) continue
      if (!gameState.aiWorkers.has(selfId) && !gameState.playerSourceIds.has(sourceId)) continue

      const pos = gameState.positions.get(sourceId)
      if (!pos) continue

      const dist = computePathLength(gameState, startX, startY, pos.x, pos.y)
      if (dist === null) continue

      if (dist < minDist) {
        minDist = dist
        best = { x: pos.x, y: pos.y }
      }
    }

    return best
  }

  // Tile adyacente al source más cercano al worker
  private findHarvestTile(
    gameState: GameState,
    sourceX: number, sourceY: number,
    workerX: number, workerY: number,
    selfId: number
  ): { x: number; y: number } {
    const offsets = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
    let bestX = sourceX, bestY = sourceY
    let bestDist = Infinity

    for (const off of offsets) {
      const ax = sourceX + off.x, ay = sourceY + off.y
      if (!gameState.worldMap.isWalkable(ax, ay)) continue
      const d = Math.abs(ax - workerX) + Math.abs(ay - workerY)
      if (d < bestDist) { bestDist = d; bestX = ax; bestY = ay }
    }

    return { x: bestX, y: bestY }
  }

}
