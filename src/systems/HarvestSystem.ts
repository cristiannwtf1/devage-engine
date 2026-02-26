import { GameState } from "../core/GameState"
import { TileType } from "../world/Tile"

export class HarvestSystem {

  public update(gameState: GameState): void {

    for (const [entityId, position] of gameState.positions) {

      const isWorker = gameState.workers.has(entityId)
      const storage = gameState.energyStorages.get(entityId)

      if (!isWorker || !storage) continue

      const tile = gameState.worldMap.getTile(position.x, position.y)

      if (tile === TileType.Energy && storage.current < storage.capacity) {

        storage.current += 1

        console.log("⚡ Worker", entityId, "recolectó energía. Total:", storage.current)

       
        // gameState.worldMap.setTile(position.x, position.y, TileType.Floor)
      }
    }
  }
}