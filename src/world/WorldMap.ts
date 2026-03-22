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
    // ── Paso 1: ruido inicial (38% muros internos) ────────
    this.tiles = []
    for (let y = 0; y < this.height; y++) {
      const row: TileType[] = []
      for (let x = 0; x < this.width; x++) {
        if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
          row.push(TileType.Wall)
        } else {
          row.push(Math.random() < 0.38 ? TileType.Wall : TileType.Floor)
        }
      }
      this.tiles.push(row)
    }

    // ── Paso 2: autómata celular — 3 iteraciones ─────────
    // Regla: si ≥5 vecinos son muro → muro, si no → suelo
    // Resultado: muros orgánicos tipo cueva (estilo Screeps)
    for (let step = 0; step < 5; step++) {
      const next: TileType[][] = this.tiles.map(row => [...row])
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          const walls = this.countWallNeighbors(x, y)
          next[y]![x] = walls >= 5 ? TileType.Wall : TileType.Floor
        }
      }
      this.tiles = next
    }
  }

  private countWallNeighbors(x: number, y: number): number {
    let count = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) {
          count++
        } else if (this.tiles[ny]?.[nx] === TileType.Wall) {
          count++
        }
      }
    }
    return count
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