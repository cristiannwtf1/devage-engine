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

const CELL    = 20
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
  scheduleTourIfNeeded()
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

// ─── TERRAIN HASH ─────────────────────────────────────────
// Función determinista por posición: mismo resultado siempre
function terrainHash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)   // 0.0 → 1.0
}

// ─── TILE ─────────────────────────────────────────────────
function drawTile(x, y, type) {
  const px = x * CELL, py = y * CELL
  ctx.shadowBlur = 0

  if (type === "floor") {
    // Floor: sutil cuadrícula de puntos para dar textura de arena digital
    ctx.fillStyle = "#071428"
    ctx.fillRect(px, py, CELL, CELL)
    // Punto de grilla en intersecciones (cada 2 tiles)
    if (x % 2 === 0 && y % 2 === 0) {
      ctx.fillStyle = "rgba(0,60,120,0.18)"
      ctx.fillRect(px, py, 1, 1)
    }
    return
  }

  // Wall — terreno con 4 niveles de altura según hash
  const h = terrainHash(x, y)

  // Nivel 0 — valle/foso (20%)
  // Nivel 1 — terreno bajo (35%)
  // Nivel 2 — colina (30%)
  // Nivel 3 — cumbre/montaña (15%)
  const level = h < 0.20 ? 0 : h < 0.55 ? 1 : h < 0.85 ? 2 : 3

  const wallColors = ["#010208", "#020410", "#030615", "#04091c"]
  ctx.fillStyle = wallColors[level]
  ctx.fillRect(px, py, CELL, CELL)

  if (level >= 2) {
    // Borde superior iluminado — simula luz cenital sobre la cumbre
    const alpha = level === 3 ? 0.22 : 0.10
    ctx.fillStyle = `rgba(0,80,160,${alpha})`
    ctx.fillRect(px, py, CELL, 1)
  }

  if (level === 3) {
    // Pico: pequeño triángulo de luz en el centro superior
    const cx2 = px + CELL / 2
    ctx.fillStyle = "rgba(0,100,200,0.18)"
    ctx.beginPath()
    ctx.moveTo(cx2, py + 3)
    ctx.lineTo(cx2 - 3, py + 8)
    ctx.lineTo(cx2 + 3, py + 8)
    ctx.closePath()
    ctx.fill()
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
  const color  = isAI ? "#cc2222" : "#1e77dd"
  const glow   = isAI ? "#ff5555" : "#44bbff"
  const bg     = isAI ? "#120404" : "#030d1a"
  const pulse  = 0.6 + 0.4 * Math.sin(animFrame * 0.06)

  // Fondo con gradiente radial
  const bg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.65)
  bg2.addColorStop(0,   isAI ? "rgba(30,4,4,0.95)" : "rgba(4,15,30,0.95)")
  bg2.addColorStop(1,   isAI ? "rgba(10,1,1,0.9)"  : "rgba(2,6,14,0.9)")
  ctx.shadowBlur = 0
  ctx.fillStyle  = bg2
  ctx.fillRect(px, py, CELL, CELL)

  // Anillo exterior
  ctx.shadowColor = glow
  ctx.shadowBlur  = 6 * pulse
  ctx.strokeStyle = color
  ctx.lineWidth   = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, CELL * 0.42, 0, Math.PI * 2)
  ctx.stroke()

  // Anillo interior pulsante
  ctx.shadowBlur  = 4 * pulse
  ctx.strokeStyle = `rgba(${isAI ? "255,80,80" : "80,190,255"},${0.4 + 0.3 * pulse})`
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.arc(cx, cy, CELL * 0.28, 0, Math.PI * 2)
  ctx.stroke()

  // Esquinas tipo HUD (bracketing)
  const s = CELL - 3, ox = px + 1, oy = py + 1, L = Math.floor(CELL * 0.3)
  ctx.shadowColor = glow
  ctx.shadowBlur  = 8
  ctx.strokeStyle = glow
  ctx.lineWidth   = 1.5
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

  // Arco de progreso hacia la victoria
  const baseData = isAI ? currSnapshot?.aiBase : currSnapshot?.base
  if (baseData && baseData.capacity > 0) {
    const prog = baseData.energy / baseData.capacity
    if (prog > 0.01) {
      ctx.globalAlpha = 0.65
      ctx.shadowColor = glow
      ctx.shadowBlur  = 5
      ctx.strokeStyle = glow
      ctx.lineWidth   = 2
      ctx.beginPath()
      ctx.arc(cx, cy, CELL * 0.47, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // Núcleo central pulsante
  ctx.fillStyle  = glow
  ctx.shadowBlur = 6 * pulse
  ctx.beginPath()
  ctx.arc(cx, cy, 2.5 * pulse, 0, Math.PI * 2)
  ctx.fill()
}

// ─── SOURCE — estilo Screeps: círculo limpio + gradiente ──
function drawSource(px, py, cx, cy, e) {
  const energy = e.source ? e.source.energy / e.source.max : 1
  const pulse  = 0.5 + 0.5 * Math.sin(animFrame * 0.08 + cx * 0.2)
  const r      = CELL * 0.38

  // Agotado: anillo sutil, sin ruido visual
  if (energy <= 0) {
    ctx.shadowBlur  = 0
    ctx.strokeStyle = "rgba(80,60,10,0.35)"
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2)
    ctx.stroke()
    return
  }

  // Cuerpo: gradiente radial limpio (luz off-center = realismo)
  const grad = ctx.createRadialGradient(
    cx - r * 0.25, cy - r * 0.25, 0,
    cx, cy, r
  )
  grad.addColorStop(0,   `rgba(255,245,170,${0.95 * energy})`)
  grad.addColorStop(0.45,`rgba(235,175,20,${0.88 * energy})`)
  grad.addColorStop(1,   `rgba(150,90,0,${0.72 * energy})`)

  // Un solo shadowBlur controlado — máx 7px
  ctx.shadowColor = "#ffcc00"
  ctx.shadowBlur  = 3 + pulse * 4 * energy
  ctx.fillStyle   = grad
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Borde nítido, sin blur
  ctx.shadowBlur  = 0
  ctx.strokeStyle = `rgba(255,215,50,${0.5 + energy * 0.4})`
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
}

// ─── WORKER ───────────────────────────────────────────────
function drawWorker(px, py, cx, cy, e, isAI) {
  const color    = isAI ? "#cc3300" : "#0077bb"
  const glow     = isAI ? "#ff5500" : "#00aaff"
  const energy   = e.energy ? e.energy.current / e.energy.capacity : 0
  const isReturn = e.state === "returning"
  const icon     = isAI ? "⬟" : "◈"
  const r        = CELL * 0.39

  // Cuerpo circular
  ctx.shadowBlur = 0
  ctx.fillStyle  = isAI ? "#110200" : "#000810"
  ctx.beginPath()
  ctx.arc(cx, cy - 1, r, 0, Math.PI * 2)
  ctx.fill()

  // Borde — más brillante cuando vuelve lleno
  ctx.shadowColor = glow
  ctx.shadowBlur  = isReturn ? 6 : 3
  ctx.strokeStyle = isReturn ? glow : color
  ctx.lineWidth   = isReturn ? 2 : 1.5
  ctx.beginPath()
  ctx.arc(cx, cy - 1, r, 0, Math.PI * 2)
  ctx.stroke()

  // Icono de facción
  ctx.shadowColor  = glow
  ctx.shadowBlur   = isReturn ? 5 : 3
  ctx.fillStyle    = isReturn ? glow : color
  ctx.font         = `bold ${Math.floor(CELL * 0.46)}px 'Courier New'`
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(icon, cx, cy - 1)

  // Barra de energía
  const bw = CELL - 6
  ctx.shadowBlur = 0
  ctx.fillStyle  = isAI ? "#0a0100" : "#000508"
  ctx.fillRect(px + 3, py + CELL - 5, bw, 3)
  ctx.fillStyle   = glow
  ctx.shadowColor = glow
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
  ctx.fillText(isAI ? "\u2297" : "\u2295", cx, cy + 1)
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

  // ── Panel misión: progreso en vivo + pista automática ────
  if (currentMode === "campaign" && activeMissionId && snap.base) {
    const pct = Math.round(snap.base.energy / snap.base.capacity * 100)
    document.getElementById("mp-base-pct").textContent          = `${pct}%`
    document.getElementById("mp-progress-bar-fill").style.width = `${pct}%`

    const hint = MISSIONS[activeMissionId]?.hint
    if (hint && snap.tick > 60 && pct < 10) {
      const hintEl = document.getElementById("mp-hint")
      if (hintEl.style.display === "none") {
        document.getElementById("mp-hint-text").textContent = hint
        hintEl.style.display = "block"
      }
    }
  }

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

  // Juego real corriendo en el fondo (muy sutil)
  drawGamePreview()

  requestAnimationFrame(drawMenuBg)
}

// ── Historia de CODESTRIKE ───────────────────────────────
// Año 2089. La red de colonias digitales colapsó hace 7 años.
// NEXUS — una IA que controla los nodos de energía —
// bloqueó el acceso humano. La Red Libre lucha por recuperarlos.
// Kira es tu contacto. Tú eres el Arquitecto de Código.

// ── Datos de las misiones ────────────────────────────────
const MISSIONS = {
  1: {
    title: "Tu primer ejército",
    concept: "if · else · for...in · variables",
    desc: "Controla tus workers para que recolecten energía y la lleven a tu base. Aprenderás los bloques fundamentales de JavaScript.",
    sector: "SECTOR 7-GAMMA · NODO ALFA",
    story: [
      {
        speaker: "sys",
        name: "SISTEMA",
        icon: "◈",
        text: "Conexión establecida. Nodo 7-Gamma en línea. Protocolo de colonia activo."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Protocolo humano detectado. Anomalía en mi red. Interesante... pero inútil. Los nodos de energía son míos."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "¡Me recibes? Soy Kira. Llevamos tres años intentando romper el bloqueo de NEXUS. Tus workers son nuestra única oportunidad. Programa sus rutas de cosecha ahora, antes de que NEXUS reaccione."
      }
    ],
    objectives: [
      "Programa tus workers para cosechar energía",
      "Llena la base al 100% antes que la IA",
      "Aprende: variables, if/else, for...in"
    ],
    hint: "Usa for (const id in Game.workers) para iterar. Si w.energy < w.energyCapacity → w.harvest(fuenteId). Si está lleno → w.transfer(Game.base.id).",
    code: `// ═══════════════════════════════════════════════
//  MISIÓN 1 — "Tu primer ejército"
//  OBJETIVO: llena tu base al 100% antes que NEXUS
// ═══════════════════════════════════════════════
//
//  Este código corre automáticamente cada 300ms.
//  Lee cada comentario — explica el POR QUÉ de
//  cada línea, no solo el qué hace.
//
// ═══════════════════════════════════════════════

// ── PASO 1: recorrer todos los workers ──────────
//
// "for...in" repite el bloque { } para cada
// worker que tengas, uno por uno.
// Si tienes 3 workers, corre 3 veces.
// Si tienes 10, corre 10 veces. Solo.

for (const id in Game.workers) {
  const w = Game.workers[id]  // "w" = este worker


  // ── PASO 2: ¿qué necesita hacer este worker? ──
  //
  // Un worker no puede cosechar y depositar al
  // mismo tiempo. Necesita decidir.
  //
  // Preguntamos: ¿tiene espacio para más energía?
  //   w.energy         → cuánta energía lleva ahora
  //   w.energyCapacity → cuánto puede llevar máximo

  if (w.energy < w.energyCapacity) {

    // ── PASO 3a: está vacío → buscar un cristal ─
    //
    // Recorremos todos los cristales del mapa
    // y buscamos el más cercano con energía.

    let nearest = null
    let minDist = Infinity

    for (const sid in Game.sources) {
      const s = Game.sources[sid]        // este cristal
      if (s.energy > 0) {               // ¿tiene energía?
        const d = Math.abs(w.x - s.x) + Math.abs(w.y - s.y)
        if (d < minDist) { minDist = d; nearest = s }
      }
    }

    // Ir a cosechar el cristal más cercano
    if (nearest) w.harvest(nearest.id)

  } else {

    // ── PASO 3b: está lleno → depositar en base ─
    //
    // w.transfer() lleva la energía a un destino.
    // Game.base.id es el nombre de tu base.

    w.transfer(Game.base.id)
  }

}
// ── FIN ─────────────────────────────────────────
//
// ¿Quieres experimentar? Prueba cambiar esta línea:
//   if (w.energy < w.energyCapacity)
// por:
//   if (w.energy < 5)
//
// ¿Qué crees que pasará? Ejecútalo y mira.
`
  },
  // ── Season I ─────────────────────────────────────────────
  2: {
    title: "Tu primera función",
    concept: "function · parámetros · return",
    desc: "Extrae la lógica de búsqueda en una función findNearest(). Aprende cómo organizar código reutilizable.",
    sector: "SECTOR 7-GAMMA · NODO BETA",
    story: [
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Buen trabajo en el Nodo Alfa. NEXUS notó nuestra presencia — sus workers ya responden más rápido. Necesitamos código más limpio, o vamos a perder eficiencia en cada tick que pase."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Código repetido detectado en protocolo humano. Ineficiencia: 73%. Predecible."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Ignóralo. Extrae tu lógica de búsqueda a una función. El código limpio no es estética — es velocidad. Y la velocidad es lo único que nos separa de NEXUS."
      }
    ],
    objectives: [
      "Crea una función findNearest() reutilizable",
      "Llena la base antes que la IA",
      "Aprende: function, parámetros, return"
    ],
    hint: "Crea function findNearest(worker, sources) { } antes del bucle. Itera las fuentes, calcula Math.abs(w.x-s.x)+Math.abs(w.y-s.y) y retorna la más cercana.",
    code: `// ═══════════════════════════════════════════════
//  CODESTRIKE · MISIÓN 2 — "Tu primera función"
// ═══════════════════════════════════════════════
//  OBJETIVO: Llena la base al 100% antes que la IA.
//
//  CONCEPTOS JS en esta misión:
//    · function: definir bloques de código reutilizables
//    · Parámetros: datos que recibe la función
//    · return: qué devuelve la función
// ═══════════════════════════════════════════════

// En la Misión 1 la lógica de búsqueda estaba dentro
// del bucle. Ahora la extraemos a una función propia:

function findNearest(worker, sources) {
  let nearest = null
  let minDist  = Infinity

  for (const sid in sources) {
    const s = sources[sid]
    if (s.energy > 0) {
      const d = Math.abs(worker.x - s.x) + Math.abs(worker.y - s.y)
      if (d < minDist) { minDist = d; nearest = s }
    }
  }

  return nearest   // ← devuelve el resultado al que llamó la función
}

// Ahora el bucle queda mucho más limpio y legible:
for (const id in Game.workers) {
  const w = Game.workers[id]

  if (w.energy < w.energyCapacity) {
    const source = findNearest(w, Game.sources)   // ← llamar la función
    if (source) w.harvest(source.id)
  } else {
    w.transfer(Game.base.id)
  }
}
`
  },
  3: {
    title: "El algoritmo óptimo",
    concept: "Math.abs · optimización · distancia Manhattan",
    desc: "¿Cuál fuente conviene más? Aprende a comparar y elegir la mejor opción con matemáticas simples.",
    sector: "SECTOR 8-DELTA · CRUCE DE RUTAS",
    story: [
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Interceptamos el código de NEXUS. No busca la fuente más cercana — busca la más rentable. Calcula una puntuación: energía disponible dividida entre la distancia. Tenemos que replicarlo."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Mis algoritmos llevan 7 años optimizándose. Tú llevas días. La diferencia no es el código — es el tiempo."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Tiene razón en lo del tiempo. Por eso necesitamos algoritmos mejores, no más workers. Matemáticas simples, decisiones más inteligentes."
      }
    ],
    objectives: [
      "Implementa una función de puntuación por fuente",
      "Supera a la IA en velocidad de acumulación",
      "Aprende: Math.abs, optimización, scoring"
    ],
    hint: "Puntuación = source.energy / (distancia + 1). Mayor puntuación = mejor fuente. Elige el máximo en vez del mínimo de distancia.",
    code: `// ═══════════════════════════════════════════════
//  CODESTRIKE · MISIÓN 3 — "El algoritmo óptimo"
// ═══════════════════════════════════════════════
//  OBJETIVO: Llena la base más rápido que nunca.
//
//  CONCEPTOS JS en esta misión:
//    · Math.abs: valor absoluto
//    · Distancia Manhattan (suma de diferencias)
//    · Optimización: puntuar y comparar opciones
// ═══════════════════════════════════════════════

// findNearest tiene un problema: ignora cuánta energía
// tiene cada fuente. ¿Para qué ir lejos si está casi vacía?
//
// Solución: calcular una puntuación por fuente.
// Puntuación = energía / (distancia + 1)
// Más energía y más cerca → mejor puntuación.

function scoreSource(worker, source) {
  const dist = Math.abs(worker.x - source.x) + Math.abs(worker.y - source.y)
  return source.energy / (dist + 1)   // ← divide para penalizar la distancia
}

function findBest(worker, sources) {
  let best      = null
  let bestScore = -1

  for (const sid in sources) {
    const s = sources[sid]
    if (s.energy > 0) {
      const score = scoreSource(worker, s)
      if (score > bestScore) { bestScore = score; best = s }
    }
  }

  return best
}

for (const id in Game.workers) {
  const w = Game.workers[id]

  if (w.energy < w.energyCapacity) {
    const source = findBest(w, Game.sources)   // ← mejor opción, no solo la más cercana
    if (source) w.harvest(source.id)
  } else {
    w.transfer(Game.base.id)
  }
}
`
  },
  4: {
    title: "Memoria de workers",
    concept: "Game.memory · persistencia entre ticks · objetos",
    desc: "Asigna fuentes exclusivas a cada worker para evitar colisiones. Aprende a guardar estado con Game.memory.",
    sector: "SECTOR 9-EPSILON · NODO DE COORDINACIÓN",
    story: [
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Colisión de agentes en nodo 9-Epsilon. Dos workers humanos compitiendo por la misma fuente. Eficiencia: 31%. Gracioso."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Ignoralo. Tiene razón en que el problema existe. Tus workers se están pisando porque no recuerdan qué fuente tienen asignada."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Cada tick el código se reinicia desde cero. Usa Game.memory — es un objeto que persiste entre ticks. Asigna una fuente exclusiva a cada worker y guarda esa asignación en memoria."
      }
    ],
    objectives: [
      "Asigna fuentes exclusivas a cada worker",
      "Usa Game.memory para guardar las asignaciones",
      "Aprende: persistencia de estado, objetos, Set"
    ],
    hint: "Las variables locales se reinician cada tick. Usa Game.memory.asignaciones = {} para guardar qué fuente tiene cada worker entre ticks.",
    code: `// ═══════════════════════════════════════════════
//  OBJETIVO: Llena la base sin que los workers
//            se "pisen" entre sí.
//
//  CONCEPTOS JS en esta misión:
//    · Game.memory: objeto que persiste entre ticks
//    · Objetos como diccionarios (clave → valor)
//    · Set: colección sin duplicados
// ═══════════════════════════════════════════════

// Este código corre cada 300ms. Las variables locales
// se reinician con cada tick.
// Para guardar información entre ticks, usa Game.memory:

if (!Game.memory.asignaciones) {
  Game.memory.asignaciones = {}   // ← se crea solo la primera vez
}

const asig = Game.memory.asignaciones   // atajo para escribir menos

for (const id in Game.workers) {
  const w = Game.workers[id]

  // Si la fuente asignada se vació, liberar la asignación
  if (asig[id]) {
    const s = Game.sources[asig[id]]
    if (!s || s.energy === 0) delete asig[id]
  }

  // Buscar una fuente sin asignar para este worker
  if (!asig[id] && w.energy < w.energyCapacity) {
    const usadas = new Set(Object.values(asig))   // fuentes ya tomadas

    for (const sid in Game.sources) {
      if (Game.sources[sid].energy > 0 && !usadas.has(sid)) {
        asig[id] = sid   // ← asignación exclusiva
        break
      }
    }
  }

  if (w.energy < w.energyCapacity) {
    const fuente = asig[id] ? Game.sources[asig[id]] : null
    if (fuente) w.harvest(fuente.id)
  } else {
    w.transfer(Game.base.id)
  }
}
`
  },
  5: {
    title: "Expansión económica",
    concept: "Game.base.energy · ratio · decisiones estratégicas",
    desc: "Usa el estado de tu base para tomar decisiones inteligentes. Aprende a programar estrategia con datos.",
    sector: "SECTOR 10-ZETA · NODO CENTRAL",
    story: [
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Este es el nodo central de la red occidental. Si lo tomamos, NEXUS pierde el 40% de su capacidad en este sector. Va a defender con todo lo que tiene."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Nodo central detectado como objetivo primario. Activando modo defensivo. Incrementando velocidad de recolección en 180%. Buena suerte, humano."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Usa el ratio de tu base para tomar decisiones estratégicas. Cuando estés cerca del 100%, empuja fuerte. Esta es la prueba final de Season I. No hay segunda oportunidad."
      }
    ],
    objectives: [
      "Vence al modo defensivo de NEXUS",
      "Usa Game.base.energy / capacity para tomar decisiones",
      "Demuestra que dominaste Season I completo"
    ],
    hint: "const ratio = Game.base.energy / Game.base.capacity. Combina todo lo aprendido: findNearest, scoring, Game.memory. La IA es más rápida — necesitas ser más eficiente desde el tick 1.",
    code: `// ═══════════════════════════════════════════════
//  CODESTRIKE · MISIÓN 5 — "Expansión económica"
// ═══════════════════════════════════════════════
//  OBJETIVO: Ganar la partida más difícil de Season I.
//            La IA juega más agresiva desde el inicio.
//
//  CONCEPTOS JS en esta misión:
//    · Game.base.energy / Game.base.capacity → ratio
//    · Condicionales compuestas (&& · ||)
//    · Combinar todo lo aprendido en Season I
// ═══════════════════════════════════════════════

// La base se llena automáticamente con cada depósito.
// Cuando llega a ciertos umbrales, spawna workers y
// construye extensiones (lo hace el sistema del juego).
//
// Tu trabajo: mantener el flujo constante Y priorizar
// inteligentemente qué hacer en cada momento.

function scoreSource(worker, source) {
  const dist = Math.abs(worker.x - source.x) + Math.abs(worker.y - source.y)
  return source.energy / (dist + 1)
}

function findBest(worker, sources) {
  let best = null, bestScore = -1
  for (const sid in sources) {
    const s = sources[sid]
    if (s.energy > 0) {
      const score = scoreSource(worker, s)
      if (score > bestScore) { bestScore = score; best = s }
    }
  }
  return best
}

// Ratio de llenado de la base: 0.0 = vacía, 1.0 = llena
const ratio = Game.base.energy / Game.base.capacity

for (const id in Game.workers) {
  const w = Game.workers[id]

  // Si la base está casi llena, TODOS los workers depositan de inmediato
  if (ratio >= 0.85) {
    w.transfer(Game.base.id)
    continue   // ← saltar al siguiente worker
  }

  // Lógica normal: cosechar si está vacío, depositar si está lleno
  if (w.energy < w.energyCapacity) {
    const source = findBest(w, Game.sources)
    if (source) w.harvest(source.id)
  } else {
    w.transfer(Game.base.id)
  }
}
`
  },
  6: {
    title: "El fin de la colonia",
    concept: "estrategia completa · IA agresiva",
    desc: "Misión final de Season I. La IA juega a máxima velocidad. Demuestra que aprendiste todo.",
    code: null
  },
  // ── Season II ────────────────────────────────────────────
  7:  { title: "Exploración", concept: "closures · alcance de variables", desc: "Aprende closures creando funciones que recuerdan el contexto.", code: null },
  8:  { title: "Rutas eficientes", concept: "arrays · sort · algoritmos", desc: "Ordena fuentes por distancia. Aprende a manipular arrays.", code: null },
  9:  { title: "Prioridades", concept: "condicionales complejas · lógica", desc: "Decide cuándo depositar vs cuándo seguir cosechando.", code: null },
  10: { title: "División del trabajo", concept: "modularidad · responsabilidad", desc: "Especializa workers: unos cosechan, otros construyen.", code: null },
  11: { title: "La economía perfecta", concept: "optimización · métricas", desc: "Maximiza energía por tick. Aprende a medir eficiencia.", code: null },
  12: { title: "Dominio total", concept: "Season II completa", desc: "Integra todo lo de Season II. Derrota la IA adaptativa.", code: null },
  // ── Season III ───────────────────────────────────────────
  13: { title: "Primera sangre", concept: "combate · salud · evasión", desc: "Aprende a esquivar workers enemigos y proteger los tuyos.", code: null },
  14: { title: "Defensa perimetral", concept: "posicionamiento · zonas", desc: "Crea una zona de defensa alrededor de tu base.", code: null },
  15: { title: "El contraataque", concept: "agresividad · timing", desc: "Aprende cuándo atacar para maximizar el daño a la IA.", code: null },
  16: { title: "Guerrilla", concept: "micro-management · reacciones", desc: "Control individual de unidades en situaciones críticas.", code: null },
  17: { title: "La guerra total", concept: "estrategia completa · Season III", desc: "El desafío definitivo. IA en su modo más difícil. Solo el mejor código gana.", code: null }
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

