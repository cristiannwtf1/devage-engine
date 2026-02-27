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

      let newX = position.x
      let newY = position.y

      // Movimiento en X
      if (position.x < target.targetX) newX++
      else if (position.x > target.targetX) newX--
      // Movimiento en Y
      else if (position.y < target.targetY) newY++
      else if (position.y > target.targetY) newY--

      // Validar antes de mover
      const isWalkable = gameState.worldMap.isWalkable(newX, newY)
      const isOccupied = this.isPositionOccupied(gameState, newX, newY)

      if (isWalkable && !isOccupied) {
        position.x = newX
        position.y = newY
      }
    }
  }

  private isPositionOccupied(gameState: GameState, x: number, y: number): boolean {

    for (const [entityId, position] of gameState.positions) {

      if (position.x === x && position.y === y) {
        return true
      }
    }

    return false
  }
}