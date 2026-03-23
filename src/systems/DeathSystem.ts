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
      console.log(`💀 Entidad ${entityId} ha muerto`)
      this.removeEntity(gameState, entityId)
    }
  }

  private removeEntity(gameState: GameState, entityId: number): void {
    gameState.entities.delete(entityId)
    gameState.positions.delete(entityId)
    gameState.healths.delete(entityId)
    gameState.energyStorages.delete(entityId)
    gameState.workers.delete(entityId)
    gameState.behaviors.delete(entityId)
    gameState.targets.delete(entityId)
    gameState.paths.delete(entityId)
    gameState.structures.delete(entityId)
    gameState.sources.delete(entityId)
    gameState.aiWorkers.delete(entityId)
    gameState.workerMemory.delete(entityId)
  }
}