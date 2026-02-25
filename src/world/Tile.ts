// Define los tipos posibles de terreno en el mapa.
// Usamos enum porque más adelante podremos agregar más tipos
// como Resource, Base, Spawn, etc.

export enum TileType {
  Floor = ".",   // Celda transitable
  Wall = "#"     // Celda bloqueada (colisión)
}