import { EntityId } from "../ecs/Entity"
import { PositionComponent, HealthComponent, VelocityComponent } from "../ecs/Components"
import { WorldMap } from "../world/WorldMap"
import { EnergyStorageComponent, WorkerTagComponent } from "../ecs/Components"
import { BehaviorComponent } from "../ecs/BehaviorComponent"
import { TargetComponent } from "../ecs/TargetComponent"
import { SourceComponent } from "../ecs/SourceComponent"
import { PathComponent } from "../ecs/PathComponent"


export class GameState {

  // Contador de tiempo del mundo
  public tick: number = 0 

  // Conjunto de entidades existentes en el mundo
  public entities: Set<EntityId> = new Set()

  // Mapa que guarda posiciones
  // Clave: EntityId
  // Valor: PositionComponent
  public positions: Map<EntityId, PositionComponent> = new Map()

  // Mapa que guarda salud
  public healths: Map<EntityId, HealthComponent> = new Map()

  public velocities: Map<EntityId, VelocityComponent> = new Map()

  // Mapas para energía y trabajadores
  public energyStorages: Map<EntityId, EnergyStorageComponent> = new Map()

  public workers: Map<EntityId, WorkerTagComponent> = new Map()

  // Mapa para comportamientos de trabajadores
  public behaviors: Map<EntityId, BehaviorComponent> = new Map()

  // Mapa para rutas de trabajadores
  public paths: Map<EntityId, PathComponent> = new Map()

  // Mapa para objetivos de trabajadores
  public targets: Map<EntityId, TargetComponent> = new Map()

  // Fuentes de energía regenerables
  public sources: Map<EntityId, SourceComponent> = new Map()

  // Mapa del mundo (tiles)
  public worldMap: WorldMap

  private nextEntityId: number = 1;

  public createEntity(): EntityId {
    return this.nextEntityId++;
  }

  constructor(width: number = 20, height: number = 10) {
    this.worldMap = new WorldMap(width, height)
  }
}
