import { GameState } from "../core/GameState"

export class RenderSystem {

  public update(gameState: GameState): void {

    console.clear()

    const worldMap = gameState.worldMap

    console.log("========== DEVAGE ENGINE ==========")
    console.log("Tick:", gameState.tick)
    console.log("")

    let header = "   "
    for (let x = 0; x < worldMap.width; x++) {
      header += (x % 10) + " "
    }
    console.log(header)

    const grid: string[][] = []

    for (let y = 0; y < worldMap.height; y++) {

      const row: string[] = []

      for (let x = 0; x < worldMap.width; x++) {
        const tile = worldMap.getTile(x, y)
        row.push(tile ?? ".")
      }

      grid.push(row)
    }

    // Dibujar entidades (worker o base según sea el caso)
    for (const [entityId, position] of gameState.positions) {
      if (
        position.x >= 0 &&
        position.x < worldMap.width &&
        position.y >= 0 &&
        position.y < worldMap.height
      ) {
        const row = grid[position.y]
        if (row) {
          if (gameState.workers.has(entityId)) {
            row[position.x] = "W"
          } else {
            row[position.x] = "B"
          }
        }
      }
    }

    // Dibujar sources (energía)
    for (const [sourceId, source] of gameState.sources) {
      const position = gameState.positions.get(sourceId);
      if (!position) continue;
      if (
        position.x >= 0 &&
        position.x < worldMap.width &&
        position.y >= 0 &&
        position.y < worldMap.height
      ) {
        const row = grid[position.y];
        if (row) {
          row[position.x] = "S";
        }
      }
    }

    // Imprimir
    for (let y = 0; y < grid.length; y++) {
      const rowNumber = y.toString().padStart(2, "0")
      const row = grid[y]
      if (row) {
        console.log(rowNumber + " " + row.join(" "))
      }
    }

    console.log("")

    for (const [id, storage] of gameState.energyStorages) {
      if (!gameState.workers.has(id) && id !== 100) continue;
      console.log(`Entity ${id} Energy: ${storage.current}/${storage.capacity}`);
    }

    // DEBUG: mostrar estados de comportamiento
    for (const [id, behavior] of gameState.behaviors) {
      console.log(`Worker ${id} State: ${behavior.state}`)
    }

    console.log("")
    console.log("Entidades activas:", gameState.entities.size)
  }
}