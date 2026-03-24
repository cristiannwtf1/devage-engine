export type WorkerState = "idle" | "harvesting" | "returning"

export interface BehaviorComponent {
  state: WorkerState
}