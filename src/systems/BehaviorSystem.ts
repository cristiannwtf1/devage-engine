import { GameState } from "../core/GameState"

export class BehaviorSystem {

  public update(gameState: GameState): void {

    for (const [id, behavior] of gameState.behaviors) {

      const storage = gameState.energyStorages.get(id)
      if (!storage) continue

      if (behavior.state === "harvesting") {

        if (storage.current >= storage.capacity) {
          behavior.state = "returning"
          gameState.targets.delete(id);
          gameState.paths.delete(id);
        }

      } else if (behavior.state === "returning") {

        if (storage.current === 0) {
          behavior.state = "harvesting"
          gameState.targets.delete(id);
          gameState.paths.delete(id);
        }
      }
    }
  }
}