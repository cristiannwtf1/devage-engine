import { GameState } from "../core/GameState"

const DEPOSIT_RANGE = 1

export class DepositSystem {

  public update(gameState: GameState): void {

    const baseId = gameState.baseId
    if (baseId === null) return
    const basePosition = gameState.positions.get(baseId)
    if (!basePosition) return
    const baseStorage = gameState.energyStorages.get(baseId)
    if (!baseStorage) return

    for (const [entityId, behavior] of gameState.behaviors) {
      if (behavior.state !== "returning") continue

      const position = gameState.positions.get(entityId)
      const storage = gameState.energyStorages.get(entityId)
      if (!position || !storage) continue

      const dist = Math.abs(position.x - basePosition.x) +
                   Math.abs(position.y - basePosition.y)

      if (dist <= DEPOSIT_RANGE) {
        const space = baseStorage.capacity - baseStorage.current
        baseStorage.current += Math.min(storage.current, space)
        storage.current = 0
        behavior.state = "harvesting"
        // Limpiar target para que busque uno nuevo
        gameState.targets.delete(entityId)
        gameState.paths.delete(entityId)
      }
    }
  }
}
