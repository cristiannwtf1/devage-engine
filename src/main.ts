import { GameState } from "./core/GameState"
import { GameEngine } from "./core/GameEngine"
import { EntityId } from "./ecs/Entity"

// 1️⃣ Crear el mundo (20x10 por defecto)
const gameState = new GameState(20, 10)

// 2️⃣ Crear entidad 1 (se mueve a la derecha)
const entity1: EntityId = 1
gameState.entities.add(entity1)

gameState.positions.set(entity1, { x: 1, y: 5 })
gameState.healths.set(entity1, { current: 20, max: 100 })
gameState.velocities.set(entity1, { vx: 1, vy: 0 })

// 3️⃣ Crear entidad 2 (se mueve a la izquierda)
const entity2: EntityId = 2
gameState.entities.add(entity2)

gameState.positions.set(entity2, { x: 18, y: 5 })
gameState.healths.set(entity2, { current: 20, max: 100 })
gameState.velocities.set(entity2, { vx: -1, vy: 0 })

console.log("🚀 Iniciando DEVAGE ENGINE...")
console.log("Entidades activas:", gameState.entities.size)

// 4️⃣ Crear motor (más lento para pruebas claras)
const engine = new GameEngine(gameState, 400)

// 5️⃣ Iniciar motor
engine.start()

// 6️⃣ Detener después de 3 segundos (prueba corta)
setTimeout(() => {
  engine.stop()
  console.log("🛑 Motor detenido")
}, 3000)