export interface PositionComponent {
  x: number
  y: number
}

export interface HealthComponent {
  current: number
  max: number
}

export interface VelocityComponent {
  vx: number
  vy: number
}

export interface EnergyStorageComponent {
  current: number
  capacity: number
}

export interface WorkerTagComponent {
  isWorker: true
}