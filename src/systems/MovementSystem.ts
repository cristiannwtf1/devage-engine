import { GameState } from "../core/GameState"

export class MovementSystem {

  public update(gameState: GameState): void {

    for (const [entityId, position] of gameState.positions) {

      const velocity = gameState.velocities.get(entityId)

      if (!velocity) continue

      position.x += velocity.vx
      position.y += velocity.vy

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