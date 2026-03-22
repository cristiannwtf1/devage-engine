// ═══════════════════════════════════════════════════════════
//  DEVAGE ENGINE — Visual v2 "La Red de Neones"
//  60fps con interpolación entre ticks, glow, rutas animadas
// ═══════════════════════════════════════════════════════════

const CELL    = 26
const TICK_MS = 300   // debe coincidir con tickRate del servidor

// ─── ESTADO DE ANIMACIÓN ──────────────────────────────────
let currSnapshot  = null
let prevEntities  = {}   // id → entity del tick anterior
let lastTickTime  = 0
let animFrame     = 0
let canvasSized   = false

// ─── WEBSOCKET ────────────────────────────────────────────
const ws        = new WebSocket(`ws://${location.host}`)
const statusBar = document.getElementById("status-bar")
let paused = false

ws.onopen  = () => { statusBar.textContent = "◉ CONECTADO"; statusBar.className = "connected" }
ws.onclose = () => { statusBar.textContent = "◌ DESCONECTADO"; statusBar.className = "disconnected" }

ws.onmessage = (event) => {
  const snap = JSON.parse(event.data)
  if (currSnapshot) {
    prevEntities = {}
    for (const e of currSnapshot.entities) prevEntities[e.id] = e
  }
  currSnapshot = snap
  lastTickTime  = performance.now()
  updatePanel(snap)
  updateScriptError(snap.scriptError)
}

// ─── PAUSA ────────────────────────────────────────────────
const btnPause = document.getElementById("btn-pause")
btnPause.addEventListener("click", () => {
  paused = !paused
  ws.send(JSON.stringify({ action: paused ? "pause" : "resume" }))
  btnPause.textContent = paused ? "▶ Reanudar" : "⏸ Pausar"
  btnPause.classList.toggle("active", paused)
})

// ─── CANVAS ───────────────────────────────────────────────
const canvas = document.getElementById("gameCanvas")
const ctx    = canvas.getContext("2d")

// ─── LOOP PRINCIPAL 60FPS ─────────────────────────────────
function loop() {
  if (currSnapshot) renderFrame()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

function lerp(a, b, t) { return a + (b - a) * t }

function renderFrame() {
  const snap = currSnapshot
  const { mapWidth, mapHeight, tiles, entities } = snap

  // Redimensionar canvas solo cuando cambia el mapa
  if (!canvasSized || canvas.width !== mapWidth * CELL) {
    canvas.width  = mapWidth  * CELL
    canvas.height = mapHeight * CELL
    canvasSized   = true
  }

  const t = Math.min(1, (performance.now() - lastTickTime) / TICK_MS)

  // 1. Tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      drawTile(x, y, tiles[y][x] === "#" ? "wall" : "floor")
    }
  }

  // 2. Scan lines
  drawScanLines()

  // 3. Rutas (debajo de entidades)
  for (const e of entities) {
    if (e.targetX !== undefined && (e.type === "worker" || e.type === "ai-worker")) {
      const prev = prevEntities[e.id]
      const ix   = prev ? lerp(prev.x, e.x, t) : e.x
      const iy   = prev ? lerp(prev.y, e.y, t) : e.y
      drawPath(ix, iy, e.targetX, e.targetY, e.type === "ai-worker")
    }
  }

  // 4. Entidades con interpolación
  const drawOrder = ["source", "extension", "ai-extension", "ai-base", "base", "ai-worker", "worker"]
  for (const type of drawOrder) {
    for (const e of entities) {
      if (e.type !== type) continue
      const prev = prevEntities[e.id]
      const ix   = prev ? lerp(prev.x, e.x, t) : e.x
      const iy   = prev ? lerp(prev.y, e.y, t) : e.y
      drawEntity({ ...e, ix, iy })
    }
  }

  // 5. Viñeta sutil
  drawVignette()

  document.getElementById("tick").textContent = snap.tick
  animFrame++
}

