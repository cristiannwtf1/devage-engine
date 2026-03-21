import { GameState } from "../core/GameState"

export class DepositSystem {

  public update(gameState: GameState): void {

    const baseId = gameState.baseId
    if (baseId === null) return
    const basePosition = gameState.positions.get(baseId) ?? null
    if (!basePosition) return

    // Revisar workers
    for (const [entityId, behavior] of gameState.behaviors) {

      const position = gameState.positions.get(entityId)
      const storage = gameState.energyStorages.get(entityId)

      if (!position || !storage) continue

      if (behavior.state === "returning") {

        if (position.x === basePosition.x &&
            position.y === basePosition.y) {

          const baseStorage = gameState.energyStorages.get(baseId)

          if (!baseStorage) continue

          // registrar depósito en consola para visibilidad
          console.log(`Worker ${entityId} deposited ${storage.current} energy at base`)

          baseStorage.current += storage.current
          storage.current = 0
          behavior.state = "harvesting"
        }
      }
    }
  }
}