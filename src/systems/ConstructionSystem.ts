import { GameState } from "../core/GameState"

export class ConstructionSystem {

  private extensionCost = 50
  private built = false

  public update(gameState: GameState): void {

    if (this.built) return

    const baseId = 100
    const baseEnergy = gameState.energyStorages.get(baseId)
    const basePosition = gameState.positions.get(baseId)

    if (!baseEnergy || !basePosition) return

    if (baseEnergy.current < this.extensionCost) return

    const newId = gameState.createEntity()
    gameState.entities.add(newId)

    gameState.positions.set(newId, {
      x: basePosition.x + 1,
      y: basePosition.y + 1
    })

    gameState.structures.set(newId, {
      type: "extension"
    })

    baseEnergy.current -= this.extensionCost

    console.log("🏗 Extension construida!")

    this.built = true
  }
}