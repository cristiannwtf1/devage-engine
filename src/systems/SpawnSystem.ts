import { GameState } from "../core/GameState"
import { EntityId } from "../ecs/Entity"

export class SpawnSystem {

  private nextEntityId: number = 1000
  private spawnCost: number = 20

  // 🧠 Balance variables
  private spawnCooldown: number = 0
  private spawnDelay: number = 5
  private maxWorkers: number = 8

  public update(gameState: GameState): void {

    const baseId: EntityId = 100
    const baseStorage = gameState.energyStorages.get(baseId)
    const basePosition = gameState.positions.get(baseId)

    if (!baseStorage || !basePosition) return

    // ⏳ Cooldown activo
    if (this.spawnCooldown > 0) {
      this.spawnCooldown--
      return
    }

    // 👥 Límite de población
    const workerCount = gameState.workers.size
    if (workerCount >= this.maxWorkers) return

    // 💰 Energía insuficiente
    if (baseStorage.current < this.spawnCost) return

    // 🚀 Crear nuevo worker
    const newWorkerId: EntityId = this.nextEntityId++
    gameState.entities.add(newWorkerId)

    gameState.positions.set(newWorkerId, {
      x: basePosition.x + 1,
      y: basePosition.y
    })

    gameState.healths.set(newWorkerId, { current: 20, max: 100 })
    gameState.workers.set(newWorkerId, { isWorker: true })
    gameState.energyStorages.set(newWorkerId, { current: 0, capacity: 10 })
    gameState.behaviors.set(newWorkerId, { state: "harvesting" })

    baseStorage.current -= this.spawnCost

    // ⏳ Activar cooldown
    this.spawnCooldown = this.spawnDelay

    console.log("🆕 Nuevo worker creado:", newWorkerId)
  }
}