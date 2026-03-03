import { GameState } from "../core/GameState"
import { computePathLength } from "../utils/PathUtils"

export class TargetSystem {

  public update(gameState: GameState): void {

  for (const [entityId, behavior] of gameState.behaviors) {

    const position = gameState.positions.get(entityId)
    const storage = gameState.energyStorages.get(entityId)

    if (!position || !storage) continue

    const currentTarget = gameState.targets.get(entityId)

    // 🧠 Validar si el target sigue siendo válido
    if (currentTarget && behavior.state === "harvesting") {
      // Buscar si existe source en esa posición
      let sourceStillValid = false
      for (const [sourceId, source] of gameState.sources) {
        const sourcePosition = gameState.positions.get(sourceId)
        if (!sourcePosition) continue
        if (
          sourcePosition.x === currentTarget.targetX &&
          sourcePosition.y === currentTarget.targetY &&
          source.energy > 0
        ) {
          sourceStillValid = true
          break
        }
      }
      if (!sourceStillValid) {
        // Liberar claim antes de borrar target
        for (const [sourceId, claim] of gameState.sourceClaims) {
          if (claim.currentClaimers.has(entityId)) {
            claim.currentClaimers.delete(entityId)
          }
        }
        gameState.targets.delete(entityId)
        gameState.paths.delete(entityId)
      }
    }

    // 🔥 Si tiene target y ya llegó → limpiar
    if (currentTarget) {
      if (
        position.x === currentTarget.targetX &&
        position.y === currentTarget.targetY
      ) {
        // Liberar claim antes de borrar target
        for (const [sourceId, claim] of gameState.sourceClaims) {
          if (claim.currentClaimers.has(entityId)) {
            claim.currentClaimers.delete(entityId)
          }
        }
        gameState.targets.delete(entityId)
        gameState.paths.delete(entityId)
      }
    }

    // 🔥 Si todavía tiene target válido → no reasignar
    if (gameState.targets.has(entityId)) continue

    // 🔥 Asignar nuevo target según estado
    if (behavior.state === "harvesting") {
      const sourceData = this.findNearestSource(
        gameState,
        position.x,
        position.y,
        entityId
      )

      if (sourceData) {
        // Registrar claim
        const claim = gameState.sourceClaims.get(sourceData.sourceId)
        claim?.currentClaimers.add(entityId)

        gameState.targets.set(entityId, {
          targetX: sourceData.x,
          targetY: sourceData.y
        })
      }

    } else if (behavior.state === "returning") {

      const basePosition = gameState.positions.get(100)
      if (!basePosition) continue

      gameState.targets.set(entityId, {
        targetX: basePosition.x,
        targetY: basePosition.y
      })
    }
  }
}

  private findNearestSource(
    gameState: GameState,
    startX: number,
    startY: number,
    workerId: number
  ): { x: number, y: number, sourceId: number } | null {

    let closest: { x: number, y: number, sourceId: number } | null = null
    let minDistance = Infinity

    for (const [sourceId, source] of gameState.sources) {
      if (source.energy <= 0) continue

      const claim = gameState.sourceClaims.get(sourceId)
      if (!claim) continue

      // 🚫 Si ya está llena la source, ignorarla
      if (claim.currentClaimers.size >= claim.maxClaimers) continue

      const position = gameState.positions.get(sourceId)
      if (!position) continue

      const pathLength = computePathLength(
        gameState,
        startX,
        startY,
        position.x,
        position.y
      )

      if (pathLength === null) continue

      if (pathLength < minDistance) {
        minDistance = pathLength
        closest = {
          x: position.x,
          y: position.y,
          sourceId
        }
      }
    }

    return closest
  }
}