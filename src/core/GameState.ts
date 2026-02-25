import { EntityId } from "../ecs/Entity"
import { PositionComponent, HealthComponent, VelocityComponent } from "../ecs/Components"

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
}