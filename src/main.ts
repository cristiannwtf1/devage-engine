import { GameState } from "./core/GameState"
import { GameEngine } from "./core/GameEngine"
import { EntityId } from "./ecs/Entity"

// 1️⃣ Crear el mundo
const gameState = new GameState(20, 10)

//
// 🏠 CREAR BASE
//
const baseId: EntityId = 100
gameState.entities.add(baseId)

gameState.positions.set(baseId, { x: 10, y: 2 })
gameState.energyStorages.set(baseId, { current: 0, capacity: 1000 })

//
//  CREAR WORKER 1
//
const worker1: EntityId = 1
gameState.entities.add(worker1)

gameState.positions.set(worker1, { x: 1, y: 5 })
gameState.healths.set(worker1, { current: 20, max: 100 })
gameState.workers.set(worker1, { isWorker: true })
gameState.energyStorages.set(worker1, { current: 0, capacity: 10 })
gameState.behaviors.set(worker1, { state: "harvesting" })

//
//  CREAR WORKER 2
//
const worker2: EntityId = 2
gameState.entities.add(worker2)

gameState.positions.set(worker2, { x: 18, y: 5 })
gameState.healths.set(worker2, { current: 20, max: 100 })
gameState.workers.set(worker2, { isWorker: true })
gameState.energyStorages.set(worker2, { current: 0, capacity: 10 })
gameState.behaviors.set(worker2, { state: "harvesting" })

console.log("🚀 Iniciando DEVAGE ENGINE...")
console.log("Entidades activas:", gameState.entities.size)

//
//  Motor
//
const engine = new GameEngine(gameState, 400)
engine.start()

setTimeout(() => {
  engine.stop()
  console.log("🛑 Motor detenido")
}, 15000)