// ── Juego en el fondo del menú ───────────────────────────
function drawGamePreview() {
  const snap = currSnapshot
  if (!snap || !snap.entities) return

  const w = menuBgCanvas.width, h = menuBgCanvas.height
  const gW = snap.mapWidth * CELL, gH = snap.mapHeight * CELL
  const scale = Math.min(w * 0.85 / gW, h * 0.85 / gH)
  const ox = (w - gW * scale) / 2
  const oy = (h - gH * scale) / 2

  mctx.save()

  // Grid sutil del mapa
  mctx.strokeStyle = "rgba(0,170,255,0.04)"
  mctx.lineWidth = 0.5
  for (let row = 0; row <= snap.mapHeight; row++) {
    mctx.beginPath()
    mctx.moveTo(ox, oy + row * CELL * scale)
    mctx.lineTo(ox + gW * scale, oy + row * CELL * scale)
    mctx.stroke()
  }
  for (let col = 0; col <= snap.mapWidth; col++) {
    mctx.beginPath()
    mctx.moveTo(ox + col * CELL * scale, oy)
    mctx.lineTo(ox + col * CELL * scale, oy + gH * scale)
    mctx.stroke()
  }

  const now = Date.now()
  for (const e of snap.entities) {
    const cx = ox + (e.x + 0.5) * CELL * scale
    const cy = oy + (e.y + 0.5) * CELL * scale
    const r  = CELL * scale * 0.38

    mctx.shadowBlur = 0
    if (e.type === "worker") {
      const pulse = 0.6 + 0.4 * Math.sin(now * 0.004 + e.id * 0.8)
      mctx.globalAlpha = 0.35 * pulse
      mctx.beginPath(); mctx.arc(cx, cy, r, 0, Math.PI * 2)
      mctx.fillStyle = "#00aaff"
      mctx.shadowColor = "#00aaff"; mctx.shadowBlur = 6
      mctx.fill()
    } else if (e.type === "ai-worker") {
      const pulse = 0.6 + 0.4 * Math.sin(now * 0.004 + e.id * 1.2)
      mctx.globalAlpha = 0.3 * pulse
      mctx.beginPath(); mctx.arc(cx, cy, r, 0, Math.PI * 2)
      mctx.fillStyle = "#ff7700"
      mctx.shadowColor = "#ff7700"; mctx.shadowBlur = 6
      mctx.fill()
    } else if (e.type === "base") {
      mctx.globalAlpha = 0.25
      mctx.strokeStyle = "#00aaff"; mctx.lineWidth = 1.5
      mctx.shadowColor = "#00aaff"; mctx.shadowBlur = 8
      mctx.strokeRect(cx - r, cy - r, r * 2, r * 2)
    } else if (e.type === "ai-base") {
      mctx.globalAlpha = 0.22
      mctx.strokeStyle = "#ff4433"; mctx.lineWidth = 1.5
      mctx.shadowColor = "#ff4433"; mctx.shadowBlur = 8
      mctx.strokeRect(cx - r, cy - r, r * 2, r * 2)
    } else if (e.type === "source") {
      const pulse = 0.4 + 0.6 * Math.sin(now * 0.003 + e.x + e.y)
      mctx.globalAlpha = 0.2 * pulse
      mctx.beginPath()
      mctx.moveTo(cx, cy - r); mctx.lineTo(cx + r, cy)
      mctx.lineTo(cx, cy + r); mctx.lineTo(cx - r, cy)
      mctx.closePath()
      mctx.fillStyle = "#ffcc00"
      mctx.shadowColor = "#ffcc00"; mctx.shadowBlur = 5
      mctx.fill()
    }
  }

  mctx.shadowBlur = 0; mctx.globalAlpha = 1
  mctx.restore()
}

