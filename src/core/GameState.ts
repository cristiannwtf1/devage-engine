import { EntityId } from "../ecs/Entity"

import { PositionComponent, HealthComponent, VelocityComponent } from "../ecs/Components"
import { EnergyStorageComponent, WorkerTagComponent } from "../ecs/Components"

import { BehaviorComponent } from "../ecs/BehaviorComponent"
import { TargetComponent } from "../ecs/TargetComponent"
import { SourceComponent } from "../ecs/SourceComponent"
import { PathComponent } from "../ecs/PathComponent"
import { StructureComponent } from "../ecs/StructureComponent"

import { WorldMap } from "../world/WorldMap"

export class GameState {

  // Contador de tiempo del mundo
  public tick: number = 0 

  // Conjunto de entidades existentes en el mundo
  public entities: Set<EntityId> = new Set()

  // Componentes básicos
  public positions: Map<EntityId, PositionComponent> = new Map()
  public healths: Map<EntityId, HealthComponent> = new Map()
  public velocities: Map<EntityId, VelocityComponent> = new Map()

  // Energía y workers
  public energyStorages: Map<EntityId, EnergyStorageComponent> = new Map()
  public workers: Map<EntityId, WorkerTagComponent> = new Map()

  // Comportamiento
  public behaviors: Map<EntityId, BehaviorComponent> = new Map()
  public paths: Map<EntityId, PathComponent> = new Map()
  public targets: Map<EntityId, TargetComponent> = new Map()

  // Sources
  public sources: Map<EntityId, SourceComponent> = new Map()

  // Estructuras
  public structures: Map<EntityId, StructureComponent> = new Map()

  // Daño pendiente: se llena en combate, se aplica en HealthSystem
  public pendingDamage: Map<EntityId, number> = new Map()

  // 🔥 Referencia oficial a la base principal (jugador)
  public baseId: EntityId | null = null

  // 🤖 IA — base y workers del enemigo
  public aiBaseId:  EntityId | null = null
  public aiWorkers: Set<EntityId>   = new Set()

  // Sources del jugador (no incluye el de la IA)
  public playerSourceIds: Set<EntityId> = new Set()

  // Límite de workers del jugador — varía por misión (M1=3, M2=6, ...)
  public maxPlayerWorkers: number = 3

  // Límite de workers de la IA por misión — escala con dificultad narrativa
  // Satura el source: ~3 workers por source (Screeps-style)
  // M1=3, M2=6, M3=6, M4=6, M5=4, M6=8
  public aiMaxWorkers: number = 3

  // ── Balance por facción ───────────────────────────────────
  // Capacidad de carga del worker — define el estilo de juego:
  //   NEXUS (S1):       10 — ciclos cortos y rápidos (volumen)
  //   Forjadores (S2):  20 — ciclos largos con más energía (eficiencia)
  //   Convergencia (S3):12 — ciclos medios, spawn más barato (escala)
  public workerCapacity: number = 10

  // Costo en energía para spawnear un worker
  //   NEXUS:       20 — estándar
  //   Forjadores:  35 — caro pero doble capacidad
  //   Convergencia:15 — barato para escalar rápido
  public workerSpawnCost: number = 20

  // Script del jugador (JS como string) + último error de ejecución
  public playerScript: string | null = null
  public scriptError:  string | null = null

  // Memoria persistente entre ticks — accesible como Game.memory en el script del jugador
  // Se reinicia solo cuando se llama a resetGame(), no entre ticks
  public playerMemory: Record<string, unknown> = {}

  // Memoria por worker — accesible como w.memory en el script del jugador
  // Persiste entre ticks, se borra cuando el worker muere/desaparece
  public workerMemory: Map<number, Record<string, unknown>> = new Map()

  // say() — mensajes que los workers muestran como burbuja (duran 3 ticks)
  public workerSays: Map<EntityId, { msg: string; until: number }> = new Map()

  // Modo de juego: afecta si hay IA y condición de victoria
  public gameMode: "vs-ia" | "sandbox" | "campaign" = "vs-ia"

  // Condición de victoria: null = en curso, "player" = ganó jugador, "ai" = ganó IA
  public winner: "player" | "ai" | null = null
  public winTick: number = 0

  // Mapa del mundo
  public worldMap: WorldMap

  private nextEntityId: number = 1

  public createEntity(): EntityId {
    return this.nextEntityId++
  }

  constructor(width: number = 40, height: number = 22) {
    this.worldMap = new WorldMap(width, height, true)  // flat=true — mapa determinista para misiones
  }
}