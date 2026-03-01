import { GameState } from "./core/GameState"
import { GameEngine } from "./core/GameEngine"
import { EntityId } from "./ecs/Entity"
import { TileType } from "./world/Tile"

// 1️⃣ Crear el mundo
const gameState = new GameState(20, 10)

//
// ⚡ MIGRAR ENERGÍA DEL MAPA A SOURCES (ECS)
//


for (let y = 0; y < gameState.worldMap.height; y++) {
  for (let x = 0; x < gameState.worldMap.width; x++) {

    if (gameState.worldMap.getTile(x, y) === TileType.Energy) {

      const sourceId: EntityId = gameState.createEntity()
      gameState.entities.add(sourceId)

      // Posición del source
      gameState.positions.set(sourceId, { x, y })

      // Componente Source regenerable
      gameState.sources.set(sourceId, {
        energy: 10,
        maxEnergy: 10,
        regenRate: 1,
        regenCooldown: 5,
        currentCooldown: 0
      })

      // Limpiar tile del mapa
      gameState.worldMap.setTile(x, y, TileType.Floor)
    }
  }
}

console.log("⚡ Sources creados:", gameState.sources.size)

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
const engine = new GameEngine(gameState, 200)
engine.start()

setTimeout(() => {
  engine.stop()
  console.log("🛑 Motor detenido")
}, 60000)