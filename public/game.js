// ═══════════════════════════════════════════════════════════
//  CODESTRIKE — Visual v2 "La Red de Neones"
//  60fps con interpolación entre ticks, glow, rutas animadas
// ═══════════════════════════════════════════════════════════

// ─── PARTÍCULAS ───────────────────────────────────────────
const particles = []

function spawnParticles(x, y, isAI) {
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.3 + Math.random() * 0.6
    particles.push({
      x: (x + 0.5) * CELL,
      y: (y + 0.5) * CELL,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.8,
      life: 1,
      color: isAI ? "#ff9900" : "#44bbff",
      glow:  isAI ? "#ff6600" : "#00aaff",
      size:  1.5 + Math.random() * 2
    })
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x    += p.vx
    p.y    += p.vy
    p.vy   += 0.04   // gravedad suave
    p.life -= 0.035
    if (p.life <= 0) particles.splice(i, 1)
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = p.life
    ctx.shadowColor = p.glow
    ctx.shadowBlur  = 6
    ctx.fillStyle   = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

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

  // 3.5 Partículas de cosecha
  updateParticles()
  const sourcePositions = {}
  for (const e of entities) {
    if (e.type === "source") sourcePositions[`${e.x},${e.y}`] = true
  }
  for (const e of entities) {
    if (e.type === "worker" || e.type === "ai-worker") {
      if (e.state === "harvesting" && sourcePositions[`${e.x},${e.y}`]) {
        if (animFrame % 4 === 0) spawnParticles(e.x, e.y, e.type === "ai-worker")
      }
    }
  }
  drawParticles()

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

  // 6. Pantalla de victoria
  if (snap.winner) drawVictoryScreen(snap.winner, snap.winTick)

  document.getElementById("tick").textContent = snap.tick
  animFrame++
}

// ─── PANTALLA DE VICTORIA ─────────────────────────────────
function drawVictoryScreen(winner, winTick) {
  const w = canvas.width, h = canvas.height
  const isPlayer = winner === "player"
  const pulse = 0.75 + 0.25 * Math.sin(animFrame * 0.05)

  // Overlay oscuro
  ctx.fillStyle = isPlayer ? "rgba(0,8,20,0.82)" : "rgba(20,0,0,0.82)"
  ctx.fillRect(0, 0, w, h)

  // Línea horizontal superior e inferior
  const lineColor = isPlayer ? "#00aaff" : "#ff4422"
  ctx.shadowColor = lineColor
  ctx.shadowBlur  = 20 * pulse
  ctx.strokeStyle = lineColor
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(0, h * 0.28); ctx.lineTo(w, h * 0.28); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, h * 0.72); ctx.lineTo(w, h * 0.72); ctx.stroke()

  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"

  // Título
  ctx.font      = `bold ${Math.floor(w * 0.09)}px 'Share Tech Mono', monospace`
  ctx.fillStyle = lineColor
  ctx.shadowBlur = 30 * pulse
  ctx.fillText(isPlayer ? "VICTORIA" : "DERROTA", w / 2, h * 0.42)

  // Subtítulo
  ctx.font      = `${Math.floor(w * 0.032)}px 'Share Tech Mono', monospace`
  ctx.fillStyle = isPlayer ? "#7799cc" : "#886655"
  ctx.shadowBlur = 0
  ctx.fillText(
    isPlayer ? "Tu código dominó el mapa" : "La IA tomó el control",
    w / 2, h * 0.54
  )

  // Tick
  ctx.font      = `${Math.floor(w * 0.024)}px 'Share Tech Mono', monospace`
  ctx.fillStyle = "#334466"
  ctx.fillText(`Tick final: ${winTick}`, w / 2, h * 0.62)

  // Instrucción de reinicio
  ctx.font      = `${Math.floor(w * 0.022)}px 'Share Tech Mono', monospace`
  ctx.fillStyle = "#334466"
  ctx.fillText("[ Recarga la página para jugar de nuevo ]", w / 2, h * 0.68)
}