// ─── TILE ─────────────────────────────────────────────────
function drawTile(x, y, type) {
  const px = x * CELL, py = y * CELL
  ctx.shadowBlur = 0
  if (type === "wall") {
    ctx.fillStyle = "#040406"
    ctx.fillRect(px, py, CELL, CELL)
    ctx.strokeStyle = "#080810"
    ctx.lineWidth = 0.5
    ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1)
  } else {
    ctx.fillStyle = "#09090f"
    ctx.fillRect(px, py, CELL, CELL)
    ctx.strokeStyle = "#0f0f1e"
    ctx.lineWidth = 0.5
    ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1)
  }
}

// ─── SCAN LINES ───────────────────────────────────────────
function drawScanLines() {
  ctx.shadowBlur = 0
  ctx.fillStyle = "rgba(0,0,8,0.18)"
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1)
  }
}

// ─── VIÑETA ───────────────────────────────────────────────
function drawVignette() {
  ctx.shadowBlur = 0
  const grad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.25,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.85
  )
  grad.addColorStop(0, "transparent")
  grad.addColorStop(1, "rgba(0,0,4,0.45)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

// ─── RUTAS ────────────────────────────────────────────────
function drawPath(ix, iy, tx, ty, isAI) {
  if (Math.abs(ix - tx) + Math.abs(iy - ty) < 0.5) return
  const sx = (ix + 0.5) * CELL, sy = (iy + 0.5) * CELL
  const ex = (tx + 0.5) * CELL, ey = (ty + 0.5) * CELL

  ctx.save()
  ctx.shadowBlur = 0
  ctx.strokeStyle = isAI ? "rgba(255,100,0,0.22)" : "rgba(0,255,160,0.22)"
  ctx.lineWidth   = 1
  ctx.setLineDash([2, 6])
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

// ─── ENTIDADES ────────────────────────────────────────────
function drawEntity(e) {
  const px = e.ix * CELL, py = e.iy * CELL
  const cx = px + CELL / 2, cy = py + CELL / 2

  ctx.save()
  switch (e.type) {
    case "base":         drawBase(px, py, cx, cy, false); break
    case "ai-base":      drawBase(px, py, cx, cy, true);  break
    case "source":       drawSource(px, py, cx, cy, e);   break
    case "worker":       drawWorker(px, py, cx, cy, e, false); break
    case "ai-worker":    drawWorker(px, py, cx, cy, e, true);  break
    case "extension":    drawExtension(px, py, cx, cy, false); break
    case "ai-extension": drawExtension(px, py, cx, cy, true);  break
  }
  ctx.restore()
}

// ─── BASE (JUGADOR / IA) ──────────────────────────────────
function drawBase(px, py, cx, cy, isAI) {
  const color = isAI ? "#cc2222" : "#2277dd"
  const glow  = isAI ? "#ff5555" : "#55bbff"
  const bg    = isAI ? "#120404" : "#040d18"
  const s = CELL - 4, ox = px + 2, oy = py + 2, L = 7

  ctx.fillStyle = bg
  ctx.fillRect(ox, oy, s, s)

  ctx.shadowColor = glow
  ctx.shadowBlur  = 16
  ctx.strokeStyle = color
  ctx.lineWidth   = 2

  ;[
    [[ox, oy + L], [ox, oy], [ox + L, oy]],
    [[ox + s - L, oy], [ox + s, oy], [ox + s, oy + L]],
    [[ox, oy + s - L], [ox, oy + s], [ox + L, oy + s]],
    [[ox + s - L, oy + s], [ox + s, oy + s], [ox + s, oy + s - L]]
  ].forEach(pts => {
    ctx.beginPath()
    ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2])
    ctx.stroke()
  })

  // Punto central pulsante
  const pulse = 0.6 + 0.4 * Math.sin(animFrame * 0.06)
  ctx.fillStyle = glow
  ctx.shadowBlur = 8 * pulse
  ctx.beginPath()
  ctx.arc(cx, cy, 3 * pulse, 0, Math.PI * 2)
  ctx.fill()
}

