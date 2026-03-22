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

  // Script del jugador (JS como string) + último error de ejecución
  public playerScript: string | null = null
  public scriptError:  string | null = null

  // Condición de victoria: null = en curso, "player" = ganó jugador, "ai" = ganó IA
  public winner: "player" | "ai" | null = null
  public winTick: number = 0

  // Mapa del mundo
  public worldMap: WorldMap

  private nextEntityId: number = 1

  public createEntity(): EntityId {
    return this.nextEntityId++
  }

  constructor(width: number = 20, height: number = 10) {
    this.worldMap = new WorldMap(width, height)
  }
}