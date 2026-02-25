import { GameState } from "./GameState"
import { HealthSystem } from "../systems/HealthSystem"
import { DeathSystem } from "../systems/DeathSystem"
import { MovementSystem } from "../systems/MovementSystem"
import { RenderSystem } from "../systems/RenderSystem"


export class GameEngine {
    private gameState: GameState
    private tickRate: number
    private intervalId: NodeJS.Timeout | null = null
    private healthSystem: HealthSystem = new HealthSystem()
    private deathSystem: DeathSystem = new DeathSystem()
    private movementSystem: MovementSystem = new MovementSystem()
    private renderSystem: RenderSystem = new RenderSystem()


    constructor(gameState: GameState, tickRate: number = 100) {
        this.gameState = gameState
        this.tickRate = tickRate
    }

    public step(): void {
        this.gameState.tick++
        console.log("Tick actual:", this.gameState.tick)

        this.movementSystem.update(this.gameState)
        this.healthSystem.update(this.gameState)
        this.deathSystem.update(this.gameState)
        this.renderSystem.update(this.gameState)
    }

    public start(): void {
        if (this.intervalId) return
        this.intervalId = setInterval(() => {
            this.step()
        }, this.tickRate)
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
    }
}