// ─── SOURCE ───────────────────────────────────────────────
function drawSource(px, py, cx, cy, e) {
  const energy = e.source ? e.source.energy / e.source.max : 1
  const pulse  = 0.5 + 0.5 * Math.sin(animFrame * 0.07 + cx * 0.3)

  ctx.fillStyle = "#0d0900"
  ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4)

  ctx.shadowColor = "#ffcc00"
  ctx.shadowBlur  = 6 + pulse * 8 * energy

  // Diamante
  ctx.fillStyle = `rgba(200,155,0,${0.35 + energy * 0.55})`
  ctx.beginPath()
  ctx.moveTo(cx, py + 4)
  ctx.lineTo(px + CELL - 4, cy)
  ctx.lineTo(cx, py + CELL - 4)
  ctx.lineTo(px + 4, cy)
  ctx.closePath()
  ctx.fill()

  // Anillo de pulso
  if (energy > 0.1) {
    ctx.strokeStyle = `rgba(255,200,0,${pulse * 0.45 * energy})`
    ctx.lineWidth   = 1
    ctx.shadowBlur  = 4
    ctx.beginPath()
    ctx.arc(cx, cy, CELL / 2 - 2 + pulse * 3, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Barra de energía
  if (e.source) {
    const bw = CELL - 6
    ctx.shadowBlur = 0
    ctx.fillStyle  = "#1a1200"
    ctx.fillRect(px + 3, py + CELL - 5, bw, 3)
    ctx.fillStyle  = "#ffaa00"
    ctx.shadowColor = "#ffcc00"
    ctx.shadowBlur  = 3
    ctx.fillRect(px + 3, py + CELL - 5, bw * energy, 3)
  }
}

// ─── WORKER ───────────────────────────────────────────────
function drawWorker(px, py, cx, cy, e, isAI) {
  const color = isAI ? "#cc5500" : "#00bb88"
  const glow  = isAI ? "#ff9900" : "#00ffbb"
  const bg    = isAI ? "#150800" : "#00120a"
  const energy = e.energy ? e.energy.current / e.energy.capacity : 0

  ctx.fillStyle = bg
  ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4)

  ctx.shadowColor = glow
  ctx.shadowBlur  = 8
  ctx.strokeStyle = color
  ctx.lineWidth   = 1.5
  ctx.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6)

  ctx.fillStyle = glow
  ctx.shadowBlur = 12
  ctx.font = `bold ${Math.floor(CELL * 0.48)}px 'Courier New'`
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(isAI ? "A" : "W", cx, cy + 1)

  const bw = CELL - 6
  ctx.shadowBlur = 0
  ctx.fillStyle  = isAI ? "#150500" : "#001508"
  ctx.fillRect(px + 3, py + CELL - 5, bw, 3)
  ctx.fillStyle   = isAI ? "#ff8800" : "#00ff99"
  ctx.shadowColor = isAI ? "#ff8800" : "#00ff99"
  ctx.shadowBlur  = 3
  ctx.fillRect(px + 3, py + CELL - 5, bw * energy, 3)
}

