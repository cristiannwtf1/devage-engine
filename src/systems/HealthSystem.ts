import { GameState } from "../core/GameState"

// HealthSystem aplica daño acumulado en gameState.pendingDamage
// No drena HP automáticamente — el daño lo generan sistemas de combate
export class HealthSystem {

  public update(gameState: GameState): void {

    for (const [entityId, damage] of gameState.pendingDamage) {
      const health = gameState.healths.get(entityId)
      if (!health) continue
      health.current = Math.max(0, health.current - damage)
    }

    gameState.pendingDamage.clear()
  }
}