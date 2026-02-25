import { GameState } from "../core/GameState"

export class MovementSystem {

  public update(gameState: GameState): void {

    for (const [entityId, position] of gameState.positions) {

      const velocity = gameState.velocities.get(entityId)
      if (!velocity) continue

      const newX = position.x + velocity.vx
      const newY = position.y + velocity.vy

      // 🔥 Aquí está la colisión contra el mapa
      if (gameState.worldMap.isWalkable(newX, newY)) {
        position.x = newX
        position.y = newY
      }

      console.log(
        "Entidad",
        entityId,
        "nueva posición:",
        position.x,
        position.y
      )
    }
  }
}