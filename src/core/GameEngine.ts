import { GameState } from "./GameState"
import { BehaviorSystem } from "../systems/BehaviorSystem"
import { HarvestSystem } from "../systems/HarvestSystem"
import { HealthSystem } from "../systems/HealthSystem"
import { DeathSystem } from "../systems/DeathSystem"
import { RenderSystem } from "../systems/RenderSystem"
import { DepositSystem } from "../systems/DepositSystem"

export class GameEngine {
    private gameState: GameState
    private tickRate: number
    private intervalId: NodeJS.Timeout | null = null
    private behaviorSystem: BehaviorSystem = new BehaviorSystem()
    private harvestSystem: HarvestSystem = new HarvestSystem()
    private depositSystem: DepositSystem = new DepositSystem()
    private healthSystem: HealthSystem = new HealthSystem()
    private deathSystem: DeathSystem = new DeathSystem()
    private renderSystem: RenderSystem = new RenderSystem()


    constructor(gameState: GameState, tickRate: number = 100) {
        this.gameState = gameState
        this.tickRate = tickRate
    }

    public step(): void {
        this.gameState.tick++
        console.log("Tick actual:", this.gameState.tick)

        // 1️⃣ Decisiones
        this.behaviorSystem.update(this.gameState)

        // 2️⃣ Recolección
        this.harvestSystem.update(this.gameState)

        // 3️⃣ Depósito
        this.depositSystem.update(this.gameState)

        // 4️⃣ Sistemas secundarios
    //    this.healthSystem.update(this.gameState)
      //  this.deathSystem.update(this.gameState)

        // 5️⃣ Render final
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