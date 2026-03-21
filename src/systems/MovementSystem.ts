import { GameState } from "../core/GameState"

export class MovementSystem {

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

      // Si el siguiente paso está ocupado ahora, cancelar path
      if (this.isOccupied(gameState, entityId, nextStep.x, nextStep.y)) {
        gameState.paths.delete(entityId)
        continue
      }

      position.x = nextStep.x
      position.y = nextStep.y

      pathComponent.steps.shift()
    }
  }

  private isOccupied(
    gameState: GameState,
    selfId: number,
    x: number,
    y: number
  ): boolean {
    for (const [entityId, position] of gameState.positions) {
      if (entityId === selfId) continue;
      // SOLO bloquear si es otro worker
      if (gameState.workers.has(entityId)) {
        if (position.x === x && position.y === y) {
          return true;
        }
      }
    }
    return false;
  }
}