// ─── TILE ─────────────────────────────────────────────────
function drawTile(x, y, type) {
  const px = x * CELL, py = y * CELL
  ctx.shadowBlur = 0
  if (type === "wall") {
    ctx.fillStyle = "#030610"
    ctx.fillRect(px, py, CELL, CELL)
    ctx.strokeStyle = "#071020"
    ctx.lineWidth = 0.5
    ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1)
  } else {
    ctx.fillStyle = "#050912"
    ctx.fillRect(px, py, CELL, CELL)
    ctx.strokeStyle = "#0a1525"
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
  ctx.strokeStyle = isAI ? "rgba(255,100,0,0.22)" : "rgba(0,170,255,0.22)"
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
  const color = isAI ? "#cc5500" : "#0088cc"
  const glow  = isAI ? "#ff9900" : "#00aaff"
  const bg    = isAI ? "#150800" : "#00080f"
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
  ctx.fillStyle  = isAI ? "#150500" : "#00060e"
  ctx.fillRect(px + 3, py + CELL - 5, bw, 3)
  ctx.fillStyle   = isAI ? "#ff8800" : "#00aaff"
  ctx.shadowColor = isAI ? "#ff8800" : "#00aaff"
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

// ─── HISTORIAL DE ENERGÍA (sparklines) ───────────────────
const HISTORY_LEN    = 60
const playerHistory  = []
const aiHistory      = []

// ─── EVENTOS ──────────────────────────────────────────────
const eventLog       = []
const MAX_EVENTS     = 6
let prevWorkerCount  = 0
let prevAiWorkers    = 0
let prevExtCount     = 0
let prevAiExtCount   = 0

function addEvent(text, type = "ev-world", tick = 0) {
  eventLog.unshift({ text, type, tick })
  if (eventLog.length > MAX_EVENTS) eventLog.pop()
  renderEventLog()
}

function renderEventLog() {
  const el = document.getElementById("event-log")
  el.innerHTML = ""
  for (const ev of eventLog) {
    const div = document.createElement("div")
    div.className = `event-entry ${ev.type}`
    div.innerHTML = `<span class="etick">[${String(ev.tick).padStart(4,"0")}]</span> ${ev.text}`
    el.appendChild(div)
  }
}

// ─── SPARKLINE ────────────────────────────────────────────
function drawSparkline(canvasEl, history, color, glowColor) {
  const w = canvasEl.offsetWidth || 230
  const h = 36
  canvasEl.width  = w
  canvasEl.height = h

  const sc = canvasEl.getContext("2d")
  sc.clearRect(0, 0, w, h)

  if (history.length < 2) return

  const max = Math.max(...history, 1)
  const pts = history.map((v, i) => ({
    x: (i / (HISTORY_LEN - 1)) * w,
    y: h - 2 - (v / max) * (h - 4)
  }))

  // Fill bajo la línea
  sc.beginPath()
  sc.moveTo(pts[0].x, h)
  for (const p of pts) sc.lineTo(p.x, p.y)
  sc.lineTo(pts[pts.length - 1].x, h)
  sc.closePath()
  const grad = sc.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, glowColor + "44")
  grad.addColorStop(1, "transparent")
  sc.fillStyle = grad
  sc.fill()

  // Línea
  sc.beginPath()
  sc.moveTo(pts[0].x, pts[0].y)
  for (const p of pts) sc.lineTo(p.x, p.y)
  sc.strokeStyle = color
  sc.lineWidth   = 1.5
  sc.shadowColor = glowColor
  sc.shadowBlur  = 4
  sc.stroke()

  // Punto final
  const last = pts[pts.length - 1]
  sc.beginPath()
  sc.arc(last.x, last.y, 2.5, 0, Math.PI * 2)
  sc.fillStyle  = color
  sc.shadowBlur = 6
  sc.fill()
}

