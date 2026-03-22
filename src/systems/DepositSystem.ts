import { GameState } from "../core/GameState"

const DEPOSIT_RANGE = 1

export class DepositSystem {

  public update(gameState: GameState): void {

    for (const [entityId, behavior] of gameState.behaviors) {
      if (behavior.state !== "returning") continue

      // Cada worker deposita en SU base (jugador o IA)
      const homeBaseId = gameState.aiWorkers.has(entityId)
        ? gameState.aiBaseId
        : gameState.baseId
      if (homeBaseId === null) continue

      const basePosition = gameState.positions.get(homeBaseId)
      const baseStorage  = gameState.energyStorages.get(homeBaseId)
      if (!basePosition || !baseStorage) continue

      const position = gameState.positions.get(entityId)
      const storage  = gameState.energyStorages.get(entityId)
      if (!position || !storage) continue

      const dist = Math.abs(position.x - basePosition.x) +
                   Math.abs(position.y - basePosition.y)

      if (dist <= DEPOSIT_RANGE) {
        const space = baseStorage.capacity - baseStorage.current
        baseStorage.current += Math.min(storage.current, space)
        storage.current = 0
        behavior.state = "harvesting"
        gameState.targets.delete(entityId)
        gameState.paths.delete(entityId)
      }
    }
  }
}
