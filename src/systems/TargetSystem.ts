import { GameState } from "../core/GameState"
import { computePathLength } from "../utils/PathUtils"

export class TargetSystem {

  public update(gameState: GameState): void {

    for (const [entityId, behavior] of gameState.behaviors) {

      const position = gameState.positions.get(entityId)
      const storage = gameState.energyStorages.get(entityId)
      if (!position || !storage) continue

      const currentTarget = gameState.targets.get(entityId)

      // ── Limpiar target si el source se agotó ──────────────────
      if (currentTarget && behavior.state === "harvesting") {
        const sourceValid = this.sourceExistsAt(
          gameState, currentTarget.targetX, currentTarget.targetY
        )
        if (!sourceValid) {
          this.releaseClaim(gameState, entityId)
          gameState.targets.delete(entityId)
          gameState.paths.delete(entityId)
        }
      }

      // ── Limpiar target si el worker cambió a returning ────────
      // (se llenó → necesita ir a la base, no al source)
      if (currentTarget && behavior.state === "returning") {
        const isBaseTarget = gameState.baseId !== null &&
          currentTarget.targetX === gameState.positions.get(gameState.baseId)?.x &&
          currentTarget.targetY === gameState.positions.get(gameState.baseId)?.y
        if (!isBaseTarget) {
          this.releaseClaim(gameState, entityId)
          gameState.targets.delete(entityId)
          gameState.paths.delete(entityId)
        }
      }

      // ── Detectar llegada exacta al source ────────────────────
      if (gameState.targets.has(entityId) && currentTarget && behavior.state === "harvesting") {
        const onTarget =
          position.x === currentTarget.targetX &&
          position.y === currentTarget.targetY
        if (onTarget) {
          // Llegó: libera claim y borra target para no seguir moviéndose
          this.releaseClaim(gameState, entityId)
          gameState.targets.delete(entityId)
          gameState.paths.delete(entityId)
        }
      }

      // ── Si ya tiene target → no reasignar ────────────────────
      if (gameState.targets.has(entityId)) continue

      // ── Asignar nuevo target ──────────────────────────────────
      if (behavior.state === "harvesting") {
        const sourceData = this.findNearestSource(
          gameState, position.x, position.y, entityId
        )
        if (sourceData) {
          const claim = gameState.sourceClaims.get(sourceData.sourceId)
          claim?.currentClaimers.add(entityId)
          gameState.targets.set(entityId, {
            targetX: sourceData.x,
            targetY: sourceData.y
          })
        }

      } else if (behavior.state === "returning") {
        if (gameState.baseId === null) continue
        const basePos = gameState.positions.get(gameState.baseId)
        if (!basePos) continue
        gameState.targets.set(entityId, {
          targetX: basePos.x,
          targetY: basePos.y
        })
      }
    }
  }

  private sourceExistsAt(gameState: GameState, x: number, y: number): boolean {
    for (const [sourceId, source] of gameState.sources) {
      const pos = gameState.positions.get(sourceId)
      if (pos && pos.x === x && pos.y === y && source.energy > 0) return true
    }
    return false
  }

  private releaseClaim(gameState: GameState, entityId: number): void {
    for (const [, claim] of gameState.sourceClaims) {
      claim.currentClaimers.delete(entityId)
    }
  }

  private findNearestSource(
    gameState: GameState,
    startX: number,
    startY: number,
    workerId: number
  ): { x: number; y: number; sourceId: number } | null {

    let closest: { x: number; y: number; sourceId: number } | null = null
    let minDistance = Infinity

    for (const [sourceId, source] of gameState.sources) {
      if (source.energy <= 0) continue

      const claim = gameState.sourceClaims.get(sourceId)
      if (!claim) continue
      if (claim.currentClaimers.size >= claim.maxClaimers) continue

      const sourcePos = gameState.positions.get(sourceId)
      if (!sourcePos) continue

      const pathLength = computePathLength(
        gameState, startX, startY, sourcePos.x, sourcePos.y
      )
      if (pathLength === null) continue

      if (pathLength < minDistance) {
        minDistance = pathLength
        closest = { x: sourcePos.x, y: sourcePos.y, sourceId }
      }
    }

    return closest
  }
}
