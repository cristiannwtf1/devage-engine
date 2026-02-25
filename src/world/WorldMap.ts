import { TileType } from "./Tile"

export class WorldMap {

  public width: number
  public height: number

  // Matriz 2D que guarda el tipo de tile en cada posición
  private tiles: TileType[][] = []

  constructor(width: number, height: number) {
    this.width = width
    this.height = height

    this.generate()
  }

  // Generación procedural básica
  private generate(): void {

    for (let y = 0; y < this.height; y++) {

      const row: TileType[] = []

      for (let x = 0; x < this.width; x++) {

        // Bordes del mapa siempre serán pared
        if (
          x === 0 ||
          y === 0 ||
          x === this.width - 1 ||
          y === this.height - 1
        ) {
          row.push(TileType.Wall)
        } else {

          // 10% probabilidad de generar pared interna
          const isWall = Math.random() < 0.1

          row.push(isWall ? TileType.Wall : TileType.Floor)
        }
      }

      this.tiles.push(row)
    }
  }

  // Devuelve el tile en una posición
  public getTile(x: number, y: number): TileType | null {
    if (
      x < 0 ||
      y < 0 ||
      x >= this.width ||
      y >= this.height
    ) {
      return null
    }

    const row = this.tiles[y]

    if (!row) return null

    const tile = row[x]

    return tile ?? null
  }

  // Indica si una celda es transitable
  public isWalkable(x: number, y: number): boolean {
    return this.getTile(x, y) === TileType.Floor
  }

  // Devuelve toda la matriz (la usaremos en RenderSystem)
  public getTiles(): TileType[][] {
    return this.tiles
  }
}