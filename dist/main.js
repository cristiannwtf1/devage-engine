"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameState_1 = require("./core/GameState");
const GameEngine_1 = require("./core/GameEngine");
// 1️⃣ Crear el mundo
const gameState = new GameState_1.GameState();
// 2️⃣ Crear una entidad
const entityId = 1;
// Registrar la entidad en el mundo
gameState.entities.add(entityId);
// Asignarle componentes
gameState.positions.set(entityId, { x: 10, y: 5 });
gameState.healths.set(entityId, { current: 20, max: 100 });
gameState.positions.set(entityId, { x: 1, y: 5 });
gameState.velocities.set(entityId, { vx: 1, vy: 0 });
// Crear una segunda entidad de prueba
const entity2 = 2;
gameState.entities.add(entity2);
gameState.positions.set(entity2, { x: 18, y: 5 });
gameState.healths.set(entity2, { current: 20, max: 100 });
gameState.velocities.set(entity2, { vx: -1, vy: 0 });
console.log("Entidad creada:", entityId);
console.log("Posición:", gameState.positions.get(entityId));
console.log("Salud:", gameState.healths.get(entityId));
// 3️⃣ Crear el motor
const engine = new GameEngine_1.GameEngine(gameState, 200);
// 4️⃣ Iniciar motor
engine.start();
// Detener después de 5 segundos
setTimeout(() => {
    engine.stop();
    console.log("Motor detenido");
}, 5000);
//# sourceMappingURL=main.js.map