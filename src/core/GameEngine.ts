import { GameState } from "./GameState"
import { BehaviorSystem } from "../systems/BehaviorSystem"
import { HarvestSystem } from "../systems/HarvestSystem"
import { HealthSystem } from "../systems/HealthSystem"
import { DeathSystem } from "../systems/DeathSystem"
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
    private onTick: (() => void) | null
    private intervalId: NodeJS.Timeout | null = null
    private paused: boolean = false

    private behaviorSystem     = new BehaviorSystem()
    private harvestSystem      = new HarvestSystem()
    private depositSystem      = new DepositSystem()
    private healthSystem       = new HealthSystem()
    private deathSystem        = new DeathSystem()
    private targetSystem       = new TargetSystem()
    private movementSystem     = new MovementSystem()
    private sourceRegenSystem  = new SourceRegenSystem()
    private spawnSystem        = new SpawnSystem()
    private pathfindingSystem  = new PathfindingSystem()
    private constructionSystem = new ConstructionSystem()

    constructor(gameState: GameState, tickRate: number = 200, onTick: (() => void) | null = null) {
        this.gameState = gameState
        this.tickRate  = tickRate
        this.onTick    = onTick
    }

    public step(): void {
        if (this.paused) return

        this.gameState.tick++

        // 1️⃣ Decisiones de comportamiento
        this.behaviorSystem.update(this.gameState)

        // 2️⃣ Asignar objetivos
        this.targetSystem.update(this.gameState)

        // 3️⃣ Trazar rutas
        this.pathfindingSystem.update(this.gameState)

        // 4️⃣ Movimiento
        this.movementSystem.update(this.gameState)

        // 5️⃣ Interacciones
        this.harvestSystem.update(this.gameState)
        this.depositSystem.update(this.gameState)

        // 6️⃣ Daño y muertes
        this.healthSystem.update(this.gameState)
        this.deathSystem.update(this.gameState)

        // 7️⃣ Spawn y construcción
        this.spawnSystem.update(this.gameState)
        this.constructionSystem.update(this.gameState)

        // 8️⃣ Regeneración
        this.sourceRegenSystem.update(this.gameState)

        // 9️⃣ Log de estado cada 20 ticks
        if (this.gameState.tick % 20 === 0) {
          this.logStatus()
        }

        // 🔟 Callback al servidor (broadcast al browser)
        this.onTick?.()
    }

    public start(): void {
        if (this.intervalId) return
        this.intervalId = setInterval(() => this.step(), this.tickRate)
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
    }

    private logStatus(): void {
        const gs = this.gameState
        const baseStorage = gs.baseId ? gs.energyStorages.get(gs.baseId) : null
        const harvesting  = [...gs.behaviors.values()].filter(b => b.state === "harvesting").length
        const returning   = [...gs.behaviors.values()].filter(b => b.state === "returning").length
        const idle        = [...gs.workers.keys()].filter(id => !gs.targets.has(id)).length
        const base        = baseStorage ? `${baseStorage.current}/${baseStorage.capacity}` : "?"
        console.log(
          `[T:${String(gs.tick).padStart(4,"0")}]  ` +
          `Workers: ${gs.workers.size} | ` +
          `cosechando: ${harvesting} | retornando: ${returning} | sin-tarea: ${idle} | ` +
          `Base: ${base}`
        )
    }

    public pause(): void {
        this.paused = true
        console.log("⏸  Juego pausado")
    }

    public resume(): void {
        this.paused = false
        console.log("▶️  Juego reanudado")
    }
}
