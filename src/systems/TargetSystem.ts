import { GameState } from "../core/GameState"
import { TileType } from "../world/Tile"

export class TargetSystem {

  public update(gameState: GameState): void {

    // 1️⃣ Crear set de tiles reservados
    const reservedTiles = new Set<string>()

    for (const target of gameState.targets.values()) {
      reservedTiles.add(`${target.targetX},${target.targetY}`)
    }

    for (const [entityId, behavior] of gameState.behaviors) {

      const position = gameState.positions.get(entityId)
      if (!position) continue

      // Si ya tiene target, no reasignar
      if (gameState.targets.has(entityId)) continue

      if (behavior.state === "harvesting") {

        const energyPosition = this.findNearestEnergy(
          gameState,
          position.x,
          position.y,
          reservedTiles
        )

        if (energyPosition) {

          // Reservar inmediatamente
          reservedTiles.add(`${energyPosition.x},${energyPosition.y}`)

          gameState.targets.set(entityId, {
            targetX: energyPosition.x,
            targetY: energyPosition.y
          })
        }

      } else if (behavior.state === "returning") {

        // Buscar base (por ahora id 100 fijo)
        const basePosition = gameState.positions.get(100)
        if (!basePosition) continue

        gameState.targets.set(entityId, {
          targetX: basePosition.x,
          targetY: basePosition.y
        })
      }
    }
  }

  private findNearestEnergy(
    gameState: GameState,
    startX: number,
    startY: number,
    reservedTiles: Set<string>
  ) {

    let closest: { x: number, y: number } | null = null
    let minDistance = Infinity

    for (let y = 0; y < gameState.worldMap.height; y++) {
      for (let x = 0; x < gameState.worldMap.width; x++) {

        const tile = gameState.worldMap.getTile(x, y)
        const key = `${x},${y}`

        if (tile === TileType.Energy && !reservedTiles.has(key)) {

          const distance = Math.abs(startX - x) + Math.abs(startY - y)

          if (distance < minDistance) {
            minDistance = distance
            closest = { x, y }
          }
        }
      }
    }

    return closest
  }
}