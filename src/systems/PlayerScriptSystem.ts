import { GameState } from "../core/GameState"
import { buildGameAPI } from "../api/GameAPI"

export class PlayerScriptSystem {

  public update(gs: GameState): void {
    if (!gs.playerScript) return

    try {
      const Game = buildGameAPI(gs)
      // eslint-disable-next-line no-new-func
      const fn = new Function("Game", gs.playerScript)
      fn(Game)
      gs.scriptError = null
    } catch (err: unknown) {
      gs.scriptError = err instanceof Error ? err.message : String(err)
    }
  }
}
