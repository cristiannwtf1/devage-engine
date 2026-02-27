import { GameState } from "../core/GameState"
import { EntityId } from "../ecs/Entity"

export class SpawnSystem {

  private nextEntityId: number = 1000
  private spawnCost: number = 20

  public update(gameState: GameState): void {

    const baseId: EntityId = 100
    const baseStorage = gameState.energyStorages.get(baseId)
    const basePosition = gameState.positions.get(baseId)

    if (!baseStorage || !basePosition) return

    // Si no hay suficiente energía, no spawnear
    if (baseStorage.current < this.spawnCost) return

    // Crear nuevo worker
    const newWorkerId: EntityId = this.nextEntityId++
    gameState.entities.add(newWorkerId)

    // Posición al lado de la base
    gameState.positions.set(newWorkerId, {
      x: basePosition.x + 1,
      y: basePosition.y
    })

    gameState.healths.set(newWorkerId, { current: 20, max: 100 })
    gameState.workers.set(newWorkerId, { isWorker: true })
    gameState.energyStorages.set(newWorkerId, { current: 0, capacity: 10 })
    gameState.behaviors.set(newWorkerId, { state: "harvesting" })

    baseStorage.current -= this.spawnCost

    console.log("🆕 Nuevo worker creado:", newWorkerId)
  }
}