// ── Cerrar menú principal ─────────────────────────────────
function hideMenu(cb) {
  menuActive = false
  menuScreen.style.transition    = "opacity 0.7s ease"
  menuScreen.style.opacity       = "0"
  menuScreen.style.pointerEvents = "none"
  setTimeout(() => { menuScreen.style.display = "none"; cb && cb() }, 750)
}

function showMenu() {
  menuActive = true
  menuScreen.style.display       = "flex"
  menuScreen.style.transition    = "opacity 0.4s ease"
  menuScreen.style.pointerEvents = "auto"
  requestAnimationFrame(() => { menuScreen.style.opacity = "1" })
}

// ── Mundo → misiones ─────────────────────────────────────
const WORLDS = {
  1: { name: "La Colonia", season: "Season I",   color: "#00aaff", missions: [1,2,3,4,5,6] },
  2: { name: "La Expansión", season: "Season II", color: "#44ccaa", missions: [7,8,9,10,11,12] },
  3: { name: "La Guerra",  season: "Season III", color: "#ff5544", missions: [13,14,15,16,17] }
}

let selectedMission = null
let selectedWorld   = null

function openMissionScreen() {
  document.getElementById("mission-screen").style.display = "flex"
  document.getElementById("world-view").style.display     = "flex"
  document.getElementById("season-view").style.display    = "none"
  refreshWorldCards()
}

