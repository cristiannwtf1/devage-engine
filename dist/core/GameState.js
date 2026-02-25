"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = void 0;
class GameState {
    constructor() {
        // Contador de tiempo del mundo
        this.tick = 0;
        // Conjunto de entidades existentes en el mundo
        this.entities = new Set();
        // Mapa que guarda posiciones
        // Clave: EntityId
        // Valor: PositionComponent
        this.positions = new Map();
        // Mapa que guarda salud
        this.healths = new Map();
        this.velocities = new Map();
    }
}
exports.GameState = GameState;
//# sourceMappingURL=GameState.js.map