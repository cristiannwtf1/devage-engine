import { GameState } from "./GameState"
import { BehaviorSystem } from "../systems/BehaviorSystem"
import { HarvestSystem } from "../systems/HarvestSystem"
import { HealthSystem } from "../systems/HealthSystem"
import { DeathSystem } from "../systems/DeathSystem"
import { RenderSystem } from "../systems/RenderSystem"
import { DepositSystem } from "../systems/DepositSystem"
import { TargetSystem } from "../systems/TargetSystem"
import { MovementSystem } from "../systems/MovementSystem"
import { SourceRegenSystem } from "../systems/SourceRegenSystem"
import { SpawnSystem } from "../systems/SpawnSystem"
import { PathfindingSystem } from "../systems/PathfindingSystem"
import { ConstructionSystem } from "../systems/ConstructionSystem"


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
    private targetSystem: TargetSystem = new TargetSystem()
    private movementSystem: MovementSystem = new MovementSystem()
    private sourceRegenSystem: SourceRegenSystem = new SourceRegenSystem()
    private spawnSystem: SpawnSystem = new SpawnSystem()
    private pathfindingSystem: PathfindingSystem = new PathfindingSystem()
    private constructionSystem = new ConstructionSystem()


    constructor(gameState: GameState, tickRate: number = 100) {
        this.gameState = gameState
        this.tickRate = tickRate
    }

    public step(): void {
        this.gameState.tick++
        console.log("Tick actual:", this.gameState.tick)

        // 1️⃣ Decisiones
        this.behaviorSystem.update(this.gameState)

        // 2️⃣ Asignar objetivos
        this.targetSystem.update(this.gameState)

        // 3️⃣ Trazar rutas
        this.pathfindingSystem.update(this.gameState)

        // 4️⃣ Movimiento hacia objetivo
        this.movementSystem.update(this.gameState)

        // 5️⃣ Interacciones
        this.harvestSystem.update(this.gameState)
        this.depositSystem.update(this.gameState)

        // 6️⃣ Daño y muertes
        this.healthSystem.update(this.gameState)
        this.deathSystem.update(this.gameState)

        // 8️⃣ Spawn y construcción
        this.spawnSystem.update(this.gameState)
        this.constructionSystem.update(this.gameState)

        // 9️⃣ Regeneración
        this.sourceRegenSystem.update(this.gameState)

        // 🔟 Render
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