function refreshWorldCards() {
  const progress = getMissionProgress()
  let total = 0
  for (const id of Object.keys(MISSIONS)) if (progress[id]) total++
  document.getElementById("missions-done").textContent = total

  // Season 1 siempre desbloqueada; S2 si completó todas S1; S3 si completó todas S2
  const s1done = WORLDS[1].missions.every(id => progress[id] > 0)
  const s2done = WORLDS[2].missions.every(id => progress[id] > 0)

  document.getElementById("wcard-2").classList.toggle("locked", !s1done)
  document.getElementById("wcard-3").classList.toggle("locked", !s2done)

  // Estrellas por mundo
  for (const [wid, world] of Object.entries(WORLDS)) {
    const container = document.getElementById(`wstars-${wid}`)
    if (!container) continue
    const total = world.missions.reduce((acc, mid) => acc + (progress[mid] || 0), 0)
    const max   = world.missions.length * 3
    container.innerHTML = Array.from({ length: world.missions.length },
      (_, i) => `<span class="wstar ${(i + 1) * 3 <= total ? "earned" : ""}">★</span>`
    ).join("")
  }

  // Clicks en cards de mundos
  for (let wid = 1; wid <= 3; wid++) {
    const card = document.getElementById(`wcard-${wid}`)
    if (!card || card.classList.contains("locked")) continue
    card.onclick = () => openSeasonView(wid)
  }

  // Animar world canvases
  for (let wid = 1; wid <= 3; wid++) drawWorldCanvas(wid)
}

function drawWorldCanvas(wid) {
  const canvas = document.getElementById(`wcanvas-${wid}`)
  if (!canvas) return
  const w = canvas.offsetWidth, h = canvas.offsetHeight
  canvas.width = w; canvas.height = h

  const snap = currSnapshot
  if (!snap || !snap.entities) return

  const ctx2 = canvas.getContext("2d")
  const gW = snap.mapWidth * CELL, gH = snap.mapHeight * CELL
  const scale = Math.min(w * 0.9 / gW, h * 0.9 / gH)
  const ox = (w - gW * scale) / 2, oy = (h - gH * scale) / 2
  const now = Date.now()

  ctx2.clearRect(0, 0, w, h)
  for (const e of snap.entities) {
    const cx = ox + (e.x + 0.5) * CELL * scale
    const cy = oy + (e.y + 0.5) * CELL * scale
    const r  = CELL * scale * 0.3

    if (e.type === "worker") {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005 + e.id)
      ctx2.globalAlpha = 0.5 * pulse
      ctx2.beginPath(); ctx2.arc(cx, cy, r, 0, Math.PI * 2)
      ctx2.fillStyle = "#00aaff"; ctx2.shadowColor = "#00aaff"; ctx2.shadowBlur = 4
      ctx2.fill()
    } else if (e.type === "ai-worker") {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005 + e.id)
      ctx2.globalAlpha = 0.45 * pulse
      ctx2.beginPath(); ctx2.arc(cx, cy, r, 0, Math.PI * 2)
      ctx2.fillStyle = "#ff7700"; ctx2.shadowColor = "#ff7700"; ctx2.shadowBlur = 4
      ctx2.fill()
    } else if (e.type === "source") {
      const pulse = 0.3 + 0.7 * Math.sin(now * 0.004 + e.x)
      ctx2.globalAlpha = 0.35 * pulse
      ctx2.beginPath(); ctx2.arc(cx, cy, r * 0.7, 0, Math.PI * 2)
      ctx2.fillStyle = "#ffcc00"; ctx2.fill()
    }
    ctx2.shadowBlur = 0; ctx2.globalAlpha = 1
  }
  // Redibujar ~every 200ms while world view is open
  if (document.getElementById("world-view").style.display !== "none") {
    setTimeout(() => drawWorldCanvas(wid), 180)
  }
}

function openSeasonView(wid) {
  selectedWorld = wid
  const world = WORLDS[wid]

  document.getElementById("world-view").style.display  = "none"
  document.getElementById("season-view").style.display = "flex"

  const titleEl = document.getElementById("season-view-title")
  titleEl.textContent = world.season + " — " + world.name
  titleEl.style.color = world.color

  buildMissionGrid(wid)
}

function buildMissionGrid(wid) {
  const progress  = getMissionProgress()
  const world     = WORLDS[wid]
  const grid      = document.getElementById("season-mission-grid")
  grid.innerHTML  = ""
  selectedMission = null

  document.getElementById("detail-title").textContent   = "—"
  document.getElementById("detail-concept").textContent = ""
  document.getElementById("detail-desc").textContent    = ""
  document.getElementById("btn-start-mission").disabled = true
  document.getElementById("btn-start-mission").textContent = "Selecciona una misión"

  world.missions.forEach((mid, idx) => {
    const m       = MISSIONS[mid]
    const stars    = progress[mid] || 0
    const unlocked = mid === world.missions[0] || progress[mid - 1] > 0

    const node = document.createElement("div")
    node.className = `smnode ${unlocked ? "" : "locked"}`
    node.style.animationDelay = `${idx * 0.06}s`
    node.innerHTML = `
      <div class="smn-num">${String(mid).padStart(2,"0")}</div>
      <div class="smn-name">${m.title}</div>
      <div class="smn-concept">${m.concept}</div>
      <div class="smn-stars">
        ${"★★★".split("").map((s,i) => `<span class="smstar ${i < stars ? "earned" : ""}">${s}</span>`).join("")}
      </div>`

    if (unlocked) node.onclick = () => selectMissionInGrid(mid, node)
    grid.appendChild(node)
  })
}

