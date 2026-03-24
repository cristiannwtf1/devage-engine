import { GameState } from "../core/GameState"

// Extensions deshabilitadas en M1 — se activan en M2 (como RCL 2 en Screeps)
const MAX_EXTENSIONS = 0

export class ConstructionSystem {

  // Costo escala con cada extension construida
  private baseCost = 50
  private costPerLevel = 50

  public update(gameState: GameState): void {

    const baseId = gameState.baseId
    if (baseId === null) return

    const baseEnergy = gameState.energyStorages.get(baseId)
    const basePosition = gameState.positions.get(baseId)
    if (!baseEnergy || !basePosition) return

    // Contar extensiones actuales
    const extensionCount = [...gameState.structures.values()]
      .filter(s => s.type === "extension").length

    if (extensionCount >= MAX_EXTENSIONS) return

    const cost = this.baseCost + extensionCount * this.costPerLevel
    if (baseEnergy.current < cost) return

    const newId = gameState.createEntity()
    gameState.entities.add(newId)

    // Posicionar en espiral alrededor de la base
    const offset = this.getOffset(extensionCount)
    gameState.positions.set(newId, {
      x: basePosition.x + offset.x,
      y: basePosition.y + offset.y
    })

    gameState.structures.set(newId, { type: "extension" })

    // Las extensiones no modifican la meta de victoria (capacity de base permanece igual)
    // Solo cuestan energía — son nodos de almacenamiento independientes
    baseEnergy.current -= cost

    console.log(`🏗 Extension #${extensionCount + 1} construida! Costo: ${cost}`)
  }

  private getOffset(index: number): { x: number; y: number } {
    const offsets = [
      { x: 1, y: 1 }, { x: -1, y: 1 },
      { x: 1, y: -1 }, { x: -1, y: -1 },
      { x: 2, y: 0 }
    ]
    return offsets[index] ?? { x: index, y: 0 }
  }
}