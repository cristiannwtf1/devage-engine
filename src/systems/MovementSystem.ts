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

      position.x = nextStep.x
      position.y = nextStep.y
      pathComponent.steps.shift()
    }
  }
}
