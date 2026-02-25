"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const HealthSystem_1 = require("../systems/HealthSystem");
const DeathSystem_1 = require("../systems/DeathSystem");
const MovementSystem_1 = require("../systems/MovementSystem");
const RenderSystem_1 = require("../systems/RenderSystem");
class GameEngine {
    constructor(gameState, tickRate = 100) {
        this.intervalId = null;
        this.healthSystem = new HealthSystem_1.HealthSystem();
        this.deathSystem = new DeathSystem_1.DeathSystem();
        this.movementSystem = new MovementSystem_1.MovementSystem();
        this.renderSystem = new RenderSystem_1.RenderSystem();
        this.gameState = gameState;
        this.tickRate = tickRate;
    }
    step() {
        this.gameState.tick++;
        console.log("Tick actual:", this.gameState.tick);
        this.movementSystem.update(this.gameState);
        this.healthSystem.update(this.gameState);
        this.deathSystem.update(this.gameState);
        this.renderSystem.update(this.gameState);
    }
    start() {
        if (this.intervalId)
            return;
        this.intervalId = setInterval(() => {
            this.step();
        }, this.tickRate);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
exports.GameEngine = GameEngine;
//# sourceMappingURL=GameEngine.js.map