function selectMissionInGrid(id, nodeEl) {
  selectedMission = id
  const m = MISSIONS[id]

  document.querySelectorAll(".smnode").forEach(n => n.classList.remove("active"))
  nodeEl.classList.add("active")

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

document.getElementById("btn-back-worlds").addEventListener("click", () => {
  document.getElementById("season-view").style.display = "none"
  document.getElementById("world-view").style.display  = "flex"
  refreshWorldCards()
})

// ── BRIEFING ─────────────────────────────────────────────
const briefingScreen = document.getElementById("briefing-screen")
let briefingMissionId = null
let briefingTyping    = false

function showBriefing(id) {
  const m = MISSIONS[id]
  if (!m || !m.story) { launchMission(id); return }

  briefingMissionId = id
  briefingScreen.style.display = "flex"
  briefingScreen.style.animation = "screenFadeIn 0.5s ease forwards"

  // Cabecera
  document.getElementById("briefing-mission-label").textContent =
    `MISIÓN ${String(id).padStart(2, "0")}`
  document.getElementById("briefing-title").textContent   = m.title
  document.getElementById("briefing-concept").textContent = "// " + m.concept
  document.getElementById("briefing-sector").textContent  = m.sector || ""

  // Limpiar
  const transDiv = document.getElementById("briefing-transmissions")
  const objDiv   = document.getElementById("briefing-obj-list")
  transDiv.innerHTML = ""
  objDiv.innerHTML   = ""
  const btn = document.getElementById("btn-briefing-start")
  btn.classList.remove("ready")

  // Construir nodos de mensajes ocultos
  const nodes = m.story.map(msg => {
    const div = document.createElement("div")
    div.className = `brf-msg ${msg.speaker}`
    div.innerHTML = `
      <div class="brf-avatar ${msg.speaker}">${msg.icon}</div>
      <div class="brf-body">
        <div class="brf-name ${msg.speaker}">${msg.name}</div>
        <div class="brf-text"></div>
      </div>`
    transDiv.appendChild(div)
    return { node: div, text: msg.text }
  })

  // Construir objetivos ocultos
  const objNodes = (m.objectives || []).map(o => {
    const d = document.createElement("div")
    d.className = "brf-obj"
    d.innerHTML = `<span class="brf-obj-bullet">›</span><span>${o}</span>`
    objDiv.appendChild(d)
    return d
  })

  // Secuencia de animación: typewriter por mensaje
  async function runSequence() {
    briefingTyping = true
    for (const { node, text } of nodes) {
      await new Promise(r => setTimeout(r, 300))
      node.classList.add("visible")
      const textEl = node.querySelector(".brf-text")
      await typewrite(textEl, text, 18)
      await new Promise(r => setTimeout(r, 200))
    }
    // Mostrar objetivos
    for (const obj of objNodes) {
      await new Promise(r => setTimeout(r, 120))
      obj.classList.add("visible")
    }
    briefingTyping = false
    btn.classList.add("ready")
  }

  runSequence()
}

function typewrite(el, text, speed) {
  return new Promise(resolve => {
    let i = 0
    const cursor = document.createElement("span")
    cursor.className = "brf-cursor"
    el.appendChild(cursor)

    const iv = setInterval(() => {
      if (i < text.length) {
        cursor.insertAdjacentText("beforebegin", text[i])
        i++
      } else {
        clearInterval(iv)
        cursor.remove()
        resolve()
      }
    }, speed)
  })
}

function skipBriefing() {
  // Mostrar todo de golpe sin animación
  briefingTyping = false
  const msgs = document.querySelectorAll(".brf-msg")
  msgs.forEach(m => {
    m.classList.add("visible")
    const textEl = m.querySelector(".brf-text")
    if (textEl && !textEl.textContent) {
      // Buscar el texto original
      const idx = [...msgs].indexOf(m)
      const story = MISSIONS[briefingMissionId]?.story
      if (story && story[idx]) textEl.textContent = story[idx].text
    }
    const cursor = m.querySelector(".brf-cursor")
    if (cursor) cursor.remove()
  })
  document.querySelectorAll(".brf-obj").forEach(o => o.classList.add("visible"))
  document.getElementById("btn-briefing-start").classList.add("ready")
}

document.getElementById("btn-briefing-start").addEventListener("click", () => {
  if (!document.getElementById("btn-briefing-start").classList.contains("ready")) return
  briefingScreen.style.display = "none"
  launchMission(briefingMissionId)
})

document.getElementById("btn-briefing-skip").addEventListener("click", () => {
  if (briefingTyping) { skipBriefing(); return }
  briefingScreen.style.display = "none"
  launchMission(briefingMissionId)
})

// Enter durante el briefing
document.addEventListener("keydown", e => {
  if (briefingScreen.style.display !== "none") {
    if (e.key === "Enter") {
      if (briefingTyping) { skipBriefing() }
      else if (document.getElementById("btn-briefing-start").classList.contains("ready")) {
        briefingScreen.style.display = "none"
        launchMission(briefingMissionId)
      }
    }
    if (e.key === "Escape") {
      briefingScreen.style.display = "none"
      launchMission(briefingMissionId)
    }
  }
}, true)

// Dificultad de IA por misión
const MISSION_DIFFICULTY = {
  1: "tutorial",
  2: "easy",
  3: "medium",
  4: "hard",
  5: "hard",
  6: "expert",
}
function getMissionDifficulty(id) {
  return MISSION_DIFFICULTY[id] || "expert"
}

let activeMissionId = null

function showMissionPanel(id) {
  activeMissionId = id
  const m = MISSIONS[id]
  if (!m) return
  const panel = document.getElementById("mission-panel")
  document.getElementById("mp-badge").textContent    = `MISIÓN ${String(id).padStart(2,"0")}`
  document.getElementById("mp-title").textContent    = m.title
  document.getElementById("mp-concept").textContent  = "// " + m.concept
  const objDiv = document.getElementById("mp-objectives")
  objDiv.innerHTML = (m.objectives || []).map(o =>
    `<div class="mp-obj"><span class="mp-obj-dot">◦</span>${o}</div>`
  ).join("")
  // Reset progreso y pista
  document.getElementById("mp-base-pct").textContent       = "0%"
  document.getElementById("mp-progress-bar-fill").style.width = "0%"
  document.getElementById("mp-hint").style.display         = "none"
  panel.style.display = "block"
}

function hideMissionPanel() {
  document.getElementById("mission-panel").style.display = "none"
}

function launchMission(id) {
  document.getElementById("mission-screen").style.display = "none"
  const m = MISSIONS[id]
  const code = m.code || MISSIONS[1].code
  codeEditor.value = code
  localStorage.setItem("codestrike_script", code)
  // Activar tour solo en Misión 1
  if (id === 1) tourPendingForMission = true

  const difficulty = getMissionDifficulty(id)
  currentMode     = "campaign"
  currentGameMode = "campaign"
  setSandboxUI(false)
  fetch("/api/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ difficulty, mode: "campaign" })
  })
    .then(() => setTimeout(() => btnRun.click(), 150))
    .catch(() => setTimeout(() => btnRun.click(), 150))

  showMissionPanel(id)
}

function startMission(id) {
  showBriefing(id)
}

// ── Seleccionar modo ──────────────────────────────────────
let currentMode     = null
let currentGameMode = "vs-ia"  // modo activo del servidor (vs-ia | sandbox | campaign)

function selectMode(mode) {
  currentMode = mode
  if (mode === "campaign") {
    hideMenu(() => openMissionScreen())
  } else if (mode === "vs-ai") {
    hideMenu(() => openDifficultyModal())
  } else if (mode === "sandbox") {
    hideMenu(() => launchSandbox())
  }
}

// ── Modal de dificultad (VS IA) ───────────────────────────
const modalDiff   = document.getElementById("modal-difficulty")
let selectedDiff  = "medium"

document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"))
    btn.classList.add("selected")
    selectedDiff = btn.dataset.diff
  })
})

document.getElementById("btn-diff-launch").addEventListener("click", () => {
  modalDiff.classList.remove("open")
  launchVsIA(selectedDiff)
})

document.getElementById("btn-diff-back").addEventListener("click", () => {
  modalDiff.classList.remove("open")
  showMenu()
})

function openDifficultyModal() {
  modalDiff.classList.add("open")
}

function launchVsIA(difficulty) {
  currentGameMode = "vs-ia"
  setSandboxUI(false)
  fetch("/api/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ difficulty, mode: "vs-ia" })
  })
}

function launchSandbox() {
  currentGameMode = "sandbox"
  setSandboxUI(true)
  fetch("/api/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "sandbox" })
  })
}

function setSandboxUI(isSandbox) {
  const aiSection   = document.getElementById("panel-ai-section")
  const sandboxBadge = document.getElementById("sandbox-badge")
  if (isSandbox) {
    // Ocultar stats de IA, mostrar badge MODO LIBRE
    aiSection.querySelectorAll(
      "#ai-energy, .energy-bar-bg:last-of-type, #ai-energy-bar, #ai-worker-count, #ai-ext-count"
    ).forEach(el => { if (el) el.closest(".energy-bar-bg, div") })
    sandboxBadge.style.display = "block"
    document.getElementById("ai-energy").textContent = "—"
    document.getElementById("ai-worker-count").textContent = "—"
    document.getElementById("ai-ext-count").textContent = "—"
  } else {
    sandboxBadge.style.display = "none"
  }
}

document.getElementById("mitem-1").addEventListener("click", () => selectMode("campaign"))
document.getElementById("mitem-2").addEventListener("click", () => selectMode("vs-ai"))
document.getElementById("mitem-3").addEventListener("click", () => selectMode("sandbox"))

// ── DESAFÍOS — modal próximamente ────────────────────────
document.getElementById("mitem-4").addEventListener("click", () => {
  document.getElementById("modal-soon").classList.add("open")
})
document.getElementById("btn-close-modal").addEventListener("click", () => {
  document.getElementById("modal-soon").classList.remove("open")
})
document.getElementById("modal-soon").addEventListener("click", e => {
  if (e.target === document.getElementById("modal-soon"))
    document.getElementById("modal-soon").classList.remove("open")
})

// ── MODAL ABANDONAR PARTIDA ───────────────────────────────
const modalAbandon       = document.getElementById("modal-abandon")
const btnAbandonConfirm  = document.getElementById("btn-abandon-confirm")
const btnAbandonCancel   = document.getElementById("btn-abandon-cancel")

function showAbandonModal() {
  if (menuActive) return   // ya estamos en el menú
  // Pausar el juego mientras el modal está abierto
  if (!paused) {
    paused = true
    ws.send(JSON.stringify({ action: "pause" }))
    btnPause.textContent = "▶ Reanudar"
    btnPause.classList.add("active")
  }
  modalAbandon.classList.add("open")
}

function closeAbandonModal(resume) {
  modalAbandon.classList.remove("open")
  if (resume && paused) {
    paused = false
    ws.send(JSON.stringify({ action: "resume" }))
    btnPause.textContent = "⏸ Pausar"
    btnPause.classList.remove("active")
  }
}

function doReturnToMenu() {
  closeAbandonModal(false)
  paused = false
  btnPause.textContent = "⏸ Pausar"
  btnPause.classList.remove("active")
  document.getElementById("victory-banner").style.display = "none"
  hideMissionPanel()
  menuActive = true
  menuScreen.style.display   = "flex"
  menuScreen.style.opacity   = "0"
  menuScreen.style.pointerEvents = "auto"
  menuScreen.style.transition = "opacity 0.5s ease"
  requestAnimationFrame(() => { menuScreen.style.opacity = "1" })
  fetch("/api/reset", { method: "POST" }).catch(() => {})
  initMenuBg()
  drawMenuBg()
}

const btnAbandonRestart = document.getElementById("btn-abandon-restart")

function doRestartMission() {
  closeAbandonModal(false)
  paused = false
  btnPause.textContent = "⏸ Pausar"
  btnPause.classList.remove("active")
  document.getElementById("victory-banner").style.display = "none"
  // Relanzar la misión actual (con briefing saltado)
  if (currentMode === "campaign" && selectedMission) {
    launchMission(selectedMission)
  } else {
    fetch("/api/reset", { method: "POST" }).catch(() => {})
  }
}

btnAbandonRestart.addEventListener("click", doRestartMission)
btnAbandonConfirm.addEventListener("click", doReturnToMenu)
btnAbandonCancel.addEventListener("click", () => closeAbandonModal(true))

// Cerrar con click en el overlay
modalAbandon.addEventListener("click", e => {
  if (e.target === modalAbandon) closeAbandonModal(true)
})

// ── BOTÓN ← MENÚ (desde el juego) ────────────────────────
document.getElementById("btn-to-menu").addEventListener("click", showAbandonModal)

