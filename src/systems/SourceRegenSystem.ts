import { GameState } from "../core/GameState"

export class SourceRegenSystem {

  public update(gameState: GameState): void {

    for (const source of gameState.sources.values()) {

      if (source.energy >= source.maxEnergy) continue

      if (source.currentCooldown > 0) {
        source.currentCooldown--
        continue
      }

      source.energy += source.regenRate

      if (source.energy > source.maxEnergy) {
        source.energy = source.maxEnergy
      }
    }
  }
}