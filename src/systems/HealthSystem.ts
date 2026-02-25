import { GameState } from "../core/GameState"

export class HealthSystem {

  public update(gameState: GameState): void {

    for (const [entityId, health] of gameState.healths) {

      health.current -= 1

      console.log(
        "Entidad",
        entityId,
        "vida actual:",
        health.current
      )
    }
  }
}