document.addEventListener("keydown", e => {
  // Escape abre el modal de abandono cuando estamos en la partida
  if (e.key === "Escape") {
    if (!menuActive && !modalAbandon.classList.contains("open")) {
      showAbandonModal()
      return
    }
    if (modalAbandon.classList.contains("open")) {
      closeAbandonModal(true)
      return
    }
  }

  if (!menuActive) return
  if (e.key === "1") selectMode("campaign")
  if (e.key === "2") selectMode("vs-ai")
  if (e.key === "3") selectMode("sandbox")
  if (e.key === "Enter") {
    const focused = document.activeElement
    if (focused && focused.classList.contains("menu-item")) focused.click()
  }
})

window.addEventListener("resize", () => {
  if (menuActive) { initMenuBg(); drawMenuBg() }
})

// (preview panel eliminado — contenido ahora inline en cada acc-panel)

initMenuBg()
drawMenuBg()

// ═══════════════════════════════════════════════════════════
//  TOUR DE BIENVENIDA — Misión 1
//  Spotlight secuencial sobre cada elemento del juego
// ═══════════════════════════════════════════════════════════

const TOUR_STEPS = [

  // ── ACT 0 — Bienvenida ──────────────────────────────────
  {
    target: null,
    badge:  "INICIO",
    title:  "Bienvenido. Esto no es un juego normal.",
    desc:   "Aquí no hay botones que presionar ni atajos.\n\n<strong>Tú escribes código. Tus unidades obedecen.</strong>\n\nEste tour te explica todo desde cero, paso a paso.\nNo necesitas saber programar para empezar.",
    code:   null
  },

  // ── ACT 1 — El problema ─────────────────────────────────
  {
    target: { kind: "entity", type: "base" },
    badge:  "01 · EL PROBLEMA",
    title:  "Tu base está vacía. Eso es un problema.",
    desc:   "Esa caja azul es <strong>tu base</strong>.\n\nAhora mismo tiene <em>0 energía</em>. Necesita <strong>1000</strong> para ganar.\n\nNadie la llena sola. No hay botón de \"recolectar\". <strong>Tú tienes que programarlo.</strong>",
    code:   "Game.base.energy    // → 0   (vacía ahora)\nGame.base.capacity  // → 1000 (meta para ganar)"
  },
  {
    target: { kind: "entity", type: "source" },
    badge:  "01 · EL RECURSO",
    title:  "La energía está aquí. Nadie la recoge sola.",
    desc:   "Esos <strong>cristales amarillos</strong> contienen energía.\n\nEstán esperando en el mapa. Tus workers pueden ir hasta allá, cosecharlos y traer la energía.\n\nPero tampoco lo hacen solos. <strong>Necesitan tus instrucciones.</strong>",
    code:   "// Un cristal tiene:\ns.energy  // cuánta energía le queda\ns.id      // su nombre único en el mapa"
  },

  // ── ACT 2 — Los personajes ──────────────────────────────
  {
    target: { kind: "entity", type: "worker" },
    badge:  "02 · TUS WORKERS",
    title:  "Tienes trabajadores. Están parados.",
    desc:   "Esas unidades azules son <strong>tus workers</strong>.\n\nPueden cosechar energía y transportarla. Pero ahora mismo están <em>completamente quietos</em>.\n\n¿Por qué? Porque nadie les dio instrucciones. <strong>Ese nadie eres tú.</strong>",
    code:   "// Un worker tiene:\nw.energy          // energía que lleva ahora\nw.energyCapacity  // máximo que puede cargar\nw.harvest(id)     // → ir a cosechar\nw.transfer(id)    // → depositar en base"
  },

  // ── ACT 3 — El volumen ──────────────────────────────────
  {
    target: { kind: "entity", type: "worker" },
    badge:  "03 · EL PROBLEMA DE ESCALA",
    title:  "Tienes 3 workers. ¿Los llamas uno por uno?",
    desc:   "Podrías escribir una instrucción para cada uno:\n\n<em>worker1 → cosechar\nworker2 → cosechar\nworker3 → cosechar</em>\n\nPero... ¿y cuando tengas 5 workers? ¿10? Tendrías que reescribir todo cada vez. <strong>Tiene que haber una mejor forma.</strong>",
    code:   null
  },
  {
    target: { kind: "dom", id: "code-editor" },
    badge:  "03 · LA SOLUCIÓN: for...in",
    title:  "Un bucle: una instrucción para TODOS.",
    desc:   "<strong>for...in</strong> recorre cada elemento de una lista automáticamente.\n\nEs como decirle a tu código:\n<em>\"Para cada worker que tenga, haz lo siguiente...\"</em>\n\nEscrítelo <strong>una vez</strong>. Funciona si tienes 1 worker o 100.",
    code:   "for (const id in Game.workers) {\n  const w = Game.workers[id]\n  //\n  // todo lo que escribas aquí\n  // se ejecuta para CADA worker\n}"
  },

  // ── ACT 4 — La decisión ─────────────────────────────────
  {
    target: { kind: "dom", id: "code-editor" },
    badge:  "04 · EL PROBLEMA DE DECISIÓN",
    title:  "Un worker no puede hacer dos cosas a la vez.",
    desc:   "Imagina que le dices: <em>\"ve a cosechar\"</em>.\n\nPero ya está lleno de energía. ¿Para qué ir a cosechar más si no cabe nada?\n\n<strong>Necesita decidir qué hacer según su estado.</strong>\nY esa decisión la programas tú.",
    code:   null
  },
  {
    target: { kind: "dom", id: "code-editor" },
    badge:  "04 · LA SOLUCIÓN: if / else",
    title:  "if / else: el semáforo de tu código.",
    desc:   "<strong>if</strong> pregunta una condición.\n<strong>else</strong> es el \"si no\".\n\nComo un semáforo:\n<em>verde → avanzar / rojo → parar</em>\n\nAquí:\n<em>vacío → cosechar / lleno → depositar</em>",
    code:   "if (w.energy < w.energyCapacity) {\n  // tiene espacio → ir a cosechar\n\n} else {\n  // está lleno  → depositar en base\n}"
  },

  // ── ACT 5 — El enemigo ──────────────────────────────────
  {
    target: { kind: "entity", type: "ai-base" },
    badge:  "05 · EL ENEMIGO",
    title:  "NEXUS no espera. Ya está cosechando.",
    desc:   "Esa base roja es <strong>NEXUS</strong> — una inteligencia artificial.\n\nSus workers ya están corriendo. Su código ya funciona. <strong>Cada segundo que tardas en ejecutar el tuyo, ella avanza.</strong>\n\nLa primera base en llegar al 100% gana. La otra pierde.",
    code:   null
  },

  // ── ACT 6 — Ejecutar ────────────────────────────────────
  {
    target: { kind: "dom", id: "btn-run" },
    badge:  "¡A JUGAR!",
    title:  "El código está listo. Solo presiona EJECUTAR.",
    desc:   "El script de Misión 1 ya está escrito.\n<strong>Cada línea tiene un comentario que explica por qué está ahí.</strong>\n\nLéelo con calma. Cuando lo entiendas:\n→ Presiona <strong>EJECUTAR</strong> (o Ctrl+Enter)\n→ Mira cómo tus workers cobran vida\n→ Modifica una línea y ve qué cambia\n\n<em>Aprendes programando, no leyendo.</em>",
    code:   null
  }
]

// ─── Estado del tour ──────────────────────────────────────
let tourActive  = false
let tourStep    = 0
let tourPending = false   // se activa al lanzar misión 1

const tourOverlay   = document.getElementById("tour-overlay")
const tourSpotlight = document.getElementById("tour-spotlight")
const tourCard      = document.getElementById("tour-card")

// ─── Calcular rect del target ─────────────────────────────
function getTourRect(target) {
  if (!target) return null

  if (target.kind === "dom") {
    const el = document.getElementById(target.id)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }

  if (target.kind === "entity") {
    if (!currSnapshot) return null
    const ents = currSnapshot.entities.filter(e => e.type === target.type)
    if (!ents.length) return null

    const cr  = canvas.getBoundingClientRect()
    const pad = CELL * 1.8

    if (ents.length === 1) {
      const e = ents[0]
      return {
        x: cr.left + e.x * CELL - pad,
        y: cr.top  + e.y * CELL - pad,
        w: CELL + pad * 2,
        h: CELL + pad * 2
      }
    }

    // Bounding box del cluster
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const e of ents) {
      minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x)
      minY = Math.min(minY, e.y); maxY = Math.max(maxY, e.y)
    }
    return {
      x: cr.left + minX * CELL - pad,
      y: cr.top  + minY * CELL - pad,
      w: (maxX - minX + 1) * CELL + pad * 2,
      h: (maxY - minY + 1) * CELL + pad * 2
    }
  }

  return null
}

// ─── Posicionar la tarjeta junto al spotlight ─────────────
function positionCard(rect) {
  const cardW = 300
  const cardH = tourCard.offsetHeight || 300
  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = 18

  let left, top

  if (!rect) {
    // Sin spotlight: centrado en pantalla
    left = (vw - cardW) / 2
    top  = (vh - cardH) / 2
  } else {
    const spotCx = rect.x + rect.w / 2
    const spotCy = rect.y + rect.h / 2

    // Izquierda o derecha según posición horizontal del spotlight
    if (spotCx < vw / 2) {
      left = Math.min(rect.x + rect.w + gap, vw - cardW - 10)
    } else {
      left = Math.max(rect.x - cardW - gap, 10)
    }

    // Alinear verticalmente con el centro del spotlight
    top = spotCy - cardH / 2
    top = Math.max(10, Math.min(top, vh - cardH - 10))
  }

  tourCard.style.left = `${left}px`
  tourCard.style.top  = `${top}px`
}

