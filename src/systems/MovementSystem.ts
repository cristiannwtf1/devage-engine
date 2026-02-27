import { GameState } from "../core/GameState"

export class MovementSystem {

  public update(gameState: GameState): void {

    for (const [entityId, target] of gameState.targets) {

      const position = gameState.positions.get(entityId)
      if (!position) continue

      // Si ya llegó al destino → eliminar target
      if (position.x === target.targetX && position.y === target.targetY) {
        gameState.targets.delete(entityId)
        continue
      }

      // Movimiento en X
      if (position.x < target.targetX) position.x++
      else if (position.x > target.targetX) position.x--

      // Movimiento en Y
      else if (position.y < target.targetY) position.y++
      else if (position.y > target.targetY) position.y--
    }
  }
}