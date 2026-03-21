import { GameState } from "../core/GameState"

export class MovementSystem {

  // Ticks que un worker espera antes de recalcular path si está bloqueado
  private waitCooldowns: Map<number, number> = new Map()

  public update(gameState: GameState): void {

    for (const [entityId, pathComponent] of gameState.paths) {

      const position = gameState.positions.get(entityId)
      if (!position) continue

      if (pathComponent.steps.length === 0) {
        gameState.paths.delete(entityId)
        continue
      }

      const nextStep = pathComponent.steps[0]
      if (!nextStep) {
        gameState.paths.delete(entityId)
        continue
      }

      // Esperar cooldown si está bloqueado
      const cooldown = this.waitCooldowns.get(entityId) ?? 0
      if (cooldown > 0) {
        this.waitCooldowns.set(entityId, cooldown - 1)
        continue
      }

      // Si el siguiente paso está ocupado, esperar 2 ticks y luego recalcular
      if (this.isOccupied(gameState, entityId, nextStep.x, nextStep.y)) {
        this.waitCooldowns.set(entityId, 2)
        gameState.paths.delete(entityId)  // fuerza recalculo de path alternativo
        continue
      }

      position.x = nextStep.x
      position.y = nextStep.y
      pathComponent.steps.shift()
      this.waitCooldowns.delete(entityId)
    }
  }

  private isOccupied(
    gameState: GameState,
    selfId: number,
    x: number,
    y: number
  ): boolean {
    for (const [entityId, position] of gameState.positions) {
      if (entityId === selfId) continue
      if (gameState.workers.has(entityId)) {
        if (position.x === x && position.y === y) return true
      }
    }
    return false
  }
}
