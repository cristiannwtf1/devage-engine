import { GameState } from "../core/GameState"

export class RenderSystem {

  public update(gameState: GameState): void {

    console.clear()

    const worldMap = gameState.worldMap

    console.log("========== DEVAGE ENGINE ==========")
    console.log("Tick:", gameState.tick)
    console.log("")

    // Header columnas
    let header = "   "
    for (let x = 0; x < worldMap.width; x++) {
      header += (x % 10) + " "
    }
    console.log(header)

    const grid: string[][] = []

    // Construir grid base desde tiles
    for (let y = 0; y < worldMap.height; y++) {

      const row: string[] = []

      for (let x = 0; x < worldMap.width; x++) {
        const tile = worldMap.getTile(x, y)
        row.push(tile ?? ".")
      }

      grid.push(row)
    }

    // =====================================
    // 1️⃣ Dibujar base y workers
    // =====================================
    for (const [entityId, position] of gameState.positions) {
      if (
        position.x >= 0 &&
        position.x < worldMap.width &&
        position.y >= 0 &&
        position.y < worldMap.height
      ) {
        const row = grid[position.y]
        if (!row) continue



        if (gameState.workers.has(entityId)) {
          row[position.x] = "W"
        } else if (gameState.structures.has(entityId)) {
          const structure = gameState.structures.get(entityId)
          if (structure?.type === "extension") {
            row[position.x] = "E"
          }
        } else {
          row[position.x] = "B"
        }



      }
    }

    // =====================================
    // 2️⃣ Dibujar sources
    // =====================================
    for (const [sourceId] of gameState.sources) {

      const position = gameState.positions.get(sourceId)
      if (!position) continue

      if (
        position.x >= 0 &&
        position.x < worldMap.width &&
        position.y >= 0 &&
        position.y < worldMap.height
      ) {
        const row = grid[position.y]
        if (row) {
          row[position.x] = "S"
        }
      }
    }

    // =====================================
    // 3️⃣ Dibujar estructuras
    // =====================================
    for (const [entityId] of gameState.structures) {

      const position = gameState.positions.get(entityId)
      if (!position) continue

      if (
        position.x >= 0 &&
        position.x < worldMap.width &&
        position.y >= 0 &&
        position.y < worldMap.height
      ) {
        const row = grid[position.y]
        if (row) {
          row[position.x] = "E"
        }
      }
    }

    // =====================================
    // Imprimir grid
    // =====================================
    for (let y = 0; y < grid.length; y++) {
      const rowNumber = y.toString().padStart(2, "0")
      const row = grid[y]
      if (row) {
        console.log(rowNumber + " " + row.join(" "))
      }
    }

    console.log("")

    // Mostrar energía base
    if (gameState.baseId !== null) {
      const baseStorage = gameState.energyStorages.get(gameState.baseId)
      if (baseStorage) {
        const extensions = [...gameState.structures.values()].filter(s => s.type === "extension").length
        console.log(`🏠 Base  Energy: ${baseStorage.current}/${baseStorage.capacity} | Extensions: ${extensions}`)
      }
    }

    // Mostrar energía workers
    for (const [id, storage] of gameState.energyStorages) {
      if (!gameState.workers.has(id)) continue
      const behavior = gameState.behaviors.get(id)
      const state = behavior?.state ?? "?"
      console.log(`👷 W#${id} Energy: ${storage.current}/${storage.capacity} | ${state}`)
    }

    console.log("")
    console.log(`Entidades activas: ${gameState.entities.size} | Workers: ${gameState.workers.size}`)
  }
}