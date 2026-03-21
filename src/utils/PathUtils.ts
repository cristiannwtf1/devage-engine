import { GameState } from "../core/GameState"

export function computePathLength(
  gameState: GameState,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number
): number | null {

  const queue: { x: number, y: number, dist: number }[] = []
  const visited = new Set<string>()

  queue.push({ x: startX, y: startY, dist: 0 })
  visited.add(`${startX},${startY}`)

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ]

  while (queue.length > 0) {

    const current = queue.shift()!

    if (current.x === targetX && current.y === targetY) {
      return current.dist
    }

    for (const dir of directions) {

      const newX = current.x + dir.dx
      const newY = current.y + dir.dy
      const key = `${newX},${newY}`

      if (visited.has(key)) continue
      if (!gameState.worldMap.isWalkable(newX, newY)) continue

      visited.add(key)
      queue.push({
        x: newX,
        y: newY,
        dist: current.dist + 1
      })
    }
  }

  return null
}