import { GameState } from "../core/GameState"

export class HarvestSystem {

  public update(gameState: GameState): void {

    for (const [entityId, behavior] of gameState.behaviors) {
      if (behavior.state !== "harvesting") continue

      const position = gameState.positions.get(entityId)
      const storage = gameState.energyStorages.get(entityId)
      if (!position || !storage) continue
      if (storage.current >= storage.capacity) continue

      // Cosechar del source en el mismo tile
      for (const [sourceId, source] of gameState.sources) {
        const sourcePos = gameState.positions.get(sourceId)
        if (!sourcePos) continue

        if (sourcePos.x === position.x && sourcePos.y === position.y && source.energy > 0) {
          source.energy -= 1
          storage.current += 1

          if (source.energy <= 0) {
            source.currentCooldown = source.regenCooldown
          }
          break
        }
      }
    }
  }
}
