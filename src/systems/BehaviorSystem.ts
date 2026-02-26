import { GameState } from "../core/GameState"
import { TileType } from "../world/Tile"

export class BehaviorSystem {

  public update(gameState: GameState): void {
    const world = gameState.worldMap

    for (const [id, behavior] of gameState.behaviors) {

      const position = gameState.positions.get(id)
      const storage = gameState.energyStorages.get(id)

      if (!position || !storage) continue

      if (behavior.state === "harvesting") {

        if (storage.current >= storage.capacity) {
          behavior.state = "returning"
          continue
        }

        const target = world.findNearestEnergy(position.x, position.y)

        if (target) {
          moveTowards(position, target.x, target.y)
        }

      } else if (behavior.state === "returning") {

        const basePosition = gameState.positions.get(100) // baseId

        if (!basePosition) continue

        if (storage.current === 0) {
          behavior.state = "harvesting"
          continue
        }

        moveTowards(position, basePosition.x, basePosition.y)
      }
    }
  }

  

  private findNearestEnergy(gameState: GameState, x: number, y: number) {

    const worldMap = gameState.worldMap

    let closest = null
    let minDistance = Infinity

    for (let yy = 0; yy < worldMap.height; yy++) {
      for (let xx = 0; xx < worldMap.width; xx++) {

        const tile = worldMap.getTile(xx, yy)

        if (tile === TileType.Energy) {

          const distance = Math.abs(xx - x) + Math.abs(yy - y)

          if (distance < minDistance) {
            minDistance = distance
            closest = { x: xx, y: yy }
          }
        }
      }
    }

    return closest
  }

  private findBase(gameState: GameState) {

    for (const [entityId, storage] of gameState.energyStorages) {

      if (storage.capacity > 100) { // asumimos base = gran capacidad
        return gameState.positions.get(entityId) ?? null
      }
    }

    return null
  }
}

function moveTowards(position: { x: number, y: number }, targetX: number, targetY: number) {

  if (position.x < targetX) position.x++
  else if (position.x > targetX) position.x--
  else if (position.y < targetY) position.y++
  else if (position.y > targetY) position.y--
}