// ─── EXTENSION ────────────────────────────────────────────
function drawExtension(px, py, cx, cy, isAI) {
  const color = isAI ? "#cc1166" : "#7744cc"
  const glow  = isAI ? "#ff3388" : "#aa66ff"
  const bg    = isAI ? "#130010" : "#080015"

  ctx.fillStyle = bg
  ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4)

  ctx.shadowColor = glow
  ctx.shadowBlur  = 8
  ctx.strokeStyle = color
  ctx.lineWidth   = 1.5

  // Octágono estilizado
  const s = CELL - 8, ox = px + 4, oy = py + 4, c = 4
  ctx.beginPath()
  ctx.moveTo(ox + c, oy)
  ctx.lineTo(ox + s - c, oy)
  ctx.lineTo(ox + s, oy + c)
  ctx.lineTo(ox + s, oy + s - c)
  ctx.lineTo(ox + s - c, oy + s)
  ctx.lineTo(ox + c, oy + s)
  ctx.lineTo(ox, oy + s - c)
  ctx.lineTo(ox, oy + c)
  ctx.closePath()
  ctx.stroke()

  ctx.fillStyle = glow
  ctx.shadowBlur = 10
  ctx.font = `${Math.floor(CELL * 0.44)}px 'Courier New'`
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(isAI ? "X" : "E", cx, cy + 1)
}

// ─── PANEL LATERAL ────────────────────────────────────────
function updatePanel(snap) {
  if (snap.base) {
    const pct = (snap.base.energy / snap.base.capacity * 100).toFixed(0)
    document.getElementById("base-energy").textContent =
      `${snap.base.energy} / ${snap.base.capacity}`
    document.getElementById("base-energy-bar").style.width = `${pct}%`
  }
  document.getElementById("worker-count").textContent = snap.workerCount
  document.getElementById("ext-count").textContent    = snap.extensions

  if (snap.aiBase) {
    const pct = (snap.aiBase.energy / snap.aiBase.capacity * 100).toFixed(0)
    document.getElementById("ai-energy").textContent =
      `${snap.aiBase.energy} / ${snap.aiBase.capacity}`
    document.getElementById("ai-energy-bar").style.width = `${pct}%`
  }
  document.getElementById("ai-worker-count").textContent = snap.aiWorkerCount ?? 0
  document.getElementById("ai-ext-count").textContent    = snap.aiExtensions ?? 0

  const list    = document.getElementById("worker-list")
  list.innerHTML = ""
  const workers = snap.entities.filter(e => e.type === "worker")
  for (const w of workers) {
    const div = document.createElement("div")
    div.className = "worker-entry"
    const ep = w.energy ? `${w.energy.current}/${w.energy.capacity}` : "—"
    div.innerHTML = `
      <div class="wid">W#${w.id} <span style="color:#333">(${w.x},${w.y})</span></div>
      <div class="wstate">▸ ${w.state ?? "?"}</div>
      <div class="wenergy">⚡ ${ep}</div>
    `
    list.appendChild(div)
  }
}

// ─── ERRORES DE SCRIPT ────────────────────────────────────
const scriptError  = document.getElementById("script-error")
const scriptStatus = document.getElementById("script-status")
const codeEditor   = document.getElementById("code-editor")
const btnRun       = document.getElementById("btn-run")
const btnClear     = document.getElementById("btn-clear")

const savedScript = localStorage.getItem("devage_script")
if (savedScript) codeEditor.value = savedScript

btnRun.addEventListener("click", async () => {
  const code = codeEditor.value.trim()
  localStorage.setItem("devage_script", code)
  try {
    const res  = await fetch("/api/script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    })
    const data = await res.json()
    if (data.ok) {
      scriptStatus.textContent = code ? "activo" : "sin script"
      scriptStatus.className   = "script-status " + (code ? "active" : "idle")
      scriptError.style.display = "none"
    } else {
      showError(data.error || "Error desconocido")
    }
  } catch { showError("No se pudo conectar al servidor") }
})

btnClear.addEventListener("click", async () => {
  codeEditor.value = ""
  localStorage.removeItem("devage_script")
  await fetch("/api/script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "" })
  })
  scriptStatus.textContent  = "sin script"
  scriptStatus.className    = "script-status idle"
  scriptError.style.display = "none"
})

codeEditor.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); btnRun.click() }
})

function showError(msg) {
  scriptError.textContent   = "⚠ " + msg
  scriptError.style.display = "block"
}
function updateScriptError(err) { if (err) showError(err) }
