import { GameState } from "../core/GameState"
import { TileType } from "../world/Tile"

export class RenderSystem {

  public update(gameState: GameState): void {

    console.clear()

    console.log("========== DEVAGE ENGINE ==========")
    console.log("Tick:", gameState.tick)
    console.log("")

    const worldMap = gameState.worldMap

    // Crear copia visual del mapa usando getTile() de forma segura
    const grid: string[][] = []

    for (let y = 0; y < worldMap.height; y++) {
      const row: string[] = []

      for (let x = 0; x < worldMap.width; x++) {
        const tile = worldMap.getTile(x, y)
        row.push(tile ?? ".")
      }

      grid.push(row)
    }

    // Dibujar entidades encima del mapa
    for (const [entityId, position] of gameState.positions) {

      if (
        position.x >= 0 &&
        position.x < worldMap.width &&
        position.y >= 0 &&
        position.y < worldMap.height
      ) {
        const row = grid[position.y]
        if (row) row[position.x] = "E"
      }
    }

    // Imprimir mapa final
    for (const row of grid) {
      console.log(row.join(" "))
    }

    console.log("")
    console.log("Entidades activas:", gameState.entities.size)
  }
}