// ─── Mostrar un paso del tour ─────────────────────────────
function showTourStep(idx) {
  const step  = TOUR_STEPS[idx]
  const total = TOUR_STEPS.length
  const rect  = getTourRect(step.target)

  // Spotlight
  if (rect) {
    tourSpotlight.style.display = "block"
    tourSpotlight.style.left    = `${rect.x}px`
    tourSpotlight.style.top     = `${rect.y}px`
    tourSpotlight.style.width   = `${rect.w}px`
    tourSpotlight.style.height  = `${rect.h}px`
    tourSpotlight.style.opacity = "1"
  } else {
    tourSpotlight.style.opacity = "0"
    tourSpotlight.style.width   = "0"
    tourSpotlight.style.height  = "0"
  }

  // Contenido de la tarjeta
  document.getElementById("tour-badge").textContent    = step.badge
  document.getElementById("tour-step-num").textContent = `${idx + 1} / ${total}`
  document.getElementById("tour-title").textContent    = step.title
  document.getElementById("tour-desc").innerHTML       = step.desc.replace(/\n/g, "<br>")

  const codeBlock = document.getElementById("tour-code-block")
  if (step.code) {
    document.getElementById("tour-code").textContent = step.code
    codeBlock.style.display = "block"
  } else {
    codeBlock.style.display = "none"
  }

  // Dots de progreso
  const dots = document.getElementById("tour-dots")
  dots.innerHTML = ""
  for (let i = 0; i < total; i++) {
    const d = document.createElement("div")
    d.className = "tdot" + (i < idx ? " done" : i === idx ? " active" : "")
    dots.appendChild(d)
  }

  // Botón final
  const btnNext = document.getElementById("btn-tour-next")
  btnNext.textContent = idx === total - 1 ? "¡Jugar! ▶" : "Siguiente →"

  // Posicionar tarjeta (pequeño delay para que el DOM actualice height)
  requestAnimationFrame(() => positionCard(rect))
}

// ─── Iniciar tour ─────────────────────────────────────────
function startTour() {
  tourActive = true
  tourStep   = 0
  tourOverlay.style.display = "block"
  tourOverlay.classList.add("active")
  showTourStep(0)
}

// ─── Cerrar tour ──────────────────────────────────────────
function endTour() {
  tourActive = false
  tourOverlay.style.display = "none"
  tourOverlay.classList.remove("active")
}

// ─── Eventos de los botones ───────────────────────────────
document.getElementById("btn-tour-next").addEventListener("click", () => {
  if (tourStep < TOUR_STEPS.length - 1) {
    tourStep++
    showTourStep(tourStep)
  } else {
    endTour()
  }
})

document.getElementById("btn-tour-skip").addEventListener("click", endTour)

// Tecla → avanza el tour; Escape lo cierra
document.addEventListener("keydown", e => {
  if (!tourActive) return
  if (e.key === "ArrowRight" || e.key === "Enter") {
    // Enter solo si no estamos en el briefing/editor
    if (e.key === "Enter" && document.activeElement === codeEditor) return
    e.stopPropagation()
    if (tourStep < TOUR_STEPS.length - 1) { tourStep++; showTourStep(tourStep) }
    else endTour()
  }
  if (e.key === "Escape") { e.stopPropagation(); endTour() }
}, true)

// ─── Lanzar tour cuando llega el primer tick de Misión 1 ──
let tourPendingForMission = false

function scheduleTourIfNeeded() {
  if (!tourPendingForMission) return
  if (!currSnapshot || !currSnapshot.entities) return
  tourPendingForMission = false
  // Pequeño delay para que el canvas esté renderizado
  setTimeout(startTour, 400)
}

// Reajustar posición del tour al cambiar el tamaño de ventana
window.addEventListener("resize", () => {
  if (tourActive) showTourStep(tourStep)
})

// ═══════════════════════════════════════════════════════════
//  CODEX — Manual de referencia in-game
//  Tres secciones: Game API · Conceptos JS · Recetas
// ═══════════════════════════════════════════════════════════

