"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthSystem = void 0;
class HealthSystem {
    update(gameState) {
        for (const [entityId, health] of gameState.healths) {
            health.current -= 1;
            console.log("Entidad", entityId, "vida actual:", health.current);
        }
    }
}
exports.HealthSystem = HealthSystem;
//# sourceMappingURL=HealthSystem.js.map