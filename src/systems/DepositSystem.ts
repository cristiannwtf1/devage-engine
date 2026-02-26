import { GameState } from "../core/GameState"

export class DepositSystem {

  public update(gameState: GameState): void {

    let baseId: number | null = null
    let basePosition: { x: number; y: number } | null = null

    // Buscar base (capacidad grande)
    for (const [entityId, storage] of gameState.energyStorages) {
      if (storage.capacity > 100) {
        baseId = entityId
        basePosition = gameState.positions.get(entityId) ?? null
        break
      }
    }

    if (!baseId || !basePosition) return

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