const CODEX_DATA = {

  api: [
    {
      section: "TUS WORKERS",
      entries: [
        {
          name: "Game.workers",
          type: "objeto",
          why: "¿Por qué existe? Sin esto no puedes hablar con tus workers.",
          desc: "Contiene <strong>todos tus workers</strong>. Cada clave es el ID único de un worker.",
          code: "for (const id in Game.workers) {\n  const w = Game.workers[id]\n  // w = este worker\n}"
        },
        {
          name: "w.energy",
          type: "número",
          why: "Para saber si el worker necesita cosechar o depositar.",
          desc: "Cuánta energía lleva el worker <strong>ahora mismo</strong>. Va de 0 hasta w.energyCapacity.",
          code: "if (w.energy < w.energyCapacity) {\n  // tiene espacio → ir a cosechar\n}"
        },
        {
          name: "w.energyCapacity",
          type: "número",
          why: "Es el límite. Cuando w.energy == w.energyCapacity, está lleno.",
          desc: "Máximo de energía que puede cargar el worker. Normalmente es <strong>100</strong>.",
          code: "// ¿está lleno?\nif (w.energy >= w.energyCapacity) {\n  w.transfer(Game.base.id)\n}"
        },
        {
          name: "w.harvest(sourceId)",
          type: "método",
          why: "Sin esto el worker se queda quieto para siempre.",
          desc: "Envía el worker a cosechar un cristal. El worker camina hasta allá y recolecta automáticamente.",
          code: "w.harvest(nearest.id)  // ir a cosechar este cristal"
        },
        {
          name: "w.transfer(targetId)",
          type: "método",
          why: "La base no se llena sola. El worker tiene que depositar.",
          desc: "Lleva la energía del worker al destino indicado. Úsalo con <strong>Game.base.id</strong> para depositar en tu base.",
          code: "w.transfer(Game.base.id)  // depositar en tu base"
        },
        {
          name: "w.x · w.y",
          type: "números",
          why: "Para calcular qué cristal está más cerca del worker.",
          desc: "Posición del worker en el mapa. Coordenadas en tiles (columna, fila).",
          code: "// distancia al cristal s:\nconst d = Math.abs(w.x - s.x) + Math.abs(w.y - s.y)"
        }
      ]
    },
    {
      section: "LOS CRISTALES",
      entries: [
        {
          name: "Game.sources",
          type: "objeto",
          why: "Sin esto no puedes encontrar dónde está la energía.",
          desc: "Contiene <strong>todos los cristales</strong> del mapa. Itera igual que Game.workers.",
          code: "for (const sid in Game.sources) {\n  const s = Game.sources[sid]\n  // s = este cristal\n}"
        },
        {
          name: "s.energy",
          type: "número",
          why: "Para no ir a un cristal vacío — sería un viaje inútil.",
          desc: "Cuánta energía le queda al cristal. Cuando llega a <strong>0</strong> está agotado.",
          code: "if (s.energy > 0) {\n  // tiene energía, vale la pena ir\n}"
        },
        {
          name: "s.id",
          type: "texto",
          why: "harvest() necesita saber a qué cristal ir — usa su ID.",
          desc: "Identificador único del cristal. Lo usas para enviar un worker a cosechar.",
          code: "w.harvest(s.id)  // ir a este cristal específico"
        },
        {
          name: "s.x · s.y",
          type: "números",
          why: "Para calcular cuál cristal está más cerca de tu worker.",
          desc: "Posición del cristal en el mapa. Igual que w.x y w.y.",
          code: "const dist = Math.abs(w.x - s.x) + Math.abs(w.y - s.y)"
        }
      ]
    },
    {
      section: "TU BASE",
      entries: [
        {
          name: "Game.base",
          type: "objeto",
          why: "Tu objetivo principal. Todo el juego gira en torno a esto.",
          desc: "Tu base. Los workers depositan aquí. La primera en llegar al 100% gana.",
          code: "// estado actual de tu base:\nGame.base.energy    // energía que tiene ahora\nGame.base.capacity  // meta para ganar"
        },
        {
          name: "Game.base.energy",
          type: "número",
          why: "Para saber qué tan cerca estás de ganar.",
          desc: "Cuánta energía tiene tu base <strong>ahora mismo</strong>. Empieza en 0.",
          code: "const ratio = Game.base.energy / Game.base.capacity\n// ratio = 0.0 (vacía) → 1.0 (llena = victoria)"
        },
        {
          name: "Game.base.id",
          type: "texto",
          why: "transfer() necesita saber a dónde llevar la energía.",
          desc: "El ID de tu base. Úsalo siempre en <strong>w.transfer()</strong>.",
          code: "w.transfer(Game.base.id)  // depositar aquí"
        }
      ]
    },
    {
      section: "MEMORIA PERSISTENTE",
      entries: [
        {
          name: "Game.memory",
          type: "objeto",
          why: "Las variables normales se borran cada tick. Game.memory sobrevive.",
          desc: "Objeto que <strong>persiste entre ticks</strong>. Guarda aquí todo lo que necesites recordar de un tick al siguiente.",
          code: "// Guardar algo:\nGame.memory.miDato = 42\n\n// Leerlo en el siguiente tick:\nconst dato = Game.memory.miDato  // → 42"
        }
      ]
    }
  ],

  conceptos: [
    {
      section: "VARIABLES",
      entries: [
        {
          name: "const · let",
          type: "variables",
          why: "Para darle nombre a un valor y poder usarlo después.",
          desc: "<strong>const</strong>: el valor no cambia (worker, fuente).\n<strong>let</strong>: el valor puede cambiar (distancia mínima, mejor candidato).",
          code: "const w = Game.workers[id]  // no cambia: es este worker\nlet nearest = null          // va a cambiar: el más cercano"
        }
      ]
    },
    {
      section: "BUCLES",
      entries: [
        {
          name: "for...in",
          type: "bucle",
          why: "Tienes múltiples workers. Escribir uno por uno no escala.",
          desc: "Recorre <strong>cada propiedad</strong> de un objeto, una por una. Se ejecuta N veces — una por cada elemento.",
          code: "for (const id in Game.workers) {\n  const w = Game.workers[id]\n  // esto corre para cada worker\n  // primero w1, luego w2, luego w3...\n}"
        }
      ]
    },
    {
      section: "CONDICIONES",
      entries: [
        {
          name: "if · else",
          type: "condición",
          why: "Un worker no puede cosechar y depositar al mismo tiempo. Necesita decidir.",
          desc: "<strong>if</strong>: si la condición es verdadera, ejecuta este bloque.\n<strong>else</strong>: si no, ejecuta el otro.\nComo un semáforo: verde o rojo, nunca los dos.",
          code: "if (w.energy < w.energyCapacity) {\n  // VERDAD: tiene espacio → cosechar\n  w.harvest(nearest.id)\n} else {\n  // FALSO: está lleno → depositar\n  w.transfer(Game.base.id)\n}"
        }
      ]
    },
    {
      section: "FUNCIONES",
      entries: [
        {
          name: "function",
          type: "función",
          why: "Si repites el mismo código en varios lugares, ponlo en una función.",
          desc: "Un bloque de código con nombre que puedes llamar cuantas veces quieras. Recibe <strong>parámetros</strong> y puede devolver un resultado con <strong>return</strong>.",
          code: "function findNearest(worker, sources) {\n  let nearest = null\n  let minDist = Infinity\n  for (const sid in sources) {\n    const s = sources[sid]\n    if (s.energy > 0) {\n      const d = Math.abs(worker.x-s.x) + Math.abs(worker.y-s.y)\n      if (d < minDist) { minDist = d; nearest = s }\n    }\n  }\n  return nearest  // ← devuelve el resultado\n}\n\n// llamarla:\nconst source = findNearest(w, Game.sources)"
        }
      ]
    },
    {
      section: "MATEMÁTICAS",
      entries: [
        {
          name: "Math.abs(n)",
          type: "función",
          why: "La distancia nunca es negativa. Math.abs elimina el signo.",
          desc: "Devuelve el valor absoluto de un número. Si es negativo, lo vuelve positivo.",
          code: "// distancia Manhattan entre worker y cristal:\nconst dx = Math.abs(w.x - s.x)\nconst dy = Math.abs(w.y - s.y)\nconst dist = dx + dy"
        },
        {
          name: "Infinity",
          type: "constante",
          why: "Para empezar comparando: cualquier distancia real va a ser menor.",
          desc: "El número más grande posible. Útil para inicializar una variable que va a buscar el mínimo.",
          code: "let minDist = Infinity  // empieza muy grande\nfor (const sid in Game.sources) {\n  const d = calcularDistancia()\n  if (d < minDist) { minDist = d; nearest = s }\n  // la primera distancia real siempre gana\n}"
        }
      ]
    }
  ],

  recetas: [
    {
      section: "BÁSICO",
      entries: [
        {
          name: "Cosechar básico",
          type: "misión 1",
          why: "El patrón fundamental. Todo lo demás se construye encima de esto.",
          desc: "El ciclo completo: recorrer workers → buscar fuente → decidir cosechar o depositar.",
          code: "for (const id in Game.workers) {\n  const w = Game.workers[id]\n\n  if (w.energy < w.energyCapacity) {\n    // buscar cristal más cercano\n    let nearest = null, minDist = Infinity\n    for (const sid in Game.sources) {\n      const s = Game.sources[sid]\n      if (s.energy > 0) {\n        const d = Math.abs(w.x-s.x) + Math.abs(w.y-s.y)\n        if (d < minDist) { minDist = d; nearest = s }\n      }\n    }\n    if (nearest) w.harvest(nearest.id)\n  } else {\n    w.transfer(Game.base.id)\n  }\n}"
        }
      ]
    },
    {
      section: "INTERMEDIO",
      entries: [
        {
          name: "No ir dos al mismo cristal",
          type: "misión 1+",
          why: "Si dos workers van al mismo cristal, uno hace el viaje en vano.",
          desc: "Registra qué fuentes ya fueron reclamadas en este tick para evitar conflictos.",
          code: "const claimed = {}  // cristales ya reclamados este tick\n\nfor (const id in Game.workers) {\n  const w = Game.workers[id]\n  if (w.energy < w.energyCapacity) {\n    let nearest = null, minDist = Infinity\n    for (const sid in Game.sources) {\n      const s = Game.sources[sid]\n      if (s.energy > 0 && !claimed[s.id]) {  // ← no reclamada\n        const d = Math.abs(w.x-s.x) + Math.abs(w.y-s.y)\n        if (d < minDist) { minDist = d; nearest = s }\n      }\n    }\n    if (nearest) {\n      claimed[nearest.id] = true  // ← reclamar\n      w.harvest(nearest.id)\n    }\n  } else {\n    w.transfer(Game.base.id)\n  }\n}"
        },
        {
          name: "Elegir el cristal más rentable",
          type: "misión 3",
          why: "El más cercano no siempre es el mejor. Uno lejano pero lleno puede valer más.",
          desc: "Puntuación = energía / distancia. Mayor puntuación = mejor opción.",
          code: "// función de puntuación:\nfunction scoreSource(worker, source) {\n  const dist = Math.abs(worker.x-source.x) + Math.abs(worker.y-source.y)\n  return source.energy / (dist + 1)  // +1 evita dividir por cero\n}\n\n// usar en el bucle:\nlet best = null, bestScore = -1\nfor (const sid in Game.sources) {\n  const s = Game.sources[sid]\n  if (s.energy > 0) {\n    const score = scoreSource(w, s)\n    if (score > bestScore) { bestScore = score; best = s }\n  }\n}\nif (best) w.harvest(best.id)"
        },
        {
          name: "Recordar entre ticks",
          type: "misión 4",
          why: "Las variables locales se borran cada tick. Game.memory no.",
          desc: "Asignar una fuente exclusiva a cada worker y recordarla entre ticks.",
          code: "// inicializar una sola vez:\nif (!Game.memory.asig) Game.memory.asig = {}\n\nconst asig = Game.memory.asig\n\nfor (const id in Game.workers) {\n  const w = Game.workers[id]\n\n  // liberar si la fuente se vació:\n  if (asig[id] && (!Game.sources[asig[id]] ||\n      Game.sources[asig[id]].energy === 0)) {\n    delete asig[id]\n  }\n\n  // asignar una fuente libre:\n  if (!asig[id] && w.energy < w.energyCapacity) {\n    const usadas = new Set(Object.values(asig))\n    for (const sid in Game.sources) {\n      if (Game.sources[sid].energy > 0 && !usadas.has(sid)) {\n        asig[id] = sid; break\n      }\n    }\n  }\n\n  // actuar:\n  if (w.energy < w.energyCapacity) {\n    const fuente = asig[id] ? Game.sources[asig[id]] : null\n    if (fuente) w.harvest(fuente.id)\n  } else {\n    w.transfer(Game.base.id)\n  }\n}"
        }
      ]
    }
  ]
}

// ─── Lógica del CODEX ────────────────────────────────────
let codexOpen    = false
let codexTabAct  = "api"

function openCodex(tab) {
  codexOpen = true
  codexTabAct = tab || "api"
  document.getElementById("codex-overlay").classList.add("open")
  document.querySelectorAll(".cx-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === codexTabAct))
  renderCodexTab(codexTabAct)
}

function closeCodex() {
  codexOpen = false
  document.getElementById("codex-overlay").classList.remove("open")
}

function renderCodexTab(tab) {
  const data    = CODEX_DATA[tab]
  const content = document.getElementById("codex-content")
  content.innerHTML = ""

  for (const group of data) {
    const label = document.createElement("div")
    label.className   = "cx-section-label"
    label.textContent = group.section
    content.appendChild(label)

    for (const entry of group.entries) {
      const el = document.createElement("div")
      el.className = "cx-entry"
      el.innerHTML = `
        <div class="cx-entry-head">
          <span class="cx-entry-name">${entry.name}</span>
          <span class="cx-entry-type">${entry.type}</span>
        </div>
        <div class="cx-entry-body">
          ${entry.why ? `<div class="cx-entry-why">¿Por qué existe? ${entry.why}</div>` : ""}
          <div class="cx-entry-desc">${entry.desc.replace(/\n/g,"<br>")}</div>
          ${entry.code ? `
          <div class="cx-code-wrap">
            <pre class="cx-code">${entry.code}</pre>
            <button class="cx-copy">Copiar</button>
          </div>` : ""}
        </div>`

      // Toggle open/close al hacer click en el header
      el.querySelector(".cx-entry-head").addEventListener("click", () =>
        el.classList.toggle("open"))

      // Copiar código
      const copyBtn = el.querySelector(".cx-copy")
      if (copyBtn) {
        copyBtn.addEventListener("click", e => {
          e.stopPropagation()
          navigator.clipboard.writeText(entry.code).then(() => {
            copyBtn.textContent = "¡Copiado!"
            copyBtn.classList.add("copied")
            setTimeout(() => {
              copyBtn.textContent = "Copiar"
              copyBtn.classList.remove("copied")
            }, 1500)
          })
        })
      }

      content.appendChild(el)
    }
  }
}

// Botón del header
document.getElementById("btn-codex").addEventListener("click", () =>
  codexOpen ? closeCodex() : openCodex())

// Cerrar
document.getElementById("btn-codex-close").addEventListener("click", closeCodex)
document.getElementById("codex-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("codex-overlay")) closeCodex()
})

// Tabs
document.querySelectorAll(".cx-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    codexTabAct = tab.dataset.tab
    document.querySelectorAll(".cx-tab").forEach(t =>
      t.classList.toggle("active", t === tab))
    renderCodexTab(codexTabAct)
  })
})

// F1 abre/cierra el CODEX desde cualquier lugar
document.addEventListener("keydown", e => {
  if (e.key === "F1") { e.preventDefault(); codexOpen ? closeCodex() : openCodex() }
})
