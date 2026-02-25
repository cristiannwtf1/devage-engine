"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderSystem = void 0;
class RenderSystem {
    constructor() {
        this.width = 20;
        this.height = 10;
    }
    update(gameState) {
        // Limpiar consola en cada tick
        console.clear();
        console.log("========== DEVAGE ENGINE ==========");
        console.log("Tick:", gameState.tick);
        console.log("");
        // Crear grid vacío
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push(".");
            }
            grid.push(row);
        }
        // Dibujar entidades
        for (const [entityId, position] of gameState.positions) {
            if (position.x >= 0 &&
                position.x < this.width &&
                position.y >= 0 &&
                position.y < this.height) {
                const row = grid[position.y];
                if (row) {
                    row[position.x] = "E";
                }
            }
        }
        // Imprimir grid
        for (const row of grid) {
            console.log(row.join(" "));
        }
        console.log("");
        console.log("Entidades activas:", gameState.entities.size);
    }
}
exports.RenderSystem = RenderSystem;
//# sourceMappingURL=RenderSystem.js.map