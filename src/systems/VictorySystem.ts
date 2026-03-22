import { GameState } from "../core/GameState"

// Gana quien llene su base al 100% primero
export class VictorySystem {

  public update(gs: GameState): void {
    if (gs.winner !== null) return   // ya hay ganador, no revisar más

    const playerStorage = gs.baseId   ? gs.energyStorages.get(gs.baseId)   : null
    const aiStorage     = gs.aiBaseId ? gs.energyStorages.get(gs.aiBaseId) : null

    if (playerStorage && playerStorage.current >= playerStorage.capacity) {
      gs.winner  = "player"
      gs.winTick = gs.tick
      console.log(`🏆 ¡VICTORIA del jugador en tick ${gs.tick}!`)
    } else if (aiStorage && aiStorage.current >= aiStorage.capacity) {
      gs.winner  = "ai"
      gs.winTick = gs.tick
      console.log(`💀 IA ganó en tick ${gs.tick}`)
    }
  }
}