// ─── WORKER DOTS ──────────────────────────────────────────
function renderWorkerDots(snap) {
  const container = document.getElementById("worker-dots")
  container.innerHTML = ""

  const playerWorkers = snap.entities.filter(e => e.type === "worker")
  const aiWorkers     = snap.entities.filter(e => e.type === "ai-worker")

  const makeDot = (state, isAI) => {
    const d = document.createElement("div")
    d.className = "wdot"
    if (isAI) {
      d.style.background     = state === "harvesting" ? "#ff8800" : "#882200"
      d.style.borderColor    = state === "harvesting" ? "#ffaa44" : "#554400"
      d.style.boxShadow      = state === "harvesting" ? "0 0 5px #ff8800" : "none"
    } else {
      d.style.background     = state === "harvesting" ? "#0077bb" : "#001833"
      d.style.borderColor    = state === "harvesting" ? "#00aaff" : "#002255"
      d.style.boxShadow      = state === "harvesting" ? "0 0 5px #00aaff" : "none"
    }
    d.title = `${isAI ? "IA" : "W"} — ${state}`
    return d
  }

  // Separador visual: jugador arriba, IA abajo
  if (playerWorkers.length > 0) {
    const label = document.createElement("div")
    label.style.cssText = "width:100%;font-size:8px;color:#334466;letter-spacing:2px;margin-bottom:2px"
    label.textContent = "TÚ"
    container.appendChild(label)
    const row = document.createElement("div")
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"
    playerWorkers.forEach(w => row.appendChild(makeDot(w.state, false)))
    container.appendChild(row)
  }

  if (aiWorkers.length > 0) {
    const label = document.createElement("div")
    label.style.cssText = "width:100%;font-size:8px;color:#442222;letter-spacing:2px;margin-bottom:2px"
    label.textContent = "IA"
    container.appendChild(label)
    const row = document.createElement("div")
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:4px"
    aiWorkers.forEach(w => row.appendChild(makeDot(w.state, true)))
    container.appendChild(row)
  }
}

// ─── DOMINANCIA ───────────────────────────────────────────
function updateDominance(snap) {
  const pe = snap.base   ? snap.base.energy   : 0
  const ae = snap.aiBase ? snap.aiBase.energy : 0
  const total = pe + ae

  const playerPct = total > 0 ? pe / total : 0.5
  const aiPct     = total > 0 ? ae / total : 0.5

  document.getElementById("dominance-player").style.width = `${playerPct * 100}%`
  document.getElementById("dominance-ai").style.width     = `${aiPct * 100}%`
  document.getElementById("dom-player-pct").textContent   = `${(playerPct * 100).toFixed(0)}%`
  document.getElementById("dom-ai-pct").textContent       = `${(aiPct * 100).toFixed(0)}%`
}

// ─── PANEL PRINCIPAL ──────────────────────────────────────
function updatePanel(snap) {
  // ── Jugador ────────────────────────────────────────────
  if (snap.base) {
    const pct = (snap.base.energy / snap.base.capacity * 100).toFixed(0)
    document.getElementById("base-energy").textContent =
      `${snap.base.energy} / ${snap.base.capacity}`
    document.getElementById("base-energy-bar").style.width = `${pct}%`
    playerHistory.push(snap.base.energy)
    if (playerHistory.length > HISTORY_LEN) playerHistory.shift()
    drawSparkline(
      document.getElementById("sparkline-player"),
      playerHistory, "#0077bb", "#00aaff"
    )
  }
  document.getElementById("worker-count").textContent = snap.workerCount
  document.getElementById("ext-count").textContent    = snap.extensions

  // ── IA ─────────────────────────────────────────────────
  if (snap.aiBase) {
    const pct = (snap.aiBase.energy / snap.aiBase.capacity * 100).toFixed(0)
    document.getElementById("ai-energy").textContent =
      `${snap.aiBase.energy} / ${snap.aiBase.capacity}`
    document.getElementById("ai-energy-bar").style.width = `${pct}%`
    aiHistory.push(snap.aiBase.energy)
    if (aiHistory.length > HISTORY_LEN) aiHistory.shift()
    drawSparkline(
      document.getElementById("sparkline-ai"),
      aiHistory, "#cc5500", "#ff8800"
    )
  }
  document.getElementById("ai-worker-count").textContent = snap.aiWorkerCount ?? 0
  document.getElementById("ai-ext-count").textContent    = snap.aiExtensions ?? 0

  // ── Dominancia ─────────────────────────────────────────
  updateDominance(snap)

  // ── Worker dots ────────────────────────────────────────
  renderWorkerDots(snap)

  // ── Eventos ────────────────────────────────────────────
  const tick = snap.tick
  if (snap.workerCount > prevWorkerCount)
    addEvent("Worker spawneado", "ev-player", tick)
  if (snap.extensions > prevExtCount)
    addEvent("Extension construida", "ev-player", tick)
  if ((snap.aiWorkerCount ?? 0) > prevAiWorkers)
    addEvent("IA: worker spawneado", "ev-ai", tick)
  if ((snap.aiExtensions ?? 0) > prevAiExtCount)
    addEvent("IA: extension construida", "ev-ai", tick)

  prevWorkerCount = snap.workerCount
  prevExtCount    = snap.extensions
  prevAiWorkers   = snap.aiWorkerCount ?? 0
  prevAiExtCount  = snap.aiExtensions  ?? 0

  // Victoria
  const banner = document.getElementById("victory-banner")
  if (snap.winner && banner.style.display === "none") {
    banner.className    = snap.winner === "player" ? "player" : "ai"
    banner.textContent  = snap.winner === "player" ? "⬡ VICTORIA" : "◈ DERROTA"
    banner.style.display = "block"
    if (snap.winner === "player") {
      addEvent("¡VICTORIA! Base llena", "ev-player", snap.tick)
      // Guardar progreso si estamos en campaña
      if (currentMode === "campaign" && selectedMission) {
        const stars = snap.winTick < 300 ? 3 : snap.winTick < 500 ? 2 : 1
        saveMissionProgress(selectedMission, stars)
      }
    } else {
      addEvent("DERROTA — IA llenó su base", "ev-ai", snap.tick)
    }
  }
}

