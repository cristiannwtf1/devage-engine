"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeathSystem = void 0;
class DeathSystem {
    update(gameState) {
        const entitiesToRemove = [];
        for (const [entityId, health] of gameState.healths) {
            if (health.current <= 0) {
                entitiesToRemove.push(entityId);
            }
        }
        for (const entityId of entitiesToRemove) {
            console.log("Entidad", entityId, "ha muerto");
            gameState.entities.delete(entityId);
            gameState.positions.delete(entityId);
            gameState.healths.delete(entityId);
        }
    }
}
exports.DeathSystem = DeathSystem;
//# sourceMappingURL=DeathSystem.js.map