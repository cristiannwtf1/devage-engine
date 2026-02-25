import { EntityId } from "../ecs/Entity";
import { PositionComponent, HealthComponent, VelocityComponent } from "../ecs/Components";
export declare class GameState {
    tick: number;
    entities: Set<EntityId>;
    positions: Map<EntityId, PositionComponent>;
    healths: Map<EntityId, HealthComponent>;
    velocities: Map<EntityId, VelocityComponent>;
}
//# sourceMappingURL=GameState.d.ts.map