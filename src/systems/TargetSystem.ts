import { GameState } from "../core/GameState"

export class TargetSystem {

  public update(gameState: GameState): void {

  for (const [entityId, behavior] of gameState.behaviors) {

    const position = gameState.positions.get(entityId)
    const storage = gameState.energyStorages.get(entityId)

    if (!position || !storage) continue

    const currentTarget = gameState.targets.get(entityId)

    // 🔥 Si tiene target y ya llegó → limpiar
    if (currentTarget) {
      if (
        position.x === currentTarget.targetX &&
        position.y === currentTarget.targetY
      ) {
        gameState.targets.delete(entityId)
        gameState.paths.delete(entityId)
      }
    }

    // 🔥 Si todavía tiene target válido → no reasignar
    if (gameState.targets.has(entityId)) continue

    // 🔥 Asignar nuevo target según estado
    if (behavior.state === "harvesting") {

      const sourcePosition = this.findNearestSource(
        gameState,
        position.x,
        position.y
      )

      if (sourcePosition) {
        gameState.targets.set(entityId, {
          targetX: sourcePosition.x,
          targetY: sourcePosition.y
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
    startY: number
  ): { x: number, y: number } | null {

    let closest: { x: number, y: number } | null = null
    let minDistance = Infinity

    for (const [sourceId, source] of gameState.sources) {

      if (source.energy <= 0) continue

      const position = gameState.positions.get(sourceId)
      if (!position) continue

      const distance =
        Math.abs(startX - position.x) +
        Math.abs(startY - position.y)

      if (distance < minDistance) {
        minDistance = distance
        closest = { x: position.x, y: position.y }
      }
    }

    return closest
  }
}