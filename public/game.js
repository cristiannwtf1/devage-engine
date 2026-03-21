// ─── CONEXIÓN WEBSOCKET ───────────────────────────────────
const ws = new WebSocket(`ws://${location.host}`)
const statusBar = document.getElementById("status-bar")
let paused = false
let lastSnapshot = null

ws.onopen = () => {
  statusBar.textContent = "✅ Conectado al engine"
  statusBar.className = "connected"
}

ws.onclose = () => {
  statusBar.textContent = "❌ Desconectado del engine"
  statusBar.className = "disconnected"
}

ws.onmessage = (event) => {
  lastSnapshot = JSON.parse(event.data)
  render(lastSnapshot)
  updatePanel(lastSnapshot)
}

// ─── PAUSA ────────────────────────────────────────────────
const btnPause = document.getElementById("btn-pause")
btnPause.addEventListener("click", () => {
  paused = !paused
  ws.send(JSON.stringify({ action: paused ? "pause" : "resume" }))
  btnPause.textContent = paused ? "▶️ Reanudar" : "⏸ Pausar"
  btnPause.classList.toggle("active", paused)
})

// ─── CANVAS SETUP ─────────────────────────────────────────
const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")
const CELL = 24   // tamaño de cada celda en píxeles

// Colores del mapa
const COLORS = {
  wall:      "#0d0d0d",
  floor:     "#141420",
  base:      "#1a3a5a",
  worker:    "#1a4a1a",
  source:    "#3a2e00",
  extension: "#2a1a4a",
  unknown:   "#1a1a2a"
}

// Colores de borde/detalle
const BORDER = {
  wall:      "#050508",
  floor:     "#1a1a28",
  base:      "#3a5a8a",
  worker:    "#4a8a4a",
  source:    "#8a7a00",
  extension: "#6a3aaa",
  unknown:   "#2a2a3a"
}

// ─── RENDER PRINCIPAL ─────────────────────────────────────
function render(snapshot) {
  const { mapWidth, mapHeight, tiles, entities } = snapshot

  canvas.width  = mapWidth  * CELL
  canvas.height = mapHeight * CELL

  // 1. Dibujar tiles del mapa
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = tiles[y][x]
      drawCell(x, y, tile === "#" ? "wall" : "floor")
    }
  }

  // 2. Construir mapa de entidades por posición
  const entityMap = {}
  for (const e of entities) {
    entityMap[`${e.x},${e.y}`] = e
  }

  // 3. Dibujar entidades (en orden: sources → extensiones → base → workers)
  const drawOrder = ["source", "extension", "base", "worker"]
  for (const type of drawOrder) {
    for (const e of entities) {
      if (e.type !== type) continue
      drawEntity(e)
    }
  }

  // 4. Tick counter
  document.getElementById("tick").textContent = snapshot.tick
}

// ─── DIBUJAR CELDA BASE (TILE) ────────────────────────────
function drawCell(x, y, type) {
  const px = x * CELL
  const py = y * CELL

  ctx.fillStyle = COLORS[type] || COLORS.floor
  ctx.fillRect(px, py, CELL, CELL)

  // Línea de grid muy sutil
  ctx.strokeStyle = BORDER[type] || BORDER.floor
  ctx.lineWidth = 0.5
  ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1)
}

// ─── DIBUJAR ENTIDAD ──────────────────────────────────────
function drawEntity(e) {
  const px = e.x * CELL
  const py = e.y * CELL
  const type = e.type

  // Fondo de la celda
  ctx.fillStyle = COLORS[type] || COLORS.unknown
  ctx.fillRect(px, py, CELL, CELL)

  // Borde de color según tipo
  ctx.strokeStyle = BORDER[type] || BORDER.unknown
  ctx.lineWidth = 1.5
  ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2)

  // Icono central
  ctx.font = `${CELL * 0.55}px Courier New`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const icons = {
    base:      "🏠",
    worker:    "W",
    source:    "⚡",
    extension: "E"
  }

  if (type === "worker" || type === "extension") {
    ctx.fillStyle = type === "worker" ? "#4a9a4a" : "#8a5add"
    ctx.fillText(icons[type], px + CELL / 2, py + CELL / 2 + 1)
  } else {
    ctx.font = `${CELL * 0.6}px serif`
    ctx.fillText(icons[type] || "?", px + CELL / 2, py + CELL / 2 + 1)
  }

  // Barra de energía para workers
  if (type === "worker" && e.energy) {
    const pct = e.energy.current / e.energy.capacity
    const barW = CELL - 4
    ctx.fillStyle = "#1a2a1a"
    ctx.fillRect(px + 2, py + CELL - 5, barW, 3)
    ctx.fillStyle = "#3a8a3a"
    ctx.fillRect(px + 2, py + CELL - 5, barW * pct, 3)
  }

  // Barra de energía para sources
  if (type === "source" && e.source) {
    const pct = e.source.energy / e.source.max
    const barW = CELL - 4
    ctx.fillStyle = "#2a2000"
    ctx.fillRect(px + 2, py + CELL - 5, barW, 3)
    ctx.fillStyle = "#aa8800"
    ctx.fillRect(px + 2, py + CELL - 5, barW * pct, 3)
  }
}

// ─── PANEL LATERAL ────────────────────────────────────────
function updatePanel(snapshot) {
  // Base
  if (snapshot.base) {
    const pct = (snapshot.base.energy / snapshot.base.capacity * 100).toFixed(0)
    document.getElementById("base-energy").textContent =
      `${snapshot.base.energy} / ${snapshot.base.capacity}`
    document.getElementById("base-energy-bar").style.width = `${pct}%`
  }

  document.getElementById("worker-count").textContent = snapshot.workerCount
  document.getElementById("ext-count").textContent = snapshot.extensions

  // Workers
  const list = document.getElementById("worker-list")
  list.innerHTML = ""
  const workers = snapshot.entities.filter(e => e.type === "worker")

  for (const w of workers) {
    const div = document.createElement("div")
    div.className = "worker-entry"
    const energyPct = w.energy ? `${w.energy.current}/${w.energy.capacity}` : "—"
    div.innerHTML = `
      <div class="wid">W#${w.id} (${w.x},${w.y})</div>
      <div class="wstate">▶ ${w.state ?? "?"}</div>
      <div class="wenergy">⚡ ${energyPct}</div>
    `
    list.appendChild(div)
  }
}
