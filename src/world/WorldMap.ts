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
    this.tiles = []

    for (let y = 0; y < this.height; y++) {

      const row: TileType[] = []

      for (let x = 0; x < this.width; x++) {

        // Bordes siempre pared
        if (
          x === 0 ||
          y === 0 ||
          x === this.width - 1 ||
          y === this.height - 1
        ) {
          row.push(TileType.Wall)
        } else {

          const random = Math.random()

          // 10% muro interno
          if (random < 0.10) {
            row.push(TileType.Wall)

          // 5% energía
          } else if (random < 0.15) {
            row.push(TileType.Energy)

          } else {
            row.push(TileType.Floor)
          }
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

  public setTile(x: number, y: number, tile: TileType): void {

    if (
      x < 0 ||
      y < 0 ||
      x >= this.width ||
      y >= this.height
    ) {
      return
    }

    const row = this.tiles[y]
    if (!row) return

    row[x] = tile
  }

  // Indica si una celda es transitable
  public isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y)
    return tile === TileType.Floor || tile === TileType.Energy
  }

  // Devuelve toda la matriz (la usaremos en RenderSystem)
  public getTiles(): TileType[][] {
    return this.tiles
  }

  // Busca el tile de energía más cercano a las coordenadas dadas usando distancia Manhattan
  public findNearestEnergy(fromX: number, fromY: number): { x: number; y: number } | null {

    let closest: { x: number; y: number } | null = null
    let minDistance = Infinity

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {

        if (this.getTile(x, y) === TileType.Energy) {

          const distance = Math.abs(x - fromX) + Math.abs(y - fromY)

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