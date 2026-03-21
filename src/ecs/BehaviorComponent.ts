export type WorkerState = "harvesting" | "returning"

export interface BehaviorComponent {
  state: WorkerState
}