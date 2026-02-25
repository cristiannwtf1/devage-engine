import { GameState } from "../core/GameState"

export class DeathSystem {

  public update(gameState: GameState): void {

    const entitiesToRemove: number[] = []

    for (const [entityId, health] of gameState.healths) {
      if (health.current <= 0) {
        entitiesToRemove.push(entityId)
      }
    }

    for (const entityId of entitiesToRemove) {
      console.log("Entidad", entityId, "ha muerto")
      gameState.entities.delete(entityId)
      gameState.positions.delete(entityId)
      gameState.healths.delete(entityId)
    }
  }
}