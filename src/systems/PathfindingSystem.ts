import { GameState } from "../core/GameState"

export class PathfindingSystem {

  public update(gameState: GameState): void {

    for (const [entityId, target] of gameState.targets) {

      // Si ya tiene path, no recalcular
      if (gameState.paths.has(entityId)) continue

      const position = gameState.positions.get(entityId)
      if (!position) continue

      // Si ya está en el target, no hay nada que calcular
      if (position.x === target.targetX && position.y === target.targetY) continue

      const path = this.bfs(
        gameState,
        position.x,
        position.y,
        target.targetX,
        target.targetY
      )

      if (path && path.length > 0) {
        gameState.paths.set(entityId, { steps: path })
      }
    }
  }

  private bfs(
    gameState: GameState,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
  ): { x: number; y: number }[] | null {

    const queue: { x: number; y: number }[] = []
    const visited = new Set<string>()
    const cameFrom = new Map<string, string>()

    const startKey  = `${startX},${startY}`
    const targetKey = `${targetX},${targetY}`

    queue.push({ x: startX, y: startY })
    visited.add(startKey)

    const directions = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0,  dy: -1 }
    ]

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentKey = `${current.x},${current.y}`

      if (currentKey === targetKey) {
        return this.reconstructPath(cameFrom, startKey, targetKey)
      }

      for (const dir of directions) {
        const newX = current.x + dir.dx
        const newY = current.y + dir.dy
        const newKey = `${newX},${newY}`

        if (visited.has(newKey)) continue
        if (!gameState.worldMap.isWalkable(newX, newY)) continue

        visited.add(newKey)
        cameFrom.set(newKey, currentKey)
        queue.push({ x: newX, y: newY })
      }
    }

    return null
  }

  private reconstructPath(
    cameFrom: Map<string, string>,
    startKey: string,
    targetKey: string
  ): { x: number; y: number }[] {

    const path: { x: number; y: number }[] = []
    let currentKey = targetKey

    while (currentKey !== startKey) {
      const parts = currentKey.split(",")
      const x = Number(parts[0])
      const y = Number(parts[1])
      if (Number.isNaN(x) || Number.isNaN(y)) break
      path.unshift({ x, y })
      const prev = cameFrom.get(currentKey)
      if (!prev) break
      currentKey = prev
    }

    return path
  }
}
