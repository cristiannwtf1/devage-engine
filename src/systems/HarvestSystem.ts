import { GameState } from "../core/GameState"

export class HarvestSystem {

  public update(gameState: GameState): void {

    for (const [entityId, behavior] of gameState.behaviors) {

      // Solo workers en estado harvesting
      if (behavior.state !== "harvesting") continue

      const position = gameState.positions.get(entityId)
      const storage = gameState.energyStorages.get(entityId)

      if (!position || !storage) continue
      if (storage.current >= storage.capacity) continue

      // Buscar si existe un source en la misma posición
      for (const [sourceId, source] of gameState.sources) {

        const sourcePosition = gameState.positions.get(sourceId)
        if (!sourcePosition) continue

        const sameTile =
          sourcePosition.x === position.x &&
          sourcePosition.y === position.y

        if (sameTile && source.energy > 0) {

          // Transferir energía
          source.energy -= 1
          storage.current += 1

          console.log(
            "⚡ Worker",
            entityId,
            "recolectó energía. Total:",
            storage.current,
            "| Energía restante en source:",
            source.energy
          )

          // Si se vacía, activar cooldown
          if (source.energy <= 0) {
            source.currentCooldown = source.regenCooldown
            console.log("⏳ Source en cooldown")
          }

          break
        }
      }
    }
  }
}