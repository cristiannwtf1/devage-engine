import { GameState } from "../core/GameState"

export class RenderSystem {

  private width = 20
  private height = 10

  public update(gameState: GameState): void {

    // Limpiar consola en cada tick
    console.clear()

    console.log("========== DEVAGE ENGINE ==========")
    console.log("Tick:", gameState.tick)
    console.log("")

    // Crear grid vacío
    const grid: string[][] = []

    for (let y = 0; y < this.height; y++) {
      const row: string[] = []
      for (let x = 0; x < this.width; x++) {
        row.push(".")
      }
      grid.push(row)
    }

    // Dibujar entidades
    for (const [entityId, position] of gameState.positions) {

      if (
        position.x >= 0 &&
        position.x < this.width &&
        position.y >= 0 &&
        position.y < this.height
      ) {

        const row = grid[position.y]

        if (row) {
          row[position.x] = "E"
        }
      }
    }

    // Imprimir grid
    for (const row of grid) {
      console.log(row.join(" "))
    }
    console.log("")
    console.log("Entidades activas:", gameState.entities.size)
  }
}