import { EntityId } from "./Entity"

export interface SourceClaimComponent {
  maxClaimers: number
  currentClaimers: Set<EntityId>
}