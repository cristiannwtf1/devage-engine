import { GameState } from "./GameState";
export declare class GameEngine {
    private gameState;
    private tickRate;
    private intervalId;
    private healthSystem;
    private deathSystem;
    private movementSystem;
    private renderSystem;
    constructor(gameState: GameState, tickRate?: number);
    step(): void;
    start(): void;
    stop(): void;
}
//# sourceMappingURL=GameEngine.d.ts.map