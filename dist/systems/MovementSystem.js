"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementSystem = void 0;
class MovementSystem {
    update(gameState) {
        for (const [entityId, position] of gameState.positions) {
            const velocity = gameState.velocities.get(entityId);
            if (!velocity)
                continue;
            position.x += velocity.vx;
            position.y += velocity.vy;
            console.log("Entidad", entityId, "nueva posición:", position.x, position.y);
        }
    }
}
exports.MovementSystem = MovementSystem;
//# sourceMappingURL=MovementSystem.js.map