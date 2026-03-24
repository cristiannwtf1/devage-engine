import { GameState } from "../core/GameState"

export class BehaviorSystem {

  public update(gameState: GameState): void {

    for (const [id, behavior] of gameState.behaviors) {

      const storage = gameState.energyStorages.get(id)
      if (!storage) continue

      // "idle" — worker espera código del jugador, no se auto-transiciona
      if (behavior.state === "idle") continue

      if (behavior.state === "harvesting" && storage.current >= storage.capacity) {
        behavior.state = "returning"
        gameState.targets.delete(id)
        gameState.paths.delete(id)

      } else if (behavior.state === "returning" && storage.current === 0) {
        // Solo AI vuelve a "harvesting" automáticamente
        // Los workers del jugador van a "idle" para que el código los reasigne
        const nextState = gameState.aiWorkers.has(id) ? "harvesting" : "idle"
        behavior.state = nextState
        gameState.targets.delete(id)
        gameState.paths.delete(id)
      }
    }
  }
}