// ─── ERRORES DE SCRIPT ────────────────────────────────────
const scriptError  = document.getElementById("script-error")
const scriptStatus = document.getElementById("script-status")
const codeEditor   = document.getElementById("code-editor")
const btnRun       = document.getElementById("btn-run")
const btnClear     = document.getElementById("btn-clear")

const savedScript = localStorage.getItem("codestrike_script")
if (savedScript) codeEditor.value = savedScript

btnRun.addEventListener("click", async () => {
  const code = codeEditor.value.trim()
  localStorage.setItem("codestrike_script", code)
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
  localStorage.removeItem("codestrike_script")
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

// ═══════════════════════════════════════════════════════════
//  MENÚ PRINCIPAL — Red neuronal animada + selección de modo
// ═══════════════════════════════════════════════════════════

let menuActive = true
const menuScreen    = document.getElementById("menu-screen")
const menuBgCanvas  = document.getElementById("menu-bg")
const mctx          = menuBgCanvas.getContext("2d")

// ── Puntos de la red neuronal del fondo ───────────────────
const NET_DOTS = []

function initMenuBg() {
  menuBgCanvas.width  = window.innerWidth
  menuBgCanvas.height = window.innerHeight
  NET_DOTS.length = 0
  for (let i = 0; i < 65; i++) {
    NET_DOTS.push({
      x:  Math.random() * menuBgCanvas.width,
      y:  Math.random() * menuBgCanvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r:  0.8 + Math.random() * 1.8,
      op: 0.12 + Math.random() * 0.3
    })
  }
}

function drawMenuBg() {
  if (!menuActive) return
  const w = menuBgCanvas.width, h = menuBgCanvas.height
  mctx.clearRect(0, 0, w, h)

  // Mover y dibujar puntos
  for (const p of NET_DOTS) {
    p.x += p.vx; p.y += p.vy
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
    if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
    mctx.beginPath()
    mctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    mctx.fillStyle = `rgba(0,170,255,${p.op})`
    mctx.fill()
  }

  // Líneas de conexión entre puntos cercanos
  for (let i = 0; i < NET_DOTS.length; i++) {
    for (let j = i + 1; j < NET_DOTS.length; j++) {
      const dx = NET_DOTS[i].x - NET_DOTS[j].x
      const dy = NET_DOTS[i].y - NET_DOTS[j].y
      const d  = Math.sqrt(dx * dx + dy * dy)
      if (d < 115) {
        mctx.strokeStyle = `rgba(0,170,255,${(1 - d / 115) * 0.1})`
        mctx.lineWidth   = 0.5
        mctx.beginPath()
        mctx.moveTo(NET_DOTS[i].x, NET_DOTS[i].y)
        mctx.lineTo(NET_DOTS[j].x, NET_DOTS[j].y)
        mctx.stroke()
      }
    }
  }
  requestAnimationFrame(drawMenuBg)
}

// ── Datos de las misiones ────────────────────────────────
const MISSIONS = {
  1: {
    title: "Tu primer ejército",
    concept: "if · else · for...in · variables",
    desc: "Controla tus workers para que recolecten energía y la lleven a tu base. Aprenderás los bloques fundamentales de JavaScript.",
    code: `// ═══════════════════════════════════════════════
//  CODESTRIKE · MISIÓN 1 — "Tu primer ejército"
// ═══════════════════════════════════════════════
//  OBJETIVO: Llena la base al 100% antes que la IA.
//
//  CONCEPTOS JS en esta misión:
//    · Variables (const, let)
//    · Condicionales (if / else)
//    · Bucles (for...in)
// ═══════════════════════════════════════════════

for (const id in Game.workers) {
  const w = Game.workers[id]   // cada worker

  if (w.energy < w.energyCapacity) {
    // Busca la fuente de energía más cercana
    let nearest = null
    let minDist = Infinity

    for (const sid in Game.sources) {
      const s = Game.sources[sid]
      if (s.energy > 0) {
        const d = Math.abs(w.x - s.x) + Math.abs(w.y - s.y)
        if (d < minDist) { minDist = d; nearest = s }
      }
    }

    if (nearest) w.harvest(nearest.id)   // ir a cosechar

  } else {
    w.transfer(Game.base.id)   // depositar en base
  }
}
`
  },
  2: {
    title: "Trabaja en equipo",
    concept: "funciones · reutilización de código",
    desc: "Crea una función findNearest() para reutilizarla con todos tus workers. Aprenderás cómo organizar tu código.",
    code: null  // se desbloquea al completar misión 1
  },
  3: {
    title: "El algoritmo",
    concept: "Math · optimización de rutas",
    desc: "Optimiza la distancia que recorren tus workers. Aprenderás Math.abs, Math.min y cómo medir eficiencia.",
    code: null
  },
  4: {
    title: "Expansión",
    concept: "objetos · construcción · economía",
    desc: "Construye extensiones para aumentar la capacidad de tu base. Aprenderás a manejar estado entre ticks.",
    code: null
  },
  5: {
    title: "La gran final",
    concept: "estrategia completa · IA difícil",
    desc: "Aplica todo lo que aprendiste. La IA juega con su estrategia más agresiva. Solo el mejor código gana.",
    code: null
  }
}

// Progreso guardado en localStorage
function getMissionProgress() {
  try { return JSON.parse(localStorage.getItem("cs_progress") || "{}") } catch { return {} }
}
function saveMissionProgress(missionId, stars) {
  const p = getMissionProgress()
  if (!p[missionId] || p[missionId] < stars) p[missionId] = stars
  localStorage.setItem("cs_progress", JSON.stringify(p))
}

// ── Template de la Misión 1 ───────────────────────────────
const MISSION_1 = `// ═══════════════════════════════════════════════
//  CODESTRIKE · MISIÓN 1 — "Tu primer ejército"
// ═══════════════════════════════════════════════
//  OBJETIVO: Llena la base al 100% antes que la IA.
//
//  CONCEPTOS JS que vas a aprender aquí:
//    · Variables: const, let
//    · Condicionales: if / else
//    · Bucles: for...in
//    · Objetos: propiedades y métodos
// ═══════════════════════════════════════════════

// Este código corre automáticamente cada 300ms.
// Recorre todos tus workers y les da instrucciones:

for (const id in Game.workers) {
  const w = Game.workers[id]   // ← un worker

  if (w.energy < w.energyCapacity) {
    // El worker está vacío → busca la fuente más cercana
    let nearest = null
    let minDist = Infinity

    for (const sid in Game.sources) {
      const s = Game.sources[sid]
      if (s.energy > 0) {
        const d = Math.abs(w.x - s.x) + Math.abs(w.y - s.y)
        if (d < minDist) { minDist = d; nearest = s }
      }
    }

    if (nearest) w.harvest(nearest.id)   // ← ir a cosechar

  } else {
    // El worker está lleno → deposita en la base
    w.transfer(Game.base.id)
  }
}
`

// ── Cerrar menú principal ─────────────────────────────────
function hideMenu(cb) {
  menuActive = false
  menuScreen.style.transition    = "opacity 0.7s ease"
  menuScreen.style.opacity       = "0"
  menuScreen.style.pointerEvents = "none"
  setTimeout(() => { menuScreen.style.display = "none"; cb && cb() }, 750)
}

// ── Pantalla de selección de misiones ─────────────────────
let missionScreen    = null
let selectedMission  = null

function openMissionScreen() {
  missionScreen = document.getElementById("mission-screen")
  missionScreen.style.display = "flex"
  refreshMissionNodes()
}

function refreshMissionNodes() {
  const progress = getMissionProgress()
  let totalDone  = 0

  for (let i = 1; i <= 5; i++) {
    const node    = document.getElementById(`mnode-${i}`)
    const stars   = progress[i] || 0
    if (!node) continue

    if (stars > 0) totalDone++

    // Estado del nodo
    node.classList.remove("locked", "completed")
    if (i === 1 || progress[i - 1]) {
      node.classList.add("completed")   // desbloqueado
    } else {
      node.classList.add("locked")
    }

    // Estrellas
    for (let s = 1; s <= 3; s++) {
      const star = document.getElementById(`mstar-${i}-${s}`)
      if (star) star.classList.toggle("earned", s <= stars)
    }
  }

  document.getElementById("missions-done").textContent = totalDone

  // Eventos de click en nodos
  for (let i = 1; i <= 5; i++) {
    const node = document.getElementById(`mnode-${i}`)
    if (!node || node.classList.contains("locked")) continue
    node.onclick = () => selectMissionNode(i)
  }
}

function selectMissionNode(id) {
  selectedMission = id
  const m = MISSIONS[id]

  // Quitar active de todos
  document.querySelectorAll(".mission-node").forEach(n => n.classList.remove("active"))
  document.getElementById(`mnode-${id}`).classList.add("active")

  document.getElementById("detail-title").textContent   = m.title
  document.getElementById("detail-concept").textContent = m.concept
  document.getElementById("detail-desc").textContent    = m.desc

  const btn = document.getElementById("btn-start-mission")
  btn.disabled    = false
  btn.textContent = `▶ Iniciar misión ${id}`
}

document.getElementById("btn-start-mission").addEventListener("click", () => {
  if (!selectedMission) return
  startMission(selectedMission)
})

document.getElementById("btn-back-menu").addEventListener("click", () => {
  document.getElementById("mission-screen").style.display = "none"
  menuScreen.style.display   = "flex"
  menuScreen.style.opacity   = "1"
  menuScreen.style.pointerEvents = "auto"
  menuActive = true
  drawMenuBg()
})

function startMission(id) {
  document.getElementById("mission-screen").style.display = "none"
  const m = MISSIONS[id]
  const code = m.code || MISSION_1
  codeEditor.value = code
  localStorage.setItem("codestrike_script", code)
  setTimeout(() => btnRun.click(), 100)
}

// ── Seleccionar modo ──────────────────────────────────────
let currentMode = null

function selectMode(mode) {
  currentMode = mode
  if (mode === "campaign") {
    hideMenu(() => openMissionScreen())
  } else {
    hideMenu(null)
  }
}

document.getElementById("card-campaign").addEventListener("click",  () => selectMode("campaign"))
document.getElementById("card-vs-ai").addEventListener("click",     () => selectMode("vs-ai"))
document.getElementById("card-sandbox").addEventListener("click",   () => selectMode("sandbox"))

document.addEventListener("keydown", e => {
  if (!menuActive) return
  if (e.key === "1") selectMode("campaign")
  if (e.key === "2") selectMode("vs-ai")
  if (e.key === "3") selectMode("sandbox")
  if (e.key === "Enter") {
    const focused = document.activeElement
    if (focused && focused.classList.contains("menu-card")) focused.click()
  }
})

window.addEventListener("resize", () => {
  if (menuActive) initMenuBg()
})

initMenuBg()
drawMenuBg()
