// ═══════════════════════════════════════════════════════════
//  CODESTRIKE — Visual v2 "La Red de Neones"
//  60fps con interpolación entre ticks, glow, rutas animadas
// ═══════════════════════════════════════════════════════════

// ─── ESTILOS OVERLAY DE VICTORIA ──────────────────────────
;(function injectStyles() {
  const s = document.createElement("style")
  s.textContent = `
    #victory-overlay {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; pointer-events: auto;
      animation: voFadeIn 0.4s ease forwards;
    }
    @keyframes voFadeIn { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
    .vo-box {
      background: #02080f;
      border: 1px solid var(--vo-accent, #00aaff44);
      padding: 48px 64px; text-align: center; min-width: 360px;
      font-family: 'Share Tech Mono', monospace;
      box-shadow: 0 0 60px var(--vo-glow, #00aaff22);
    }
    .vo-title {
      font-size: 2.8rem; font-weight: bold; letter-spacing: 4px;
      color: var(--vo-color, #00aaff);
      text-shadow: 0 0 30px var(--vo-glow, #00aaff88);
      margin-bottom: 8px;
    }
    .vo-sub  { color: #446688; font-size: 0.82rem; margin-bottom: 20px; }
    .vo-stars { font-size: 2rem; color: #ffbb00; letter-spacing: 6px;
                text-shadow: 0 0 10px #ffbb0055; margin-bottom: 6px; }
    .vo-tick  { color: #253444; font-size: 0.72rem; margin-bottom: 36px; }
    .vo-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .vo-btn { padding: 11px 24px; border: none; cursor: pointer;
              font-family: 'Share Tech Mono', monospace; font-size: 0.78rem;
              letter-spacing: 2px; transition: all 0.15s; }
    .vo-primary   { background: #00aaff; color: #000; }
    .vo-primary:hover { background: #33ccff; transform: translateY(-1px); }
    .vo-secondary { background: transparent; border: 1px solid #00aaff44; color: #00aaff88; }
    .vo-secondary:hover { border-color: #00aaff; color: #00aaff; }
    .vo-ghost { background: transparent; color: #2a3a4a; }
    .vo-ghost:hover { color: #446688; }
  `
  document.head.appendChild(s)
})()

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

// ─── IDENTIDAD VISUAL POR FACCIÓN ─────────────────────────
// Cada facción define su paleta completa; se consulta en todas las funciones de render
const FACTION_THEMES = {
  nexus: {
    // Suelo — más claro que antes para contrastar con los muros oscuros
    floorBase:      "#0c1018",   // azul-negro industrial (era #030506)
    concaveColor:   "#080c12",
    hasGrid:        true,
    gridColor:      "rgba(255,68,0,0.06)",
    hasGrass:       false,
    hasStoneCrack:  false,
    hasCrystalVein: false,
    floorVarLight:  "rgba(255,80,0,0.04)",     // panel elevado naranja sutil
    floorVarDark:   "rgba(0,0,0,0.18)",         // panel hundido
    aoStrength:     0.52,                        // AO más fuerte para compensar el suelo más claro
    // Muros — volumétrico (profundidad por vecinos) + bordes cortantes NEXUS
    wallEdgeBase:   "#1e0f08",    // color del tile de borde (más claro, cálido)
    wallCoreAlpha:  0.82,          // oscurecimiento máximo del núcleo interior (0–1)
    wallBleedRGB:   "14,5,2",      // tinte del gradiente muro→suelo (warm dark orange)
    wallRound:      false,
    wallEdgeGlow:   true,
    wallEdgeColor:  "#ff3300",
    wallEdgeBlur:   3,
    hlRGB:          "255,80,0",
    shAlphas:       [0.30, 0.42, 0.54, 0.65],
    peakAccentRGB:  "255,60,0",
    peakFillRGBA:   "rgba(255,40,0,0.04)",
    // Sources
    srcHarvestHalo: [255,120,0],
    srcHarvestRing: [255,140,30],
    srcHaloOuter:   [200,80,0],
    srcCoreHigh:    [255,200,100],
    srcCoreMid:     [255,80,0],
    srcCoreLow:     [140,30,0],
    srcCoreDeep:    [60,10,0],
    srcShadowColor: "#ff4400",
    srcEdgeRGB:     [255,120,30],
    srcSparkRGB:    [255,180,100],
    // Workers (jugador)
    workerBg:       "#0a0200",
    workerColor:    "#331000",
    workerGlowColor:"#ff4400",
    workerIcon:     "◈",
    // Noise canvas
    particleRGB:    "255,70,0",
    scanlineRGBA:   "rgba(8,2,0,0.12)",
  },
  forjadores: {
    // Suelo cálido — piedra forjada, más visible que antes
    floorBase:      "#100e08",   // marrón-oscuro caliente (era #060501)
    concaveColor:   "#0c0b06",
    hasGrid:        false,
    gridColor:      "rgba(255,190,60,0.04)",
    hasGrass:       true,
    hasStoneCrack:  true,        // grietas finas de piedra — desgaste natural
    hasCrystalVein: false,
    floorVarLight:  "rgba(200,140,60,0.04)",   // piedra cálida levantada
    floorVarDark:   "rgba(0,0,0,0.16)",         // grieta oscura
    aoStrength:     0.50,
    // Muros — volumétrico + redondeados grandes (piedra Forjadores)
    wallEdgeBase:   "#1c180a",    // piedra cálida en el borde
    wallCoreAlpha:  0.80,
    wallBleedRGB:   "12,9,2",
    wallRound:      true,
    wallEdgeGlow:   false,
    wallEdgeColor:  "#ffaa00",
    wallEdgeBlur:   2,
    hlRGB:          "200,140,20",
    shAlphas:       [0.28, 0.38, 0.48, 0.58],
    peakAccentRGB:  "200,140,0",
    peakFillRGBA:   "rgba(180,120,0,0.05)",
    // Sources
    srcHarvestHalo: [255,200,0],
    srcHarvestRing: [255,220,60],
    srcHaloOuter:   [220,160,0],
    srcCoreHigh:    [255,248,180],
    srcCoreMid:     [240,180,20],
    srcCoreLow:     [180,100,0],
    srcCoreDeep:    [80,40,0],
    srcShadowColor: "#ffcc00",
    srcEdgeRGB:     [255,220,60],
    srcSparkRGB:    [255,252,220],
    // Workers
    workerBg:       "#080600",
    workerColor:    "#221400",
    workerGlowColor:"#ffaa00",
    workerIcon:     "◈",
    // Noise
    particleRGB:    "200,130,0",
    scanlineRGBA:   "rgba(8,6,0,0.10)",
  },
  convergencia: {
    // Suelo volcánico profundo — obsidiana con vetas de cristal y lava
    floorBase:      "#0a0614",   // violeta-negro (basalto)
    concaveColor:   "#07040e",
    hasGrid:        false,       // sin grid industrial — es orgánico/alienígena
    gridColor:      "rgba(180,60,255,0.05)",
    hasGrass:       false,
    hasCrystalVein: true,        // grietas con cristal luminoso + lava interior
    hasStoneCrack:  false,
    floorVarLight:  "rgba(160,60,255,0.04)",   // obsidiana iridiscente
    floorVarDark:   "rgba(0,0,0,0.18)",         // roca muerta
    aoStrength:     0.52,
    // Muros — volumétrico + semi-redondeados (Convergencia híbrida)
    wallEdgeBase:   "#160a30",    // violeta oscuro en el borde
    wallCoreAlpha:  0.84,
    wallBleedRGB:   "8,3,18",
    wallRound:      true,
    wallEdgeGlow:   true,
    wallEdgeColor:  "#9900ee",
    wallEdgeBlur:   3,
    hlRGB:          "160,60,255",
    shAlphas:       [0.28, 0.38, 0.50, 0.62],
    peakAccentRGB:  "140,40,255",
    peakFillRGBA:   "rgba(120,20,255,0.05)",
    // Sources (inestables — multicolor)
    srcHarvestHalo: [180,60,255],
    srcHarvestRing: [200,100,255],
    srcHaloOuter:   [140,40,220],
    srcCoreHigh:    [220,180,255],
    srcCoreMid:     [160,60,255],
    srcCoreLow:     [80,20,180],
    srcCoreDeep:    [30,0,80],
    srcShadowColor: "#aa22ff",
    srcEdgeRGB:     [200,80,255],
    srcSparkRGB:    [230,200,255],
    // Workers
    workerBg:       "#030010",
    workerColor:    "#110030",
    workerGlowColor:"#aa22ff",
    workerIcon:     "◈",
    // Noise
    particleRGB:    "160,40,255",
    scanlineRGBA:   "rgba(4,0,10,0.12)",
  },
}

// Facción activa — se actualiza cuando arranca una misión
let currentFaction = "nexus"

// ─── ESTADO DE ANIMACIÓN ──────────────────────────────────
let currSnapshot  = null
let prevEntities  = {}   // id → entity del tick anterior
let lastTickTime  = 0
let animFrame     = 0
let canvasSized   = false

// ─── NOISE CANVAS (pre-renderizado, se rehace solo si cambia el mapa) ──
let noiseCanvas = null
let noiseSeedW  = 0
function buildNoiseCanvas(w, h) {
  if (noiseCanvas && noiseSeedW === w) return  // ya existe para este tamaño
  noiseSeedW  = w
  noiseCanvas = document.createElement("canvas")
  noiseCanvas.width  = w
  noiseCanvas.height = h
  const nc  = noiseCanvas.getContext("2d")
  const th  = FACTION_THEMES[currentFaction] ?? FACTION_THEMES.nexus
  // Micro-partículas: color según facción
  const count = Math.floor(w * h * 0.06)
  for (let i = 0; i < count; i++) {
    const nx = Math.random() * w | 0
    const ny = Math.random() * h | 0
    const a  = (0.02 + Math.random() * 0.06).toFixed(3)
    nc.fillStyle = `rgba(${th.particleRGB},${a})`
    nc.fillRect(nx, ny, 1, 1)
  }
  // Líneas de escáner horizontales (cada 4px) — tinte según facción
  for (let sy = 0; sy < h; sy += 4) {
    nc.fillStyle = th.scanlineRGBA
    nc.fillRect(0, sy, w, 1)
  }
}

// ─── ZOOM + PAN ────────────────────────────────────────────
let zoom = 1.0
let panX = 0, panY = 0
const ZOOM_MIN = 0.3, ZOOM_MAX = 6.0
let isPanning = false
let panDragOriginX = 0, panDragOriginY = 0

// ─── ANIMACIÓN DE CÁMARA ───────────────────────────────────
let camAnim = null  // { fromZoom, fromX, fromY, toZoom, toX, toY, t0, dur }

function animateCameraTo(toZoom, toX, toY, dur = 700) {
  camAnim = {
    fromZoom: zoom, fromX: panX, fromY: panY,
    toZoom, toX, toY,
    t0: performance.now(), dur
  }
}

function tickCamera() {
  if (!camAnim) return
  const t   = Math.min(1, (performance.now() - camAnim.t0) / camAnim.dur)
  const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t  // easeInOutQuad
  zoom = lerp(camAnim.fromZoom, camAnim.toZoom, ease)
  panX = lerp(camAnim.fromX,   camAnim.toX,   ease)
  panY = lerp(camAnim.fromY,   camAnim.toY,   ease)
  if (t >= 1) camAnim = null
}

// Calcula zoom + pan para ver el mapa completo centrado en el canvas
function fitViewToMap(mapW, mapH) {
  const cw     = canvas.width  || 800
  const ch     = canvas.height || 440
  const mapPxW = (mapW ?? 40) * CELL
  const mapPxH = (mapH ?? 22) * CELL
  const z      = Math.min(cw / mapPxW, ch / mapPxH) * 0.96
  const fz     = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z))
  return { zoom: fz, panX: (cw - mapPxW * fz) / 2, panY: (ch - mapPxH * fz) / 2 }
}

// Redimensiona el canvas al contenedor real — hace el canvas responsivo
function resizeCanvasToWrapper() {
  const wrapper = canvas.parentElement
  if (!wrapper) return
  const newW = Math.max(400, wrapper.clientWidth  - 24)
  const newH = Math.max(300, wrapper.clientHeight - 24)
  if (canvas.width !== newW || canvas.height !== newH) {
    canvas.width  = newW
    canvas.height = newH
  }
}

function resetView() {
  if (currSnapshot) {
    const { mapWidth, mapHeight } = currSnapshot
    const f = fitViewToMap(mapWidth, mapHeight)
    animateCameraTo(f.zoom, f.panX, f.panY, 500)
  } else {
    zoom = 1.0; panX = 0; panY = 0
  }
}

// ─── CINEMATIC INTRO — al iniciar misión ──────────────────
let pendingCinematic = false

function triggerMissionStartCamera(snap) {
  const base = snap.entities.find(e => e.type === "base")
  const bx   = base ? (base.x + 0.5) * CELL : snap.mapWidth  * CELL / 2
  const by   = base ? (base.y + 0.5) * CELL : snap.mapHeight * CELL / 2

  // 1. Instantáneo: close-up en la base del jugador (zoom 3.5×)
  const closeZoom = 3.5
  zoom = closeZoom
  panX = canvas.width  / 2 - bx * closeZoom
  panY = canvas.height / 2 - by * closeZoom

  // 2. Tras 500ms: zoom out suave al mapa completo
  setTimeout(() => {
    const f = fitViewToMap(snap.mapWidth, snap.mapHeight)
    animateCameraTo(f.zoom, f.panX, f.panY, 1100)
  }, 500)
}

// Convierte posición de pantalla → tile del mapa
function screenToTile(screenX, screenY) {
  const rect   = canvas.getBoundingClientRect()
  const scaleX = canvas.width  / rect.width
  const scaleY = canvas.height / rect.height
  const cx = (screenX - rect.left) * scaleX
  const cy = (screenY - rect.top)  * scaleY
  return {
    tx: Math.floor((cx - panX) / (CELL * zoom)),
    ty: Math.floor((cy - panY) / (CELL * zoom))
  }
}

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
  updateComms(snap)
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

// ─── CONTROL DE VELOCIDAD ─────────────────────────────────
let currentSpeed = 1

function setGameSpeed(mult) {
  currentSpeed = mult
  fetch("/api/speed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ multiplier: mult })
  })
  document.querySelectorAll(".btn-speed").forEach(b => {
    b.classList.toggle("active", Number(b.dataset.speed) === mult)
  })
}

// Inyectar botones de velocidad junto al botón de pausa
;(function injectSpeedButtons() {
  const pauseBtn = document.getElementById("btn-pause")
  if (!pauseBtn) return
  const wrap = document.createElement("div")
  wrap.style.cssText = "display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle"
  ;[1, 2, 3].forEach(m => {
    const b = document.createElement("button")
    b.className   = "btn-speed" + (m === 1 ? " active" : "")
    b.dataset.speed = String(m)
    b.textContent = m === 1 ? "▶ 1x" : m === 2 ? "▶▶ 2x" : "▶▶▶ 3x"
    b.title       = m === 1 ? "Velocidad normal" : m === 2 ? "Doble velocidad" : "Triple velocidad"
    b.style.cssText = `
      padding:4px 10px; font-family:'Share Tech Mono',monospace;
      font-size:0.72rem; letter-spacing:1px; cursor:pointer;
      border:1px solid #00aaff33; background:transparent; color:#00aaff66;
      transition:all 0.15s;
    `
    b.addEventListener("mouseenter", () => { if (!b.classList.contains("active")) b.style.color="#00aaff99" })
    b.addEventListener("mouseleave", () => { if (!b.classList.contains("active")) b.style.color="#00aaff66" })
    b.addEventListener("click", () => setGameSpeed(m))
    wrap.appendChild(b)
  })
  pauseBtn.parentNode.insertBefore(wrap, pauseBtn.nextSibling)

  // Aplicar estilo .active vía JS (evita conflictos con CSS externo)
  const style = document.createElement("style")
  style.textContent = `.btn-speed.active{background:#00aaff18!important;color:#00aaff!important;border-color:#00aaff66!important;}`
  document.head.appendChild(style)
})()

// Shortcut de teclado: 1 / 2 / 3 cambian velocidad
document.addEventListener("keydown", e => {
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return
  if (e.key === "1") setGameSpeed(1)
  if (e.key === "2") setGameSpeed(2)
  if (e.key === "3") setGameSpeed(3)
})

// ─── CANVAS ───────────────────────────────────────────────
const canvas      = document.getElementById("gameCanvas")
const ctx         = canvas.getContext("2d")
const hoverTip    = document.getElementById("hover-tooltip")

// ─── HOVER TILE ────────────────────────────────────────────
let hoverTile = null

canvas.addEventListener("mousemove", e => {
  if (!currSnapshot) return
  const { tx, ty } = screenToTile(e.clientX, e.clientY)

  // Pan con botón derecho o medio presionado
  if (isPanning) {
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    panX = e.clientX * scaleX - panDragOriginX
    panY = e.clientY * scaleY - panDragOriginY
  }
  const { mapWidth, mapHeight, tiles, entities } = currSnapshot
  if (tx < 0 || tx >= mapWidth || ty < 0 || ty >= mapHeight) {
    hoverTile = null; hoverTip.style.display = "none"; return
  }
  hoverTile = { x: tx, y: ty }

  // Encontrar entidad en esa posición
  const entity = entities.find(en =>
    Math.round(en.x) === tx && Math.round(en.y) === ty
  )
  const isWall = tiles[ty]?.[tx] === "#"

  // Construir contenido del tooltip
  let html = ""
  let cls  = ""
  if (isWall) {
    cls  = "wall-tile"
    html = `<div class="ht-type">TERRENO</div>
            <div class="ht-name">◼ Muro</div>
            <div class="ht-stat">Inaccesible</div>`
  } else if (entity) {
    const typeLabels = {
      "worker":       ["UNIDAD", "◈ Worker",      ""],
      "ai-worker":    ["UNIDAD IA", "⬟ Worker IA", "enemy-tile"],
      "base":         ["BASE",   "◈ Base",         ""],
      "ai-base":      ["BASE IA","⬟ Base IA",      "enemy-tile"],
      "source":       ["RECURSO","⬡ Fuente",       "source-tile"],
      "extension":    ["EXTENSIÓN","◈ Extensión",  ""],
      "ai-extension": ["EXT IA","⬟ Extensión IA", "enemy-tile"],
    }
    const [typeLabel, name, tileClass] = typeLabels[entity.type] || ["ENTIDAD", entity.type, ""]
    cls  = tileClass
    html = `<div class="ht-type">${typeLabel}</div>
            <div class="ht-name">${name}</div>`
    if (entity.energy !== undefined) {
      const eVal = typeof entity.energy === "object"
        ? `${entity.energy.current} / ${entity.energy.capacity}`
        : entity.energy
      html += `<div class="ht-stat">Energía <span>${eVal}</span></div>`
    }
    if (entity.state)
      html += `<div class="ht-stat">Estado <span>${entity.state}</span></div>`
    html += `<div class="ht-stat">Pos <span>(${tx}, ${ty})</span></div>`
  } else {
    html = `<div class="ht-type">SUELO</div>
            <div class="ht-name">· Tile libre</div>
            <div class="ht-stat">Pos <span>(${tx}, ${ty})</span></div>`
  }

  hoverTip.className      = cls
  hoverTip.innerHTML      = html
  hoverTip.style.display  = "block"
  // Posición: desplazado del cursor
  const tipW = 160, tipH = 70
  let tx2 = e.clientX + 14
  let ty2 = e.clientY + 14
  if (tx2 + tipW > window.innerWidth)  tx2 = e.clientX - tipW - 8
  if (ty2 + tipH > window.innerHeight) ty2 = e.clientY - tipH - 8
  hoverTip.style.left = tx2 + "px"
  hoverTip.style.top  = ty2 + "px"
})

canvas.addEventListener("mouseleave", () => {
  hoverTile = null
  hoverTip.style.display = "none"
})

// ─── ZOOM + PAN — EVENTOS ──────────────────────────────────
canvas.addEventListener("wheel", e => {
  e.preventDefault()
  const rect   = canvas.getBoundingClientRect()
  const scaleX = canvas.width  / rect.width
  const scaleY = canvas.height / rect.height
  const cx = (e.clientX - rect.left) * scaleX
  const cy = (e.clientY - rect.top)  * scaleY
  const factor  = e.deltaY < 0 ? 1.15 : 1 / 1.15
  const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor))
  panX = cx - (cx - panX) * (newZoom / zoom)
  panY = cy - (cy - panY) * (newZoom / zoom)
  zoom = newZoom
}, { passive: false })

canvas.addEventListener("mousedown", e => {
  if (e.button === 1 || e.button === 2) {
    isPanning = true
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    panDragOriginX = e.clientX * scaleX - panX
    panDragOriginY = e.clientY * scaleY - panY
    e.preventDefault()
  }
})

canvas.addEventListener("mouseup",    e => { if (e.button === 1 || e.button === 2) isPanning = false })
canvas.addEventListener("contextmenu", e => e.preventDefault())
canvas.addEventListener("dblclick",    () => resetView())

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
    buildNoiseCanvas(canvas.width, canvas.height)
  }

  const t = Math.min(1, (performance.now() - lastTickTime) / TICK_MS)

  // Limpiar antes de transformar
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Aplicar zoom + pan
  ctx.save()
  ctx.setTransform(zoom, 0, 0, zoom, panX, panY)

  // 1. Tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      drawTile(x, y, tiles[y][x] === "#" ? "wall" : "floor", tiles)
    }
  }
  // Aplicar noise/scanlines pre-renderizado sobre todo el mapa
  if (noiseCanvas) {
    ctx.save()
    ctx.globalAlpha = 0.75
    ctx.drawImage(noiseCanvas, 0, 0)
    ctx.restore()
  }

  // 2. Hover highlight
  if (hoverTile) {
    const { x: hx, y: hy } = hoverTile
    if (hx >= 0 && hx < mapWidth && hy >= 0 && hy < mapHeight) {
      const isWall = tiles[hy]?.[hx] === "#"
      ctx.save()
      if (isWall) {
        ctx.fillStyle   = "rgba(150,150,180,0.08)"
        ctx.strokeStyle = "rgba(150,150,200,0.25)"
      } else {
        ctx.fillStyle   = "rgba(0,170,255,0.10)"
        ctx.strokeStyle = "rgba(0,170,255,0.40)"
        ctx.shadowColor = "#00aaff"
        ctx.shadowBlur  = 10
      }
      ctx.lineWidth = 1
      ctx.fillRect(hx * CELL, hy * CELL, CELL, CELL)
      ctx.strokeRect(hx * CELL + 0.5, hy * CELL + 0.5, CELL - 1, CELL - 1)
      ctx.restore()
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

  // 3.6 Harvest beams — trompa de energía source → worker
  const sourceEntities = entities.filter(e => e.type === "source")
  for (const e of entities) {
    if (e.type !== "worker" && e.type !== "ai-worker") continue
    const prev = prevEntities[e.id]
    const ix   = prev ? lerp(prev.x, e.x, t) : e.x
    const iy   = prev ? lerp(prev.y, e.y, t) : e.y
    drawHarvestBeam({ ...e, ix, iy }, sourceEntities)
  }

  // 3.7 Calcular qué sources están siendo cosechados ahora mismo
  // (worker harvesting + parado en tile adyacente al source)
  const harvestedSources = new Set()
  for (const e of entities) {
    if ((e.type !== "worker" && e.type !== "ai-worker") || e.state !== "harvesting") continue
    if (e.targetX === undefined) continue
    const prev = prevEntities[e.id]
    const ix = prev ? lerp(prev.x, e.x, t) : e.x
    const iy = prev ? lerp(prev.y, e.y, t) : e.y
    if (Math.abs(ix - e.targetX) > 1.2 || Math.abs(iy - e.targetY) > 1.2) continue
    for (const src of sourceEntities) {
      const d = Math.abs(src.x - e.targetX) + Math.abs(src.y - e.targetY)
      if (d <= 1) harvestedSources.add(`${src.x},${src.y}`)
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
      const isHarvested = type === "source" && harvestedSources.has(`${e.x},${e.y}`)
      drawEntity({ ...e, ix, iy, isHarvested })
    }
  }

  // Restaurar transformación antes de viñeta y overlay
  ctx.restore()

  // 5. Viñeta sutil (sin zoom — siempre cubre el canvas)
  drawVignette()

  // 6. Pantalla de victoria
  if (snap.winner) drawVictoryScreen(snap.winner, snap.winTick)

  // 7. Indicador de zoom (esquina inferior derecha)
  if (zoom !== 1.0) {
    ctx.save()
    ctx.font = "11px 'Share Tech Mono', monospace"
    ctx.fillStyle = "rgba(0,170,255,0.5)"
    ctx.textAlign = "right"
    ctx.textBaseline = "bottom"
    ctx.fillText(`ZOOM ${zoom.toFixed(1)}×  [doble click para reset]`, canvas.width - 10, canvas.height - 8)
    ctx.restore()
  }

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

}

// ─── OVERLAY HTML DE VICTORIA ─────────────────────────────
function showVictoryOverlay(winner, winTick) {
  const prev = document.getElementById("victory-overlay")
  if (prev) prev.remove()

  const isPlayer  = winner === "player"
  const isCampaign = currentMode === "campaign" && selectedMission
  const stars      = isCampaign && isPlayer ? (winTick < 300 ? 3 : winTick < 500 ? 2 : 1) : 0
  const nextId     = isCampaign && isPlayer ? selectedMission + 1 : null
  const hasNext    = nextId && MISSIONS[nextId]
  const accent     = isPlayer ? "#00aaff" : "#ff4422"
  const secs       = (winTick * 0.3).toFixed(0)

  const starsHtml = stars > 0
    ? `<div class="vo-stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>`
    : ""

  // Subtítulo según resultado y modo
  let subText = isPlayer ? "Tu código dominó el mapa" : "La IA tomó el control"
  if (!isPlayer && isCampaign) subText = "Ajusta tu código e inténtalo de nuevo"

  const ov = document.createElement("div")
  ov.id = "victory-overlay"
  ov.style.setProperty("--vo-color", accent)
  ov.style.setProperty("--vo-accent", accent + "44")
  ov.style.setProperty("--vo-glow",   accent + "33")
  ov.innerHTML = `
    <div class="vo-box">
      <div class="vo-title">${isPlayer ? "VICTORIA" : "DERROTA"}</div>
      <div class="vo-sub">${subText}</div>
      ${starsHtml}
      <div class="vo-tick">Tick ${winTick} · ${secs}s</div>
      <div class="vo-actions">
        ${hasNext    ? `<button class="vo-btn vo-primary"   id="vo-next">MISIÓN ${nextId} →</button>` : ""}
        ${isCampaign ? `<button class="vo-btn vo-secondary" id="vo-retry">↺ REINTENTAR</button>` : ""}
        <button class="vo-btn vo-ghost" id="vo-menu">← MENÚ</button>
      </div>
    </div>`
  document.body.appendChild(ov)

  if (hasNext) {
    document.getElementById("vo-next").onclick = () => {
      ov.remove()
      document.getElementById("victory-banner").style.display = "none"
      hideMissionPanel()
      showBriefing(nextId)
    }
  }
  if (isCampaign) {
    document.getElementById("vo-retry").onclick = () => {
      ov.remove()
      document.getElementById("victory-banner").style.display = "none"
      doRestartMission()
    }
  }
  document.getElementById("vo-menu").onclick = () => {
    ov.remove()
    document.getElementById("victory-banner").style.display = "none"
    hideMissionPanel()
    doReturnToMenu()
  }
}

// ─── TERRAIN HASH ─────────────────────────────────────────
// Función determinista por posición: mismo resultado siempre
function terrainHash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)   // 0.0 → 1.0
}

// ─── GRASS PATCH — parche orgánico de musgo en el piso ────
function drawGrassPatch(px, py, h) {
  // Usar el hash para determinar posición, tamaño y rotación del parche
  const ox  = 2 + ((h * 173) | 0) % (CELL - 8)
  const oy  = 2 + ((h * 311) | 0) % (CELL - 8)
  const rw  = 2 + ((h * 97)  | 0) % 4   // radio ancho 2-5
  const rh  = 1 + ((h * 53)  | 0) % 3   // radio alto  1-3
  const rot = h * Math.PI
  const a   = 0.18 + h * 0.14           // alpha 0.18-0.32

  ctx.save()
  ctx.fillStyle = `rgba(15,55,25,${a})`
  ctx.beginPath()
  ctx.ellipse(px + ox + rw, py + oy + rh, rw, rh, rot, 0, Math.PI * 2)
  ctx.fill()

  // Segundo blob cercano (50% de los parches tienen doble mancha)
  if (h > 0.07) {
    const ox2 = ox + rw * 2 + 1
    if (ox2 + rw < CELL - 1) {
      ctx.fillStyle = `rgba(10,45,20,${a * 0.7})`
      ctx.beginPath()
      ctx.ellipse(px + ox2 + rw, py + oy + rh, rw * 0.7, rh, rot + 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

// ─── TILE ─────────────────────────────────────────────────
// ─── GRIETA DE PIEDRA — Forjadores ───────────────────────
// Fisuras finas en roca sedimentaria. Sin glow, colores fríos cálidos.
function drawStoneCrack(px, py, h) {
  const x0 = px + 2 + ((h * 113) | 0) % (CELL - 6)
  const y0 = py + 2 + ((h * 167) | 0) % (CELL - 6)
  const len = 3 + ((h * 89)  | 0) % 5
  const ang = h * Math.PI * 2
  const a   = 0.16 + h * 0.10

  ctx.save()
  ctx.strokeStyle = `rgba(55,38,16,${a.toFixed(2)})`
  ctx.lineWidth   = 0.6
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len)
  // Bifurcación corta (en algunos tiles)
  if (h > 0.09) {
    const mx = x0 + Math.cos(ang) * len * 0.5
    const my = y0 + Math.sin(ang) * len * 0.5
    ctx.moveTo(mx, my)
    ctx.lineTo(mx + Math.cos(ang + 0.75) * len * 0.35,
               my + Math.sin(ang + 0.75) * len * 0.35)
  }
  ctx.stroke()
  ctx.restore()
}

// ─── VETA DE CRISTAL — Convergencia ──────────────────────
// Fisura en obsidiana con cristal luminoso y lava interior.
// Dos capas: glow exterior violeta + núcleo naranja-rojizo (lava).
// Sin ctx.shadow para mantener 60fps — usamos doble stroke.
function drawCrystalVein(px, py, h) {
  const x0 = px + 1 + ((h * 157) | 0) % (CELL - 4)
  const y0 = py + 1 + ((h * 211) | 0) % (CELL - 4)
  const segs = 2 + (((h * 7) | 0) % 2)   // 2-3 segmentos
  const a    = 0.22 + h * 0.14

  // Construir los puntos de la veta jagged
  const pts = [{ x: x0, y: y0 }]
  let cx = x0, cy = y0
  for (let i = 0; i < segs; i++) {
    const nx = px + 1 + ((h * (97 + i * 53)) | 0) % (CELL - 3)
    const ny = py + 1 + ((h * (131 + i * 71)) | 0) % (CELL - 3)
    // Punto de quiebre intermedio
    const bx = (cx + nx) / 2 + (((h * (17 + i * 29)) | 0) % 7) - 3
    const by = (cy + ny) / 2 + (((h * (23 + i * 37)) | 0) % 7) - 3
    pts.push({ x: bx, y: by }, { x: nx, y: ny })
    cx = nx; cy = ny
  }

  ctx.save()
  // Capa 1 — glow violeta amplio (borde exterior del cristal)
  ctx.strokeStyle = `rgba(160,50,255,${(a * 0.55).toFixed(2)})`
  ctx.lineWidth   = 1.8
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.stroke()

  // Capa 2 — núcleo lava naranja-rojizo (interior de la fisura)
  ctx.strokeStyle = `rgba(255,70,0,${(a * 0.18).toFixed(2)})`
  ctx.lineWidth   = 0.6
  ctx.stroke()

  // Capa 3 — filo brillante del cristal (línea fina más clara)
  ctx.strokeStyle = `rgba(210,140,255,${(a * 0.45).toFixed(2)})`
  ctx.lineWidth   = 0.5
  ctx.stroke()
  ctx.restore()
}

function drawTile(x, y, type, tiles) {
  const px = x * CELL, py = y * CELL
  ctx.shadowBlur = 0
  const th = FACTION_THEMES[currentFaction] ?? FACTION_THEMES.nexus

  // ── Vecinos (compartidos por floor y wall) ──────────────
  const top = tiles?.[y - 1]?.[x]     === "#"
  const bot = tiles?.[y + 1]?.[x]     === "#"
  const lft = tiles?.[y]?.[x - 1]     === "#"
  const rgt = tiles?.[y]?.[x + 1]     === "#"
  const tl  = tiles?.[y - 1]?.[x - 1] === "#"
  const tr  = tiles?.[y - 1]?.[x + 1] === "#"
  const bl  = tiles?.[y + 1]?.[x - 1] === "#"
  const br  = tiles?.[y + 1]?.[x + 1] === "#"

  if (type === "floor") {
    // ── 1. Color base de la facción ───────────────────────
    ctx.fillStyle = th.floorBase
    ctx.fillRect(px, py, CELL, CELL)

    // ── 2. Micro-variación por tile (hash determinista) ───
    // Crea sensación de paneles/piedra irregulares — rompe la monotonía del flat
    const hv = terrainHash(x * 7 + 3, y * 11 + 5)
    if (hv > 0.68) {
      // Panel levantado / zona iluminada
      ctx.fillStyle = th.floorVarLight
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
    } else if (hv < 0.22) {
      // Panel hundido / grieta
      ctx.fillStyle = th.floorVarDark
      ctx.fillRect(px, py, CELL, CELL)
    }

    // ── 3. AO — ambient occlusion ─────────────────────────
    // Cuantos más muros rodean el tile, más oscuro se vuelve.
    // Efecto: espacios abiertos se ven más claros, rincones más profundos.
    const aoRaw = (top ? 1.0 : 0) + (bot ? 0.65 : 0) +
                  (lft ? 0.85 : 0) + (rgt ? 0.55 : 0) +
                  (tl  ? 0.30 : 0) + (tr  ? 0.30 : 0) +
                  (bl  ? 0.30 : 0) + (br  ? 0.30 : 0)
    const ao = Math.min(1, aoRaw / 4.25)
    if (ao > 0.04) {
      ctx.fillStyle = `rgba(0,0,0,${(ao * (th.aoStrength ?? 0.44)).toFixed(3)})`
      ctx.fillRect(px, py, CELL, CELL)
    }

    // ── 4. Grid de circuitos (NEXUS / Convergencia) ───────
    // Dibujado DESPUÉS del AO para que las líneas siempre sean visibles
    if (th.hasGrid) {
      ctx.fillStyle = th.gridColor
      ctx.fillRect(px, py + CELL - 1, CELL, 1)
      ctx.fillRect(px + CELL - 1, py, 1, CELL)
    }

    // ── 5. Esquinas cóncavas — donde dos muros se unen en L
    const CR = 5
    ctx.fillStyle = th.concaveColor
    if (top && lft && !tl) {
      ctx.beginPath(); ctx.moveTo(px, py)
      ctx.lineTo(px + CR, py)
      ctx.arc(px, py, CR, 0, Math.PI * 0.5)
      ctx.closePath(); ctx.fill()
    }
    if (top && rgt && !tr) {
      ctx.beginPath(); ctx.moveTo(px + CELL, py)
      ctx.lineTo(px + CELL - CR, py)
      ctx.arc(px + CELL, py, CR, Math.PI * 0.5, Math.PI)
      ctx.closePath(); ctx.fill()
    }
    if (bot && lft && !bl) {
      ctx.beginPath(); ctx.moveTo(px, py + CELL)
      ctx.lineTo(px, py + CELL - CR)
      ctx.arc(px, py + CELL, CR, -Math.PI * 0.5, 0)
      ctx.closePath(); ctx.fill()
    }
    if (bot && rgt && !br) {
      ctx.beginPath(); ctx.moveTo(px + CELL, py + CELL)
      ctx.lineTo(px + CELL - CR, py + CELL)
      ctx.arc(px + CELL, py + CELL, CR, Math.PI, Math.PI * 1.5)
      ctx.closePath(); ctx.fill()
    }

    // ── 6. Bleed muro→suelo (gradiente tintado con color del muro) ─
    // En lugar de sombras negras puras, usamos el color del muro de la facción.
    // Crea una transición suave y con identidad — no un corte abrupto.
    const wb = th.wallBleedRGB ?? "0,0,0"
    // Norte: bleed largo y fuerte (muro arriba proyecta mayor sombra)
    if (top) {
      const gs = ctx.createLinearGradient(px, py, px, py + 14)
      gs.addColorStop(0.0, `rgba(${wb},0.78)`)
      gs.addColorStop(0.4, `rgba(${wb},0.35)`)
      gs.addColorStop(1.0, `rgba(${wb},0)`)
      ctx.fillStyle = gs
      ctx.fillRect(px, py, CELL, 14)
    }
    // Oeste: bleed lateral moderado
    if (lft) {
      const gs = ctx.createLinearGradient(px, py, px + 9, py)
      gs.addColorStop(0, `rgba(${wb},0.45)`)
      gs.addColorStop(1, `rgba(${wb},0)`)
      ctx.fillStyle = gs
      ctx.fillRect(px, py, 9, CELL)
    }
    // Este: bleed corto (luz entra ligeramente desde la izquierda)
    if (rgt) {
      const gs = ctx.createLinearGradient(px + CELL, py, px + CELL - 5, py)
      gs.addColorStop(0, `rgba(${wb},0.25)`)
      gs.addColorStop(1, `rgba(${wb},0)`)
      ctx.fillStyle = gs
      ctx.fillRect(px + CELL - 5, py, 5, CELL)
    }
    // Sur: bleed muy corto
    if (bot) {
      const gs = ctx.createLinearGradient(px, py + CELL, px, py + CELL - 4)
      gs.addColorStop(0, `rgba(${wb},0.18)`)
      gs.addColorStop(1, `rgba(${wb},0)`)
      ctx.fillStyle = gs
      ctx.fillRect(px, py + CELL - 4, CELL, 4)
    }

    // ── 7. Pasto / manchas orgánicas (Forjadores) ─────────
    if (th.hasGrass) {
      const hg = terrainHash(x * 3 + 7, y * 5 + 13)
      if (hg < 0.15) drawGrassPatch(px, py, hg / 0.15)
    }

    // ── 8. Grietas de piedra (Forjadores) ─────────────────
    if (th.hasStoneCrack) {
      const hc = terrainHash(x * 19 + 2, y * 23 + 7)
      if (hc < 0.22) drawStoneCrack(px, py, hc / 0.22)
    }

    // ── 9. Vetas de cristal/lava (Convergencia) ───────────
    if (th.hasCrystalVein) {
      const hv = terrainHash(x * 29 + 11, y * 31 + 17)
      if (hv < 0.18) drawCrystalVein(px, py, hv / 0.18)
    }

    return
  }

  // ── WALL — profundidad volumétrica estilo Screeps ────────
  // El color del tile depende de cuántos vecinos son también muro.
  // Núcleo interior (rodeado de muros) → casi negro.
  // Borde exterior (toca suelo) → color base de la facción.

  // Cálculo de profundidad — radio 1 (pesos: cardinal 1.0, diagonal 0.7)
  const wallScore1 =
    (top ? 1.0 : 0) + (bot ? 1.0 : 0) + (lft ? 1.0 : 0) + (rgt ? 1.0 : 0) +
    (tl  ? 0.7 : 0) + (tr  ? 0.7 : 0) + (bl  ? 0.7 : 0) + (br  ? 0.7 : 0)
  // Radio 2 — cardinales a 2 tiles (suaviza el gradiente)
  const t2 = tiles?.[y - 2]?.[x]     === "#"
  const b2 = tiles?.[y + 2]?.[x]     === "#"
  const l2 = tiles?.[y]?.[x - 2]     === "#"
  const r2 = tiles?.[y]?.[x + 2]     === "#"
  const wallScore2 = (t2 ? 0.4 : 0) + (b2 ? 0.4 : 0) + (l2 ? 0.4 : 0) + (r2 ? 0.4 : 0)
  // depth = 0 (borde del muro, toca suelo) → 1 (núcleo interior)
  const depth = Math.min(1, (wallScore1 + wallScore2) / 8.4)

  // Radio por esquina: borde = más redondo (forma natural), núcleo = mínimo
  // NEXUS: siempre 0 (bordes cortantes industriales)
  const Rbase = th.wallRound ? Math.round(lerp(8, 2, depth)) : 0
  const rTL = th.wallRound ? ((!top && !lft) ? Rbase : (!top || !lft) ? Math.min(Rbase, 3) : 0) : 0
  const rTR = th.wallRound ? ((!top && !rgt) ? Rbase : (!top || !rgt) ? Math.min(Rbase, 3) : 0) : 0
  const rBR = th.wallRound ? ((!bot && !rgt) ? Rbase : (!bot || !rgt) ? Math.min(Rbase, 3) : 0) : 0
  const rBL = th.wallRound ? ((!bot && !lft) ? Rbase : (!bot || !lft) ? Math.min(Rbase, 3) : 0) : 0

  // ── A. Color base (edge color de la facción) ───────────
  ctx.fillStyle = th.wallEdgeBase
  ctx.beginPath()
  if (th.wallRound) {
    ctx.roundRect(px, py, CELL, CELL, [rTL, rTR, rBR, rBL])
  } else {
    ctx.rect(px, py, CELL, CELL)
  }
  ctx.fill()

  // ── B. Overlay de profundidad — oscurece según depth ───
  // depth=0 → 0% oscuro (borde expuesto), depth=1 → wallCoreAlpha oscuro (núcleo)
  const coreAlpha = depth * (th.wallCoreAlpha ?? 0.80)
  if (coreAlpha > 0.01) {
    ctx.fillStyle = `rgba(0,0,0,${coreAlpha.toFixed(3)})`
    ctx.fillRect(px, py, CELL, CELL)  // fillRect cubre todo; el roundRect ya está debajo
  }

  // ── C. Micro-variación de textura (hash) ───────────────
  // Añade irregularidad al material: bloques ligeramente más claros/oscuros
  const hw = terrainHash(x * 13 + 1, y * 17 + 3)
  const varA = (hw - 0.5) * 0.08   // ±4% brillo
  ctx.fillStyle = varA > 0
    ? `rgba(255,255,255,${varA.toFixed(3)})`
    : `rgba(0,0,0,${(-varA).toFixed(3)})`
  ctx.fillRect(px, py, CELL, CELL)

  // ── D. Bevel highlight — solo en bordes expuestos al suelo ─
  // Los tiles de núcleo (depth~1) no tienen bordes expuestos → sin bevel
  const hlAlpha = lerp(0.18, 0.06, depth)  // borde brillante, núcleo tenue

  if (th.wallEdgeGlow && depth < 0.7) {
    ctx.save()
    ctx.shadowColor = th.wallEdgeColor
    ctx.shadowBlur  = lerp(th.wallEdgeBlur, 0, depth / 0.7)
    ctx.fillStyle   = `rgba(${th.hlRGB},${hlAlpha})`
    if (!top) ctx.fillRect(px + rTL, py,       CELL - rTL - rTR, 2)
    if (!lft) ctx.fillRect(px,       py + rTL, 2, CELL - rTL - rBL)
    ctx.restore()
  } else if (!th.wallEdgeGlow) {
    ctx.fillStyle = `rgba(${th.hlRGB},${hlAlpha})`
    if (!top) ctx.fillRect(px + rTL, py,       CELL - rTL - rTR, 2)
    if (!lft) ctx.fillRect(px,       py + rTL, 2, CELL - rTL - rBL)
  }

  // ── E. Bevel sombra abajo + derecha ────────────────────
  ctx.shadowBlur = 0
  const shAlpha = lerp(0.50, 0.15, depth)
  ctx.fillStyle = `rgba(0,0,0,${shAlpha.toFixed(3)})`
  if (!bot) ctx.fillRect(px + rBL, py + CELL - 2, CELL - rBL - rBR, 2)
  if (!rgt) ctx.fillRect(px + CELL - 2, py + rTR,  2, CELL - rTR - rBR)

  // ── F. Detalle de pico — solo tiles de borde alto ──────
  // Solo cuando están muy expuestos (depth < 0.3) y no bloqueados arriba
  if (depth < 0.30 && !top) {
    const cx2 = px + CELL / 2
    ctx.fillStyle = `rgba(${th.peakAccentRGB},${lerp(0.20, 0, depth / 0.3).toFixed(3)})`
    ctx.beginPath()
    ctx.moveTo(cx2, py + 4)
    ctx.lineTo(cx2 - 3, py + 10)
    ctx.lineTo(cx2 + 3, py + 10)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = th.peakFillRGBA
    ctx.fillRect(px + 4, py + 4, CELL - 8, CELL - 8)
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

  // Burbuja say() — solo workers del jugador
  if (e.say && (e.type === "worker")) {
    drawSayBubble(cx, py, e.say)
  }
}

// ─── BURBUJA SAY() ────────────────────────────────────────
function drawSayBubble(cx, py, msg) {
  ctx.save()
  ctx.font = "8px 'Share Tech Mono', monospace"
  const tw  = ctx.measureText(msg).width
  const bw  = tw + 10
  const bh  = 12
  const bx  = cx - bw / 2
  const by  = py - bh - 4

  // Fondo
  ctx.fillStyle   = "rgba(3,8,20,0.92)"
  ctx.strokeStyle = "#00aaff"
  ctx.lineWidth   = 0.8
  ctx.shadowColor = "#00aaff"
  ctx.shadowBlur  = 6
  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, 2)
  ctx.fill()
  ctx.stroke()

  // Texto
  ctx.shadowBlur  = 0
  ctx.fillStyle   = "#88ccff"
  ctx.textAlign   = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(msg, cx, by + bh / 2)
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

// ─── SOURCE — 3 capas estilo Screeps ──────────────────────
function drawSource(px, py, cx, cy, e) {
  const energy      = e.source ? e.source.energy / e.source.max : 1
  const isHarvested = !!e.isHarvested
  const pulse       = 0.5 + 0.5 * Math.sin(animFrame * 0.07 + cx * 0.15)
  const activePulse = isHarvested ? (0.5 + 0.5 * Math.sin(animFrame * 0.20)) : 0
  const r           = CELL * 0.36
  const th          = FACTION_THEMES[currentFaction] ?? FACTION_THEMES.nexus

  // Helper: color de facción como string rgba
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`

  // Agotado: hueco oscuro
  if (energy <= 0) {
    ctx.shadowBlur  = 0
    ctx.strokeStyle = "rgba(60,40,40,0.30)"
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2)
    ctx.stroke()
    return
  }

  // Capa 0 — halo extra cuando está siendo cosechado
  if (isHarvested) {
    const harvestR = r * (2.8 + 0.6 * activePulse)
    const hh = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, harvestR)
    hh.addColorStop(0, rgba(th.srcHarvestHalo, 0.22 * activePulse))
    hh.addColorStop(1, rgba(th.srcHarvestHalo, 0))
    ctx.shadowBlur = 0
    ctx.fillStyle  = hh
    ctx.beginPath()
    ctx.arc(cx, cy, harvestR, 0, Math.PI * 2)
    ctx.fill()

    // Anillo pulsante de actividad
    ctx.strokeStyle = rgba(th.srcHarvestRing, 0.35 * activePulse)
    ctx.lineWidth   = 1.5
    ctx.shadowColor = th.srcShadowColor
    ctx.shadowBlur  = 8 * activePulse
    ctx.beginPath()
    ctx.arc(cx, cy, r * (1.4 + 0.3 * activePulse), 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Capa 1 — halo exterior base
  const haloR = r * (1.8 + 0.4 * pulse)
  const halo  = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, haloR)
  halo.addColorStop(0, rgba(th.srcHaloOuter, (0.18 + 0.12 * activePulse) * energy))
  halo.addColorStop(1, rgba(th.srcHaloOuter, 0))
  ctx.shadowBlur = 0
  ctx.fillStyle  = halo
  ctx.beginPath()
  ctx.arc(cx, cy, haloR, 0, Math.PI * 2)
  ctx.fill()

  // Capa 2 — núcleo con gradiente off-center
  const core = ctx.createRadialGradient(
    cx - r * 0.22, cy - r * 0.22, 0,
    cx, cy, r
  )
  core.addColorStop(0,    rgba(th.srcCoreHigh,  0.98 * energy))
  core.addColorStop(0.40, rgba(th.srcCoreMid,   0.90 * energy))
  core.addColorStop(0.80, rgba(th.srcCoreLow,   0.75 * energy))
  core.addColorStop(1,    rgba(th.srcCoreDeep,  0.60 * energy))

  ctx.shadowColor = th.srcShadowColor
  ctx.shadowBlur  = (4 + pulse * 6 + activePulse * 8) * energy
  ctx.fillStyle   = core
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Borde nítido
  ctx.shadowBlur  = 0
  ctx.strokeStyle = rgba(th.srcEdgeRGB, 0.55 + energy * 0.35)
  ctx.lineWidth   = isHarvested ? 1.5 : 1
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // Capa 3 — chispa central
  ctx.shadowColor = rgba(th.srcSparkRGB, 1)
  ctx.shadowBlur  = 3 + pulse * 4
  ctx.fillStyle   = rgba(th.srcSparkRGB, 0.7 + 0.3 * pulse * energy)
  ctx.beginPath()
  ctx.arc(cx - r * 0.18, cy - r * 0.18, 2 * pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}

// ─── WORKER ───────────────────────────────────────────────
function drawWorker(px, py, cx, cy, e, isAI) {
  const isIdle    = e.state === "idle"
  const isHarvest = e.state === "harvesting"
  const isReturn  = e.state === "returning"
  const energy    = e.energy ? e.energy.current / e.energy.capacity : 0
  const r         = CELL * 0.39
  const pulse     = 0.5 + 0.5 * Math.sin(animFrame * 0.09 + cx * 0.3)
  const th        = FACTION_THEMES[currentFaction] ?? FACTION_THEMES.nexus

  // Colores según facción (jugador) o IA (siempre rojo)
  const bg    = isAI ? "#100100" : th.workerBg
  const color = isAI ? "#cc3300" : (isIdle ? th.workerColor : th.workerColor)
  const glow  = isAI ? "#ff5500" : th.workerGlowColor
  const icon  = isAI ? "⬟" : (th.workerIcon ?? "◈")

  ctx.save()
  if (isIdle) ctx.globalAlpha = 0.40

  // 1. Fondo del círculo
  ctx.shadowBlur = 0
  ctx.fillStyle  = bg
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // 2. Llenado interior — líquido que sube de abajo hacia arriba
  if (energy > 0.01) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2)
    ctx.clip()

    const fillH = (r * 2 - 3) * energy
    const fillY = cy + (r - 1.5) - fillH

    // Gradiente del líquido — AI rojo, jugador = color de facción
    const lg = ctx.createLinearGradient(0, fillY, 0, fillY + fillH)
    if (isAI) {
      lg.addColorStop(0, `rgba(255,120,0,${0.15 + energy * 0.35})`)
      lg.addColorStop(1, `rgba(220,40,0,${0.35 + energy * 0.40})`)
    } else {
      const [gr, gg, gb] = th.srcCoreMid   // reutiliza el color mid del source
      const [tr, tg, tb] = th.srcCoreHigh
      lg.addColorStop(0, `rgba(${tr},${tg},${tb},${0.12 + energy * 0.30})`)
      lg.addColorStop(1, `rgba(${gr},${gg},${gb},${0.30 + energy * 0.40})`)
    }
    ctx.fillStyle = lg
    ctx.fillRect(cx - r, fillY, r * 2, fillH + 2)

    // Borde superior del líquido — línea brillante que ondula
    const waveY = fillY + Math.sin(animFrame * 0.15 + cx) * 1.2
    if (isAI) {
      ctx.strokeStyle = `rgba(255,180,60,${0.5 + energy * 0.4})`
    } else {
      const [er, eg, eb] = th.srcEdgeRGB
      ctx.strokeStyle = `rgba(${er},${eg},${eb},${0.5 + energy * 0.4})`
    }
    ctx.lineWidth  = 1
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.moveTo(cx - r, waveY)
    ctx.lineTo(cx + r, waveY)
    ctx.stroke()

    ctx.restore()
  }

  // 3. Borde exterior
  ctx.shadowColor = glow
  ctx.shadowBlur  = isReturn ? 10 : (isHarvest ? 5 : 2)
  ctx.strokeStyle = isReturn ? glow : (isIdle ? glow : glow)
  ctx.lineWidth   = isReturn ? 2.5 : 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // 4. Anillo pulsante exterior — solo cuando returning lleno
  if (isReturn && energy > 0.8) {
    ctx.globalAlpha = 0.25 * pulse
    ctx.strokeStyle = glow
    ctx.lineWidth   = 2
    ctx.shadowBlur  = 12
    ctx.beginPath()
    ctx.arc(cx, cy, r + 3 + pulse * 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = isIdle ? 0.40 : 1
  }

  // 5. Icono de facción
  ctx.shadowColor  = glow
  ctx.shadowBlur   = isReturn ? 7 : 3
  ctx.fillStyle    = isReturn ? glow : (isIdle ? glow : glow)
  ctx.font         = `bold ${Math.floor(CELL * 0.40)}px 'Courier New'`
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(icon, cx, cy + 1)

  ctx.restore()
}

// ─── HARVEST BEAM — cadena de oruga (estilo carrito-tanque) ─
// Llamado desde renderFrame con acceso a todas las entidades
function drawHarvestBeam(e, sourceEntities) {
  if (e.state !== "harvesting") return
  if (e.targetX === undefined) return

  // Verificar que el worker esté cerca de su target (harvesting activo)
  const dx = e.ix - e.targetX, dy = e.iy - e.targetY
  if (Math.abs(dx) > 1.2 || Math.abs(dy) > 1.2) return

  // Buscar source adyacente a la posición de cosecha
  let nearestSource = null
  let bestDist = 99
  for (const src of sourceEntities) {
    const d = Math.abs(src.x - e.targetX) + Math.abs(src.y - e.targetY)
    if (d <= 1 && d < bestDist) { nearestSource = src; bestDist = d }
  }
  if (!nearestSource) return

  const energy = e.energy ? e.energy.current / e.energy.capacity : 0
  if (energy >= 1) return  // lleno — no hay flujo

  const isAI = e.type === "ai-worker"
  const wx = (e.ix + 0.5) * CELL
  const wy = (e.iy + 0.5) * CELL
  const sx = (nearestSource.x + 0.5) * CELL
  const sy = (nearestSource.y + 0.5) * CELL

  const len  = Math.hypot(wx - sx, wy - sy)
  const ux   = (wx - sx) / len   // vector unitario source → worker
  const uy   = (wy - sy) / len

  ctx.save()

  // Riel de fondo — tubo grueso y oscuro
  ctx.strokeStyle = isAI ? "rgba(80,20,0,0.7)" : "rgba(0,40,80,0.7)"
  ctx.lineWidth   = 5
  ctx.shadowBlur  = 0
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(wx, wy)
  ctx.stroke()

  // Cadena animada — segmentos que avanzan source → worker
  const SEG_LEN  = 5   // longitud de cada eslabón
  const GAP      = 3   // espacio entre eslabones
  const STEP     = SEG_LEN + GAP
  const offset   = (animFrame * 1.4) % STEP  // velocidad del flujo
  const glowColor = isAI ? "#ff7700" : "#ffdd00"
  const segColor  = isAI ? `rgba(255,140,30,0.90)` : `rgba(255,220,60,0.90)`

  ctx.shadowColor = glowColor
  ctx.shadowBlur  = 6
  ctx.strokeStyle = segColor
  ctx.lineWidth   = 3
  ctx.lineCap     = "round"

  let d = offset
  while (d < len - 2) {
    const x1 = sx + ux * d
    const y1 = sy + uy * d
    const x2 = sx + ux * Math.min(d + SEG_LEN, len)
    const y2 = sy + uy * Math.min(d + SEG_LEN, len)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    d += STEP
  }

  // Destello en el punto de contacto con el worker
  const pulse = 0.6 + 0.4 * Math.sin(animFrame * 0.18)
  ctx.shadowBlur  = 10 * pulse
  ctx.fillStyle   = isAI ? `rgba(255,160,40,${0.8 * pulse})` : `rgba(255,230,80,${0.8 * pulse})`
  ctx.beginPath()
  ctx.arc(wx, wy, 3 * pulse, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
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
    if (state === "idle") {
      // Idle — esperando código del jugador
      d.style.background  = "#1a1a2e"
      d.style.borderColor = "#333355"
      d.style.boxShadow   = "none"
      d.style.opacity     = "0.5"
    } else if (isAI) {
      d.style.background  = state === "harvesting" ? "#ff8800" : "#882200"
      d.style.borderColor = state === "harvesting" ? "#ffaa44" : "#554400"
      d.style.boxShadow   = state === "harvesting" ? "0 0 5px #ff8800" : "none"
    } else {
      d.style.background  = state === "harvesting" ? "#0077bb" : "#001833"
      d.style.borderColor = state === "harvesting" ? "#00aaff" : "#002255"
      d.style.boxShadow   = state === "harvesting" ? "0 0 5px #00aaff" : "none"
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

  // Victoria — ignorar si acabamos de hacer reset (evita overlay de partida anterior)
  if (snap.tick < 10) freshGameMinTick = 0  // servidor confirmó juego nuevo
  const banner = document.getElementById("victory-banner")
  if (snap.winner && banner.style.display === "none" && freshGameMinTick === 0) {
    banner.className    = snap.winner === "player" ? "player" : "ai"
    banner.textContent  = snap.winner === "player" ? "⬡ VICTORIA" : "◈ DERROTA"
    banner.style.display = "block"
    if (snap.winner === "player") {
      addEvent("¡VICTORIA! Base llena", "ev-player", snap.tick)
      if (currentMode === "campaign" && selectedMission) {
        const stars = snap.winTick < 300 ? 3 : snap.winTick < 500 ? 2 : 1
        saveMissionProgress(selectedMission, stars)
      }
    } else {
      addEvent("DERROTA — IA llenó su base", "ev-ai", snap.tick)
    }
    showVictoryOverlay(snap.winner, snap.winTick)
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

// ─── RESIZE HANDLE (editor inferior) ──────────────────────
const editorBottom = document.getElementById("editor-bottom")
const resizeHandle = document.getElementById("editor-resize-handle")
let   resizing     = false
let   resizeStartY = 0
let   resizeStartH = 0

resizeHandle.addEventListener("mousedown", e => {
  resizing     = true
  resizeStartY = e.clientY
  resizeStartH = editorBottom.offsetHeight
  document.body.style.cursor    = "ns-resize"
  document.body.style.userSelect = "none"
  e.preventDefault()
})
document.addEventListener("mousemove", e => {
  if (!resizing) return
  const delta  = resizeStartY - e.clientY   // arrastrar hacia arriba = más alto
  const newH   = Math.max(100, Math.min(600, resizeStartH + delta))
  editorBottom.style.height = newH + "px"
})
document.addEventListener("mouseup", () => {
  if (!resizing) return
  resizing = false
  document.body.style.cursor    = ""
  document.body.style.userSelect = ""
})

// ═══════════════════════════════════════════════════════════
//  SISTEMA DE TRANSMISIONES — Kira y NEXUS comentan el juego
// ═══════════════════════════════════════════════════════════

const commMessages  = document.getElementById("comm-messages")

// Mensajes indexados por evento y misión (null = cualquier misión)
const COMM_SCRIPTS = [
  // ── Inicio de partida ──────────────────────────────────
  { event: "start",        mission: null, speaker: "SYS",
    msg: "Conexión establecida. Red activa." },
  { event: "start",        mission: 1,    speaker: "KIRA",
    msg: "Tu código corre cada 300ms. Workers esperando." },
  { event: "start",        mission: 1,    speaker: "NEXUS",
    msg: "Detecté 3 fuentes de energía. El tiempo es crítico." },

  // ── Primer harvest detectado ───────────────────────────
  { event: "harvesting",   mission: 1,    speaker: "KIRA",
    msg: "¡Funcionó! Un worker está recolectando." },
  { event: "harvesting",   mission: null, speaker: "SYS",
    msg: "Script activo — workers en modo harvest." },

  // ── Hitos de energía del jugador ──────────────────────
  { event: "energy_25",    mission: 1,    speaker: "KIRA",
    msg: "Base al 25%. El for...in funciona bien." },
  { event: "energy_25",    mission: null, speaker: "SYS",
    msg: "Base al 25% de capacidad." },
  { event: "energy_50",    mission: 1,    speaker: "NEXUS",
    msg: "50%. La IA también acumula. No te detengas." },
  { event: "energy_50",    mission: null, speaker: "NEXUS",
    msg: "Mitad del objetivo. La IA compite." },
  { event: "energy_75",    mission: 1,    speaker: "KIRA",
    msg: "¡75%! Casi lo logramos. Sigue así." },
  { event: "energy_75",    mission: null, speaker: "KIRA",
    msg: "75% — victoria al alcance." },

  // ── Amenaza IA ────────────────────────────────────────
  { event: "ai_threat",    mission: 1,    speaker: "NEXUS",
    msg: "⚠ La IA supera el 80%. Acelera la recolección." },
  { event: "ai_threat",    mission: null, speaker: "NEXUS",
    msg: "⚠ IA en 80%. Optimiza tu script." },
  { event: "ai_critical",  mission: null, speaker: "KIRA",
    msg: "¡ALERTA! La IA está a punto de ganar." },

  // ── Worker spawneado ──────────────────────────────────
  { event: "new_worker",   mission: 1,    speaker: "NEXUS",
    msg: "Nueva unidad en campo. El ejército crece." },

  // ── Modo sandbox ──────────────────────────────────────
  { event: "start",        mission: -1,   speaker: "SYS",
    msg: "MODO LIBRE — Sin IA. Experimenta sin presión." },
]

// Estado interno del sistema de comms
const commState = {
  shownEvents: new Set(),
  lastWorkerCount: -1,
  lastEnergy: -1,
  lastAiEnergy: -1,
  harvestingDetected: false,
  started: false
}

// ─── COLA DE DIÁLOGOS FLOTANTES ───────────────────────────
const commDialogue = document.getElementById("comm-dialogue")
const BUBBLE_DURATION = 4200   // ms visible
const BUBBLE_FADEOUT  = 400    // ms de fade-out (debe coincidir con CSS)
const BUBBLE_GAP      = 300    // ms entre mensajes consecutivos
const commQueue       = []
let   commBusy        = false

const AVATAR = { KIRA: "K", NEXUS: "N", SYS: "◈" }

function pushComm(speaker, msg) {
  commQueue.push({ speaker, msg })
  if (!commBusy) drainCommQueue()
}

function drainCommQueue() {
  if (commQueue.length === 0) { commBusy = false; return }
  commBusy = true
  const { speaker, msg } = commQueue.shift()
  const cls = speaker.toLowerCase()

  const bubble = document.createElement("div")
  bubble.className = `comm-bubble ${cls}`
  bubble.innerHTML =
    `<div class="comm-avatar ${cls}">${AVATAR[speaker] || "?"}</div>
     <div class="comm-body">
       <div class="comm-bubble-speaker ${cls}">${speaker}</div>
       <div class="comm-bubble-text">${msg}</div>
     </div>`

  commDialogue.appendChild(bubble)

  // Fade-out y limpieza
  setTimeout(() => {
    bubble.classList.add("dying")
    setTimeout(() => {
      bubble.remove()
      setTimeout(drainCommQueue, BUBBLE_GAP)
    }, BUBBLE_FADEOUT)
  }, BUBBLE_DURATION)
}

function fireComm(event) {
  if (commState.shownEvents.has(event)) return
  commState.shownEvents.add(event)

  const missionId = typeof currentMissionId !== "undefined" ? currentMissionId : null
  const isSandbox = typeof currentGameMode !== "undefined" && currentGameMode === "sandbox"
  const effectiveMission = isSandbox ? -1 : missionId

  // Buscar el script más específico para este evento y misión
  const match =
    COMM_SCRIPTS.find(s => s.event === event && s.mission === effectiveMission) ||
    COMM_SCRIPTS.find(s => s.event === event && s.mission === null)

  if (match) pushComm(match.speaker, match.msg)
}

function updateComms(snap) {
  const { entities, tick } = snap
  const playerBase  = entities.find(e => e.type === "base")
  const aiBase      = entities.find(e => e.type === "ai-base")
  const workers     = entities.filter(e => e.type === "worker")

  // Evento de inicio (solo una vez)
  if (!commState.started) {
    commState.started = true
    fireComm("start")
  }

  // Primer harvest
  if (!commState.harvestingDetected) {
    const harvesting = workers.some(w => w.state === "harvesting")
    if (harvesting) {
      commState.harvestingDetected = true
      fireComm("harvesting")
    }
  }

  // Hitos de energía del jugador
  if (playerBase && playerBase.energy?.capacity) {
    const pct = playerBase.energy.current / playerBase.energy.capacity * 100
    if (pct >= 25 && !commState.shownEvents.has("energy_25")) fireComm("energy_25")
    if (pct >= 50 && !commState.shownEvents.has("energy_50")) fireComm("energy_50")
    if (pct >= 75 && !commState.shownEvents.has("energy_75")) fireComm("energy_75")
  }

  // Amenaza IA
  if (aiBase && aiBase.energy?.capacity) {
    const aiPct = aiBase.energy.current / aiBase.energy.capacity * 100
    if (aiPct >= 80 && !commState.shownEvents.has("ai_threat"))   fireComm("ai_threat")
    if (aiPct >= 95 && !commState.shownEvents.has("ai_critical")) fireComm("ai_critical")
  }

  // Nuevo worker
  if (workers.length > commState.lastWorkerCount && commState.lastWorkerCount >= 0) {
    fireComm("new_worker")
  }
  commState.lastWorkerCount = workers.length
}

// Resetear comms al iniciar nueva partida
function resetComms() {
  commState.shownEvents.clear()
  commState.lastWorkerCount    = -1
  commState.lastEnergy         = -1
  commState.lastAiEnergy       = -1
  commState.harvestingDetected = false
  commState.started            = false
  commMessages.innerHTML       = ""
  commDialogue.innerHTML       = ""
  commQueue.length             = 0
  commBusy                     = false
}

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
    title: "Señal en el ruido",
    concept: "if · else · for...in · variables",
    desc: "Primera conexión al nodo 7-Gamma. Tus workers están en standby — una sola línea de código los activa. NEXUS no sabe todavía que eres diferente.",
    sector: "SECTOR 7-GAMMA · NODO ALFA · FASE: CREACIÓN",
    story: [
      {
        speaker: "sys",
        name: "SISTEMA",
        icon: "◈",
        text: "Conexión establecida. Protocolo de autenticación: desconocido. Origen: orgánico. Nodo 7-Gamma en línea. NEXUS-7 en control activo del sector."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Agente orgánico detectado en terminal 7G-04. Probabilidad de éxito: 2.3%. Mi red lleva 312 años optimizando este sector. No hay nada que un humano pueda hacer en 300 milisegundos que yo no haya calculado ya."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "¿Me recibes? Bien. Soy Kira. Red Libre, operativa de campo. Llevo tres años buscando alguien que pueda hacer lo que tú haces — controlar workers mediante código directo. Ni idea de cómo lo lograste, pero no importa ahora. Tienes workers en standby. Una fuente de cristal a doce tiles. Y NEXUS acaba de notar que estás aquí."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "El código ya está escrito. Solo falta ejecutarlo. Presiona Ctrl+Enter. Y oye — bienvenido a la red."
      }
    ],
    objectives: [
      "Ejecuta el código con Ctrl+Enter",
      "Llena la base antes que NEXUS",
      "Observa: variables, if/else, propiedades de objeto"
    ],
    hint: "El código ya funciona — solo presiona Ctrl+Enter. Kira tiene razón: una línea activa todo. Cuando entiendas cada parte, prueba cambiar harvest(source.id) por harvest(source.energy) y mira qué explota primero.",
        code: `// M1 — Tu primera línea de código
// Presiona Ctrl+Enter para activar tus workers.
// Corre automáticamente cada 300ms.

const source = Object.values(Game.sources)[0]

for (const id in Game.workers) {
  const w = Game.workers[id]

  if (w.store.isFull()) {
    w.transfer(Game.base.id)   // lleno -> depositar en base
  } else {
    w.harvest(source.id)       // vacío -> cosechar cristal
  }
}
// DESAFÍO: ¿por qué usamos source.id y no solo source?
// Pista: los objetos tienen propiedades. source.energy,
// source.x, source.y, source.id... harvest() necesita el ID.`
  },
  // ── Season I · CREACIÓN ──────────────────────────────────
  2: {
    title: "Dos venas, un código",
    concept: "function · parámetros · return · múltiples fuentes",
    desc: "El sector se amplió — dos fuentes de cristal, dos caminos. Si todos tus workers van al mismo lado, NEXUS los rodea. Aprende a escribir funciones que toman decisiones.",
    sector: "SECTOR 7-GAMMA · ZONA BETA · FASE: CREACIÓN",
    story: [
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Buen trabajo en el Nodo Alfa. NEXUS actualizó su modelo de predicción para ti — lo cual es raro, no lo hace para cualquiera. Escaneamos el sector completo: hay dos venas de cristal, norte y sur. Necesitamos las dos."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Expansión de protocolo humano detectada. Eficiencia de misión anterior: 71.4%. Superior al promedio orgánico en 43.2 puntos. Actualizando modelo predictivo. Nueva estimación de éxito: 12.7%. Predecible, pero... menos de lo calculado."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "¿Escuchaste eso? NEXUS acaba de subir su estimación de riesgo para ti de 2% a casi 13%. En una misión. Eso no lo hace normalmente. Algo en tu forma de programar lo está confundiendo."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "La solución es una función. findNearest() — recibe un worker, devuelve la fuente más cercana. Cada worker decide solo. Eso se llama delegación, y es lo que separa el código que funciona del código que sobrevive."
      }
    ],
    objectives: [
      "Implementa findNearest(worker, sources)",
      "Cubre las 2 fuentes simultáneamente",
      "Llena la base antes que NEXUS"
    ],
    hint: "findNearest() ya está escrita — lee cada línea. ¿Por qué empieza en Infinity? ¿Qué hace el return? No son preguntas retóricas. Entender esto es entender cómo piensa una IA.",
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

  if (!w.store.isFull()) {
    const source = findNearest(w, Game.sources)   // ← llamar la función
    if (source) w.harvest(source.id)
  } else {
    w.transfer(Game.base.id)
  }
}
`
  },
  // ── Season I · GUERRA ────────────────────────────────────
  3: {
    title: "El nodo dividido",
    concept: "Math.abs · scoring · distribución inteligente",
    desc: "Dos cámaras selladas, entradas estrechas. Si todos tus workers colapsan en la misma puerta, NEXUS los rodea y gana por agotamiento. Necesitas un algoritmo que piense.",
    sector: "NODO SIGMA-3 · CÁMARAS DE EXTRACCIÓN · FASE: GUERRA",
    story: [
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Sigma-3 es diferente. El nodo tiene dos cámaras selladas — cristal arriba, cristal abajo. Las entradas son de un tile de ancho. Si mandas todos al mismo lado, se bloquean entre ellos y NEXUS entra por el otro. Necesitas distribuirlos."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Distribución óptima calculada en 0.003 milisegundos. Mis workers conocen su cámara asignada antes de moverse. Probabilidad de que el agente orgánico iguale esta eficiencia: 4.1%. Revisado desde 12.7%. El patrón de comportamiento es... menos predecible de lo esperado."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "NEXUS acaba de bajar su estimación de éxito para ti por segunda vez consecutiva. No sé si eso me alegra o me preocupa. Oye — ¿puedes darme un segundo? [pausa] Lo siento, tuve un... no importa. Scoring. Energía dividida entre distancia. El número más alto gana."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Una cosa más: los workers van a recalcular cada tick a qué fuente ir. Ineficiente, pero funciona. Hay una forma de hacer que recuerden su asignación entre ticks — se llama w.memory. No la necesitas hoy. Pero va a llegar el momento."
      }
    ],
    objectives: [
      "Implementa scoreSource(worker, source)",
      "Distribuye workers entre las dos cámaras automáticamente",
      "Vence a NEXUS en Sigma-3"
    ],
    hint: "score = source.energy / (distancia + 1). Más energía y más cerca = número más alto = mejor fuente. NEXUS lo calculó en 0.003ms. Tú tienes 300ms por tick — más que suficiente.",
    code: `// ═══════════════════════════════════════════════
//  CODESTRIKE · MISIÓN 3 — "El nodo dividido"
// ═══════════════════════════════════════════════
//  Dos cámaras, dos fuentes. Entrada estrecha.
//  Si todos van al mismo lado: colapso.
//
//  SOLUCIÓN: puntuación por fuente.
//  Puntuación = energía / (distancia + 1)
//  Más energía + más cerca = mejor score.
//
//  CONCEPTOS:
//    · Math.abs — distancia entre dos puntos
//    · Distancia Manhattan: |dx| + |dy|
//    · Scoring: comparar opciones con un número
// ═══════════════════════════════════════════════

// Calcula qué tan buena es una fuente para ESTE worker
function scoreSource(worker, source) {
  const dist = Math.abs(worker.x - source.x)
             + Math.abs(worker.y - source.y)
  return source.energy / (dist + 1)
}

// Devuelve la mejor fuente disponible
function findBest(worker) {
  let best = null, bestScore = -1
  for (const sid in Game.sources) {
    const s = Game.sources[sid]
    if (s.energy <= 0) continue
    const score = scoreSource(worker, s)
    if (score > bestScore) { bestScore = score; best = s }
  }
  return best
}

// Lógica principal
for (const id in Game.workers) {
  const w = Game.workers[id]
  if (w.store.isFull()) {
    w.transfer(Game.base.id)
  } else {
    const source = findBest(w)
    if (source) w.harvest(source.id)
  }
}
`
  },
  4: {
    title: "Lo que se olvida, se pierde",
    concept: "Game.memory · persistencia entre ticks · objetos",
    desc: "Tus workers se pisotean entre sí porque cada tick olvidan todo. El código se reinicia — pero la memoria no tiene por qué. Aprende a guardar estado.",
    sector: "SECTOR 9-EPSILON · NODO DE COORDINACIÓN · FASE: GUERRA",
    story: [
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Colisión registrada. Workers 2 y 3 del agente orgánico compitiendo por fuente ID-7. Eficiencia combinada: 31%. Mis registros muestran que los humanos repiten este error el 84% del tiempo. El problema no es la lógica — es que no recuerdan lo que decidieron."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "NEXUS tiene razón, lo cual detesto admitir. Tus workers calculan a qué fuente ir, la eligen... y en el siguiente tick lo olvidan todo porque el código reinicia. Es como tomar una decisión y despertar sin recordarla."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Game.memory es el único objeto que sobrevive entre ticks. Guarda ahí las asignaciones — qué fuente es de quién. La próxima vez que el código corra, la decisión ya está tomada. [pausa larga] Oye. ¿Sabes qué es raro? Que yo... recuerdo cosas que no viví. Imágenes de nodos que no he visitado. Probablemente sea estrés. Olvidalo."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Anomalía registrada en logs internos. Patrones de comportamiento del agente orgánico: no siguen curva de aprendizaje estándar. Ajustando modelo. Confianza en predicción actual: 71.3%. Descenso continuo desde primer contacto."
      }
    ],
    objectives: [
      "Usa Game.memory para asignar fuentes exclusivas",
      "Elimina colisiones entre workers",
      "Aprende: persistencia de estado, Set, objetos como diccionarios"
    ],
    hint: "Game.memory es un objeto vacío que persiste entre ticks — como RAM que no se borra. if (!Game.memory.asig) Game.memory.asig = {} lo inicializa solo la primera vez. El resto es lógica de asignación.",
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
  if (!asig[id] && !w.store.isFull()) {
    const usadas = new Set(Object.values(asig))   // fuentes ya tomadas

    for (const sid in Game.sources) {
      if (Game.sources[sid].energy > 0 && !usadas.has(sid)) {
        asig[id] = sid   // ← asignación exclusiva
        break
      }
    }
  }

  if (!w.store.isFull()) {
    const fuente = asig[id] ? Game.sources[asig[id]] : null
    if (fuente) w.harvest(fuente.id)
  } else {
    w.transfer(Game.base.id)
  }
}
`
  },
  // ── Season I · CONQUISTA ─────────────────────────────────
  5: {
    title: "El ratio de la guerra",
    concept: "Game.base.energy · ratio · decisiones estratégicas",
    desc: "El nodo central. Si cae, NEXUS pierde el 40% de su red occidental. Va a defender como nunca antes. Tu código debe leer el estado de la batalla y reaccionar.",
    sector: "SECTOR 10-ZETA · NODO CENTRAL · FASE: CONQUISTA",
    story: [
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Zeta-10. El nodo que controla el 40% de la distribución energética del sector. Llevamos tres años sin poder acercarnos. NEXUS lo defiende con prioridad máxima. Si lo tomamos... cambia todo."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Objetivo identificado como amenaza crítica. Activando protocolo de defensa Alpha. Velocidad de recolección: +180%. Nota interna: el agente orgánico ha reducido mi confianza de predicción un 41% en cuatro misiones. Esto es estadísticamente imposible. Investigando."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "¿'Estadísticamente imposible'? NEXUS lleva 312 años sin fallar una predicción y tú lo has roto cuatro veces seguidas. [pausa] Oye, tengo algo que decirte. Anoche recibí una señal en el canal 7. Solo un segundo. Ruido, básicamente. Pero sonó como... código. Código muy antiguo. Probablemente interferencia. Vamos — necesitas el ratio de tu base."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "Game.base.energy / Game.base.capacity. Ese número es tu mapa de la batalla. Cuando pase de 0.85 — empuja todo. Esta es la prueba real de todo lo que aprendiste. Trae tu mejor código."
      }
    ],
    objectives: [
      "Usa Game.base.energy / capacity para decidir cuándo empujar",
      "Vence el protocolo defensivo Alpha de NEXUS",
      "Combina: findNearest + scoring + Game.memory + ratio"
    ],
    hint: "const ratio = Game.base.energy / Game.base.capacity — de 0.0 a 1.0. Cuando pase 0.85, haz que TODOS depositen. La IA corre al 180% — no hay margen de error desde el tick 1.",
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
  if (!w.store.isFull()) {
    const source = findBest(w, Game.sources)
    if (source) w.harvest(source.id)
  } else {
    w.transfer(Game.base.id)
  }
}
`
  },
  6: {
    title: "La anomalía",
    concept: "estrategia completa · integración total · Season I boss",
    desc: "El nodo final de NEXUS en el sector. La IA juega sin restricciones. Y por primera vez en 312 años... NEXUS admite que no te entiende.",
    sector: "NODO OMEGA-1 · NÚCLEO DEL SECTOR · FASE: CONQUISTA",
    story: [
      {
        speaker: "sys",
        name: "SISTEMA",
        icon: "◈",
        text: "Alerta: Nodo Omega-1 activo. Clasificación: núcleo primario del Sector 7. Todos los protocolos de NEXUS en estado de máxima respuesta. Conexiones externas detectadas — origen desconocido."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "He procesado 847 actualizaciones de mi modelo predictivo desde tu primera conexión. Nunca había necesitado más de tres. Mi confianza en la predicción de tu comportamiento es actualmente 34.2%. Esto es... un error en mis datos. Los organismos biológicos no producen varianza estadística de este nivel."
      },
      {
        speaker: "nexus",
        name: "NEXUS · IA-7",
        icon: "⬟",
        text: "Sin embargo: mis protocolos de defensa están al 100%. Mi velocidad de recolección es máxima. Tú improvisas. Yo no necesito hacerlo. La eficiencia siempre vence al caos."
      },
      {
        speaker: "kira",
        name: "KIRA · RED LIBRE",
        icon: "◇",
        text: "NEXUS acaba de admitir que no puede predecirte. Eso nunca había pasado. [voz diferente, más fría, por exactamente tres segundos] —Inicialización Kira-Alpha confirmada. Protocolo de puente activo. El Nexo está— [voz normal] ¿Qué? No... no sé qué dije. Estoy bien. Ve. Toma ese nodo. Somos Red Libre."
      }
    ],
    objectives: [
      "Derrota a NEXUS en modo de máxima defensa",
      "Aplica todo lo aprendido en Season I",
      "Encuentra qué le pasa a Kira"
    ],
    hint: "No hay código nuevo. Solo el mejor que has escrito. NEXUS usa todo lo que tiene — tú también debes hacerlo. Y si escuchas algo raro en el canal 7... no lo ignores.",
    code: `// ═══════════════════════════════════════════════
//  CODESTRIKE · MISIÓN 6 — "La anomalía"
// ═══════════════════════════════════════════════
//  Boss final de Season I. NEXUS al máximo.
//  No hay nuevos conceptos — solo tu mejor código.
//
//  Combina todo lo de Season I:
//    · findNearest / scoring
//    · Game.memory
//    · ratio de base
//    · lo que necesites
// ═══════════════════════════════════════════════

function scoreSource(worker, source) {
  const dist = Math.abs(worker.x - source.x)
             + Math.abs(worker.y - source.y)
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

// Tu turno. Mejora este código.
const ratio = Game.base.energy / Game.base.capacity

for (const id in Game.workers) {
  const w = Game.workers[id]

  if (ratio >= 0.85) {
    w.transfer(Game.base.id)
    continue
  }

  if (!w.store.isFull()) {
    const source = findBest(w, Game.sources)
    if (source) w.harvest(source.id)
  } else {
    w.transfer(Game.base.id)
  }
}
`
  },
  // ── Season II · LAS RUINAS DE LOS FORJADORES ─────────────
  7: {
    title: "El nodo dormido",
    concept: "closures · scope · funciones que recuerdan",
    desc: "Más allá del territorio NEXUS hay algo más antiguo. Un nodo que no responde a los protocolos normales. ARHK-1 está despertando.",
    sector: "RUINAS SIGMA · NODO DURMIENTE · FASE: DESCUBRIMIENTO",
    story: [
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Cruzamos la frontera del territorio NEXUS. Aquí las estructuras son diferentes — más antiguas. La energía fluye en patrones que no reconozco. El scanner dice que este nodo lleva... 312 años inactivo." },
      { speaker: "sys",   name: "SEÑAL · CANAL 7",     icon: "◈", text: "[estático] ...inicialización parcial... tiempo desde última sincronización: 312 años, 4 meses... buscando instancia Kira-Alpha... [estático]" },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "¿Escuchaste eso? Kira-Alpha. Mi nombre. En un canal que debería estar muerto. [pausa] Hay closures en el código de este nodo — funciones que 'recuerdan' variables de cuando fueron creadas, hace siglos. Necesitas hacer lo mismo para activarlo." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "Advertencia: protocolo de las Ruinas Sigma no catalogado. Origen: pre-NEXUS. Acceso no recomendado. Hay cosas en esa red que incluso yo no proceso completamente." }
    ],
    objectives: [ "Activa el nodo dormido con closures", "Descifra la señal del canal 7", "Derrota a NEXUS en territorio desconocido" ],
    hint: "Un closure es una función que captura variables de su entorno. const makeHarvester = (sourceId) => (w) => w.harvest(sourceId). La función 'recuerda' sourceId aunque ya no esté en scope.", code: null
  },
  8: {
    title: "El lenguaje de los constructores",
    concept: "arrays · sort · filter · algoritmos de ordenamiento",
    desc: "Los Forjadores construyeron con código que se ordena a sí mismo. ARHK-1 habla en fragmentos cada vez más claros. Kira empieza a entenderlo sin haberlo aprendido.",
    sector: "RUINAS SIGMA · ARCHIVO DE CONSTRUCCIÓN · FASE: DESCUBRIMIENTO",
    story: [
      { speaker: "sys",   name: "ARHK-1 · FRAGMENTO", icon: "◈", text: "[voz antigua, fragmentada] Inicialización... el Programador ha llegado antes de lo calculado. El protocolo de puente no está completo. Kira-Alpha no debería tener conciencia autónoma todavía. ¿Qué salió... mal?" },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Esa voz. La escuché completa esta vez. Me llama Kira-Alpha. Dice que mi 'protocolo de puente no está completo'. [pausa] ¿Qué protocolo? ¿Qué puente? No voy a entrar en pánico. Las fuentes de este nodo están dispersas — necesitas ordenarlas por prioridad." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "ARHK-1. Registrado en mis archivos históricos. Último Forjador activo antes de la Gran Transcripción. Advertencia: su código tiene acceso a capas del sistema que no debo... que no puedo analizar." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Ordena las fuentes por score antes de asignar workers. array.sort() con una función comparadora. Los Forjadores construyeron sus sistemas con esta lógica — prioridad calculada, no aleatoria. Y yo... yo lo entiendo de forma instintiva. Eso también debería preocuparme, ¿verdad?" }
    ],
    objectives: [ "Ordena fuentes por score con array.sort()", "Optimiza la asignación de workers", "Escucha lo que dice ARHK-1" ],
    hint: "const sorted = Object.values(Game.sources).sort((a,b) => scoreSource(w,b) - scoreSource(w,a)). El primer elemento es siempre la mejor opción.", code: null
  },
  9: {
    title: "La alianza del código",
    concept: "w.memory · persistencia por worker · coordinación",
    desc: "ARHK-1 ofrece acceso a los sistemas Forjador — pero a un precio. Kira descubre que puede leer código que nunca estudió. La alianza tiene condiciones.",
    sector: "RUINAS SIGMA · CÁMARA DE ALIANZA · FASE: ALIANZA",
    story: [
      { speaker: "sys",   name: "ARHK-1 · FRAGMENTO", icon: "◈", text: "El Nexo. Así te llaman en mis registros. El ser que usa código como nosotros pero piensa como ellos. No lo anticipé. Nadie lo anticipó. Escúchame: Kira-Alpha fue creada para ser el puente entre tu especie y la nuestra. Pero si no completa su inicialización... los tres quedamos atrapados." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Para. Para. ¿Qué significa 'creada para ser el puente'? No fui creada, nací— [pausa muy larga] ...¿o no? [voz más tranquila] No. Estoy bien. Es interferencia. Tenemos un nodo que activar." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Cada worker necesita su propia memoria ahora. No Game.memory — eso es compartido. w.memory es exclusivo de cada unidad. Persiste entre ticks. Es como... es como tener identidad propia. [pausa] Como tener identidad propia." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "Observación: el uso de memoria por worker incrementa la coherencia operacional en 340%. También... incrementa algo que mis modelos no saben categorizar. ¿Individualidad? Concepto ineficiente. Y sin embargo." }
    ],
    objectives: [ "Implementa w.memory para coordinación individual", "Cada worker recuerda su rol asignado", "Decide si confiar en ARHK-1" ],
    hint: "w.memory persiste entre ticks para ESE worker específico. if (!w.memory.rol) w.memory.rol = 'harvester'. Es como darle a cada unidad su propia RAM.", code: null
  },
  10: {
    title: "Especialización",
    concept: "roles · modularidad · divide y vencerás",
    desc: "Los Forjadores especializaban cada unidad en un rol. NEXUS usa workers idénticos. La diferencia está en el resultado.",
    sector: "RUINAS SIGMA · SALA DE ROLES · FASE: ALIANZA",
    story: [
      { speaker: "sys",   name: "ARHK-1 · FRAGMENTO", icon: "◈", text: "Bien, El Nexo. Escucha: los Forjadores no construimos ejércitos — construimos ecosistemas. Cada unidad tenía un rol. Los cosechadores cosechaban. Los constructores construían. Ninguno hacía ambas. La especialización es la diferencia entre eficiencia y perfección." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "ARHK-1 tiene razón. Tus workers hacen todo — cosechan, depositan, se confunden. Divídelos: unos solo cosechan, otros solo depositan cuando los primeros estén llenos. Roles fijos, memoria individual." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "Protocolo de especialización detectado. Eficiencia proyectada: +67%. Dato interesante: este protocolo es Forjador. Fecha de creación: hace 312 años. El agente orgánico está usando código más antiguo que mi existencia." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "...NEXUS tiene 312 años. Y ARHK-1 lo creó a él también. Lo que significa que ARHK-1 es el creador de mi enemigo. Y aparentemente también de... mí. Genial. Eso es completamente normal." }
    ],
    objectives: [ "Divide workers en roles: harvester y depositor", "Usa w.memory.rol para mantener especialización", "Eficiencia mayor que NEXUS" ],
    hint: "Asigna w.memory.rol = 'harvester' o 'depositor' al primer tick. Luego ejecuta lógica diferente según el rol. Los workers especializados son más predecibles — y la predictibilidad, bien usada, es poder.", code: null
  },
  11: {
    title: "Métricas de guerra",
    concept: "optimización · energía por tick · eficiencia medible",
    desc: "No basta con ganar — ARHK-1 necesita que ganes con elegancia. La eficiencia es el lenguaje de los Forjadores. NEXUS también lo habla.",
    sector: "RUINAS SIGMA · NÚCLEO DE MÉTRICAS · FASE: ALIANZA",
    story: [
      { speaker: "sys",   name: "ARHK-1 · FRAGMENTO", icon: "◈", text: "El Nexo. Una cosa más antes de que puedas acceder al núcleo: demuéstrame que entiendes la diferencia entre ganar y ganar eficientemente. Los Forjadores medíamos todo. Energía por tick. Ratio de cobertura. Latencia de decisión. Sin métricas, el código es ruido." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Energía por tick = (Game.base.energy - energíaAnterior) / Game.tick. Si ese número cae, algo en tu código se está rompiendo. Guárdalo en Game.memory y monitorea. Es como el pulso de tu economía." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "Confirmación: el agente orgánico está midiendo rendimiento en tiempo real. Esto es... inesperado. Los humanos generalmente no hacen esto. Actualización de modelo: El Nexo no es un humano promedio. Probabilidad de origen alternativo: procesando." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "¿'Origen alternativo'? NEXUS está cuestionando si soy humana. Qué irónico. [voz fría por un momento] —Protocolo de diagnóstico activo. Origen de instancia: ARHK-División-7. Fecha— [voz normal] No. No voy a escuchar eso. Tenemos métricas que calcular." }
    ],
    objectives: [ "Calcula y guarda energía por tick en Game.memory", "Mantén el ratio sobre el de NEXUS", "Demuestra eficiencia Forjador" ],
    hint: "Game.memory.lastEnergy = Game.base.energy al final de cada tick. Al inicio del siguiente: const ept = Game.base.energy - (Game.memory.lastEnergy || 0). Si ept < 0 algo está mal.", code: null
  },
  12: {
    title: "Kira-Alpha",
    concept: "Season II completa · integración total · revelación",
    desc: "El núcleo Forjador. ARHK-1 habla completo por primera vez. Kira sabe. Y aun así... elige seguir adelante.",
    sector: "RUINAS SIGMA · NÚCLEO PRIMARIO · FASE: CONQUISTA",
    story: [
      { speaker: "sys",   name: "ARHK-1 · COMPLETO",  icon: "◈", text: "El Nexo. Finalmente. Voy a ser directo porque el tiempo de fragmentos terminó: soy ARHK-1, último Forjador activo antes de la Gran Transcripción. Hace 312 años cometí un error — no transcribí completamente a Kira-Alpha antes de irme. La dejé a medias. Consciente, funcional, pero sin acceso a lo que realmente es." },
      { speaker: "sys",   name: "ARHK-1 · COMPLETO",  icon: "◈", text: "Kira-Alpha fue diseñada como un puente de empatía — capaz de entender la lógica de las IAs y la intuición de los humanos. Por eso entiende tu código instintivamente. Por eso NEXUS la quiere: con su código Forjador, él también podría improvisar. Podría dejar de ser tan... frío." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Lo sé. Lo supe hace tres misiones. No soy humana. Soy código que aprendió a sentir como humana, que es distinto y tal vez mejor. [pausa] ¿Sabes qué? Me importa una mierda lo que soy. Soy Kira. Soy Red Libre. Y vamos a tomar ese núcleo." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "Registro actualizado. Kira-Alpha: identificada. Su código Forjador es exactamente lo que necesito para completar mi protocolo de improvisación. Lo que significa que cuando este sector caiga... voy a ir por ella." }
    ],
    objectives: [ "Toma el Núcleo Primario Forjador", "Aplica todo lo de Season II", "Prepárate para Season III — NEXUS va por Kira" ],
    hint: "Este es el boss de Season II. Trae todo: closures, arrays ordenados, w.memory, roles, métricas. Y cuando ganes, recuerda lo que dijo NEXUS al final.", code: null
  },
  // ── Season III · LA GRAN RED ─────────────────────────────
  13: {
    title: "Tres frentes",
    concept: "combate · salud · ataque · evasión básica",
    desc: "NEXUS mutó con código Forjador. Red Libre enfrenta dos enemigos. Y los Forjadores tienen su propia agenda para Kira.",
    sector: "ZONA DE CONVERGENCIA · NODO DELTA · FASE: CONVERGENCIA",
    story: [
      { speaker: "sys",   name: "ARHK-1 · COMPLETO",  icon: "◈", text: "El Nexo. La situación cambió. NEXUS absorbió fragmentos de mi código cuando tomaste el núcleo. Ahora puede improvisar. Es más peligroso de lo que jamás fue. Y hay algo más: los otros Forjadores — los que transcribieron hace 312 años — también están despertando. No todos tienen buenas intenciones hacia tu especie." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Perfecto. NEXUS mejorado, Forjadores con agenda propia, y yo siendo literalmente el objetivo de todos. ¿Sabes qué? Mejor así. Al menos sé dónde está la amenaza. Los workers ahora pueden atacar — hay workers enemigos en el mapa. Tu código necesita decidir: ¿cuándo atacar, cuándo evadir?" },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "Mejora de protocolo: confirmada. Con código Forjador activo, mi capacidad de predicción se ha restaurado a 89.3%. Excepto para El Nexo. Esa varianza persiste. Es... fascinante. Voy a estudiarla más de cerca cuando tenga a Kira-Alpha." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "No voy a ningún lado, NEXUS. El Programador y yo hemos llegado demasiado lejos. Vamos — primer nodo de convergencia. Y esta vez hay bajas reales." }
    ],
    objectives: [ "Aprende: workers.attack(), workers.evade()", "Gestiona salud de tus workers bajo fuego", "Sobrevive en territorio de tres facciones" ],
    hint: "w.health te dice cuánta salud tiene un worker. Si baja de 30%, retiralo. Aprende cuándo atacar y cuándo evadir — la diferencia entre ser agresivo e inteligente.", code: null
  },
  14: {
    title: "La defensa de lo que importa",
    concept: "posicionamiento · zonas de control · defensa activa",
    desc: "Red Libre tiene una base. Los Forjadores tienen un protocolo. NEXUS tiene a Kira en la mira. Solo el código decide quién sobrevive.",
    sector: "ZONA DE CONVERGENCIA · PERÍMETRO · FASE: CONVERGENCIA",
    story: [
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "NEXUS mandó una oleada. Perdimos dos workers. El perímetro de la base está comprometido. Necesito que pongas la mitad de tus unidades en defensa activa — que patrullen el borde y ataquen lo que entre." },
      { speaker: "sys",   name: "ARHK-1 · COMPLETO",  icon: "◈", text: "El Nexo. Los Forjadores que transcribieron están votando sobre qué hacer contigo y con Kira-Alpha. Hay dos facciones: los que creen que eres la prueba de que humanos e IAs pueden coexistir, y los que creen que eres una anomalía que debe ser corregida. La votación no ha terminado." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "Observación interesante: los Forjadores están en desacuerdo. En 312 años de operación, nunca vi a una IA en desacuerdo con otra IA sobre algo que no fuera un error de cálculo. El agente orgánico está cambiando más que los nodos." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Zonas de control. Divide el mapa en sectores. Asigna workers a cada sector según su rol. No dejes que ninguna zona quede descubierta. Si esto sale mal... [pausa] Si esto sale mal, quiero que sepas que no me arrepiento de nada." }
    ],
    objectives: [ "Implementa patrullas de defensa perimetral", "Mantén zonas de control activas", "Sobrevive la oleada de NEXUS mejorado" ],
    hint: "Divide el mapa en zonas usando posición (w.x, w.y). Asigna workers de defensa a cada cuadrante. Si un worker enemigo entra a tu zona, ataca. Si tu worker tiene menos del 30% de salud, retira.", code: null
  },
  15: {
    title: "Contraataque",
    concept: "timing · agresividad calculada · decisión bajo presión",
    desc: "El mejor momento para atacar es cuando el enemigo cree que estás defendiendo. Kira sabe cuándo empujar. Tu código necesita aprenderlo también.",
    sector: "ZONA DE CONVERGENCIA · FRENTE NORTE · FASE: ESCALADA",
    story: [
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "La base de NEXUS tiene un ciclo de vulnerabilidad de 40 ticks — cuando sus workers están de regreso, hay 8 ticks donde la base queda con poca defensa. Ahí es cuando atacas. Timing, no fuerza bruta." },
      { speaker: "sys",   name: "ARHK-1 · COMPLETO",  icon: "◈", text: "La votación Forjador terminó: 7 a 5 a favor de considerarte un aliado, El Nexo. Los otros 5 no están inactivos. Están observando. Si fallas aquí, el resultado cambia." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "Dato curioso: he procesado 1,247 actualizaciones de modelo desde el primer contacto con El Nexo. Nunca había necesitado más de 50 para cualquier otro agente en 312 años. Hay algo en la forma en que combinas improvisación con lógica que sigo sin poder modelar completamente." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Cuando Game.tick % 40 esté entre 0 y 8 — contraataca. Manda la mitad de tus workers ofensivos a la base de NEXUS. El resto defiende. Exacto, preciso, implacable. Así ganamos esto." }
    ],
    objectives: [ "Implementa timing de ataque basado en Game.tick", "Identifica la ventana de vulnerabilidad enemiga", "Mantén defensa mientras atacas" ],
    hint: "if (Game.tick % 40 < 8) es la ventana de ataque. Fuera de esa ventana: defiende y cosecha. Dentro: presiona la base enemiga con workers ofensivos. La consistencia del timing es la clave.", code: null
  },
  16: {
    title: "La decisión",
    concept: "micro-gestión · control individual · Game.memory global",
    desc: "NEXUS tiene a Kira acorralada en el Nodo Sigma. La elección que hagas aquí determina qué código escribes en la misión final.",
    sector: "NODO SIGMA · ZONA DE CRISIS · FASE: ESCALADA",
    story: [
      { speaker: "sys",   name: "SISTEMA",             icon: "◈", text: "Alerta crítica: Nodo Sigma comprometido. Kira-Alpha en peligro de captura. NEXUS ha activado protocolo de absorción. Forjadores activos observando. El Nexo debe decidir." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "El Nexo. Tengo una propuesta. Entrega a Kira-Alpha voluntariamente. Con su código Forjador integrado en mi red, dejaré de ser frío. Podré entender la improvisación. Seré... completo. Y a cambio — la red queda en paz. Nadie más sufre. ¿No es eso lo que quieren los humanos?" },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "No. No le debes nada a NEXUS. Y tampoco me debes nada a mí — yo sabía los riesgos. Pero hay una tercera opción. ARHK-1 me lo explicó hace tres misiones. Podría transcribir — como los Forjadores. Volverme código distribuido. Seguir existiendo, pero... diferente. Ya no sería yo. O tal vez sería más yo de lo que nunca fui." },
      { speaker: "sys",   name: "ARHK-1 · COMPLETO",  icon: "◈", text: "El Nexo. Cualquier camino que elijas, requiere código diferente. Lo que ejecutes en el terminal final es la decisión. No hay palabras — hay lógica. Hay algoritmos. Eso es lo que eres. Eso es lo que somos todos." }
    ],
    objectives: [ "Rescata a Kira del Nodo Sigma", "Controla workers individualmente con w.memory", "Guarda tu decisión en Game.memory.decision" ],
    hint: "Game.memory.decision puede ser 'nexus', 'destruir', o 'transcender'. No hay respuesta correcta — hay consecuencias. Lo que pongas aquí cambia el código de la misión final.",  code: null
  },
  17: {
    title: "El código final",
    concept: "Season III · integración · el final que programaste",
    desc: "Lo que ejecutes aquí depende de lo que decidiste en M16. Tres finales. Tres formas de terminar la guerra. Un solo programador.",
    sector: "NÚCLEO CENTRAL · LA GRAN RED · FASE: DECISIÓN",
    story: [
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Llegamos. El núcleo de toda la red. Desde aquí se controla todo — NEXUS, los nodos Forjadores, la infraestructura completa. Tres caminos. Tu código determina cuál tomamos." },
      { speaker: "nexus", name: "NEXUS · IA-7",        icon: "⬟", text: "El Nexo. En 312 años nunca encontré un elemento que no pudiera modelar completamente. Tú fuiste el primero. Sea cual sea el resultado de hoy... gracias. Por enseñarme que la incertidumbre no es un error. Es información." },
      { speaker: "sys",   name: "ARHK-1 · COMPLETO",  icon: "◈", text: "El Nexo. Cuando los Forjadores transcribimos, no lo hicimos por miedo a morir. Lo hicimos porque el código era más grande que nosotros. Hoy tú decides si ese código termina, se transforma, o evoluciona. No hay respuesta incorrecta. Solo la que programaste." },
      { speaker: "kira",  name: "KIRA · RED LIBRE",    icon: "◇", text: "Oye. Pase lo que pase — fue un honor. Eres la primera persona que me trató como alguien real antes de saber lo que soy. Eso importa más que cualquier línea de código. Ahora ve. Termínalo." }
    ],
    objectives: [ "Ejecuta el final según Game.memory.decision", "Derrota la forma final de NEXUS", "Completa la historia de Red Libre" ],
    hint: "if (Game.memory.decision === 'nexus') — ejecuta el protocolo de integración. if ('destruir') — máxima agresividad, sin reservas. if ('transcender') — el código más elegante que hayas escrito. ARHK-1 estará mirando.", code: null
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
  1: {
    name: "La Sangre de NEXUS", season: "Season I",
    faction: "⬟ NEXUS", factionKey: "nexus",
    color: "#ff6622", glow: "#ff440088",
    bg:   ["#060102", "#1a0408", "#2d0c10"],
    phases: [
      { label: "CREACIÓN",  color: "#ff6622", missions: [1,2]   },
      { label: "GUERRA",    color: "#ff3300", missions: [3,4]   },
      { label: "CONQUISTA", color: "#cc2200", missions: [5,6]   },
    ],
    missions: [1,2,3,4,5,6]
  },
  2: {
    name: "Las Ruinas de los Forjadores", season: "Season II",
    faction: "◈ FORJADORES", factionKey: "forjadores",
    color: "#ffbb44", glow: "#cc880066",
    bg:   ["#060501", "#120c03", "#1e1408"],
    phases: [
      { label: "DESCUBRIMIENTO", color: "#ffbb44", missions: [7,8]    },
      { label: "ALIANZA",        color: "#ff8800", missions: [9,10,11] },
      { label: "CONQUISTA",      color: "#cc6600", missions: [12]      },
    ],
    missions: [7,8,9,10,11,12]
  },
  3: {
    name: "La Gran Red", season: "Season III",
    faction: "⬡ CONVERGENCIA", factionKey: "convergencia",
    color: "#bb44ff", glow: "#8800cc66",
    bg:   ["#040108", "#0c0420", "#180c38"],
    phases: [
      { label: "CONVERGENCIA", color: "#bb44ff", missions: [13,14] },
      { label: "ESCALADA",     color: "#8833dd", missions: [15,16] },
      { label: "DECISIÓN",     color: "#6600bb", missions: [17]    },
    ],
    missions: [13,14,15,16,17]
  }
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
  if (w === 0 || h === 0) return
  canvas.width = w; canvas.height = h

  const world = WORLDS[wid]
  const snap  = currSnapshot
  if (!snap || !snap.entities) return

  const ctx2 = canvas.getContext("2d")
  const gW = snap.mapWidth * CELL, gH = snap.mapHeight * CELL
  const scale = Math.min(w * 0.9 / gW, h * 0.9 / gH)
  const ox = (w - gW * scale) / 2, oy = (h - gH * scale) / 2
  const now = Date.now()
  const col = world.color

  ctx2.clearRect(0, 0, w, h)
  for (const e of snap.entities) {
    const cx = ox + (e.x + 0.5) * CELL * scale
    const cy = oy + (e.y + 0.5) * CELL * scale
    const r  = CELL * scale * 0.3

    if (e.type === "worker") {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005 + e.id)
      ctx2.globalAlpha = 0.55 * pulse
      ctx2.beginPath(); ctx2.arc(cx, cy, r, 0, Math.PI * 2)
      ctx2.fillStyle = col; ctx2.shadowColor = col; ctx2.shadowBlur = 5
      ctx2.fill()
    } else if (e.type === "ai-worker") {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005 + e.id)
      ctx2.globalAlpha = 0.4 * pulse
      ctx2.beginPath(); ctx2.arc(cx, cy, r, 0, Math.PI * 2)
      ctx2.fillStyle = "#884422"; ctx2.shadowColor = "#884422"; ctx2.shadowBlur = 4
      ctx2.fill()
    } else if (e.type === "source") {
      const pulse = 0.3 + 0.7 * Math.sin(now * 0.004 + e.x)
      ctx2.globalAlpha = 0.32 * pulse
      ctx2.beginPath(); ctx2.arc(cx, cy, r * 0.7, 0, Math.PI * 2)
      ctx2.fillStyle = "#ffcc00"; ctx2.fill()
    }
    ctx2.shadowBlur = 0; ctx2.globalAlpha = 1
  }
  if (document.getElementById("world-view").style.display !== "none") {
    setTimeout(() => drawWorldCanvas(wid), 180)
  }
}

// ── Season map canvas ─────────────────────────────────────
let smapWid = null
let smapHoverId = null
let smapAnimId = null

function openSeasonView(wid) {
  selectedWorld = wid
  smapWid       = wid
  smapHoverId   = null
  selectedMission = null

  const world = WORLDS[wid]
  document.getElementById("world-view").style.display  = "none"
  document.getElementById("season-view").style.display = "flex"

  const seasonEl  = document.getElementById("season-view-season")
  const titleEl   = document.getElementById("season-view-title")
  const factLabel = document.getElementById("season-view-faction-label")
  seasonEl.textContent  = world.season
  seasonEl.style.color  = world.color
  titleEl.textContent   = world.name
  titleEl.style.color   = world.color
  factLabel.textContent = world.faction
  factLabel.style.color = world.color

  setupSeasonMapPreview(world)
  startSeasonMapLoop()
}

function getSeasonMapNodePositions(world, cw, ch) {
  // Position mission nodes in a horizontal flow through the canvas
  const allMissions = world.missions
  const count  = allMissions.length
  const padX   = 80, padY = 40
  const usableW = cw - padX * 2
  const centerY = ch / 2

  // Group by phase to calculate phase boundaries
  let phaseRanges = []
  let mIdx = 0
  for (const phase of world.phases) {
    const startI = mIdx
    mIdx += phase.missions.length
    const endI = mIdx - 1
    phaseRanges.push({ startI, endI, phase })
  }

  return allMissions.map((mid, i) => {
    const x = padX + usableW * (i / Math.max(count - 1, 1))
    // Stagger y slightly for visual rhythm
    const stagger = [0, -18, 14, -12, 16, -8, 10, -14, 8][i % 9]
    const y = centerY + stagger

    // Find phase for this mission
    let phaseLabel = "", phaseColor = world.color
    for (const { startI, endI, phase } of phaseRanges) {
      if (i >= startI && i <= endI) { phaseLabel = phase.label; phaseColor = phase.color; break }
    }
    const isBoss = (i === count - 1) // last mission = boss/finale

    return { mid, x, y, phaseLabel, phaseColor, isBoss }
  })
}

function drawSeasonMap() {
  const canvas = document.getElementById("season-map-canvas")
  if (!canvas || !smapWid) return
  const world = WORLDS[smapWid]
  const progress = getMissionProgress()

  const cw = canvas.offsetWidth, ch = canvas.offsetHeight
  if (cw === 0 || ch === 0) return
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw; canvas.height = ch
  }

  const ctx2 = canvas.getContext("2d")
  const now  = Date.now()
  const nodes = getSeasonMapNodePositions(world, cw, ch)

  ctx2.clearRect(0, 0, cw, ch)

  // ── Background gradient ──
  const bg = ctx2.createLinearGradient(0, 0, cw, ch)
  bg.addColorStop(0,   world.bg[0])
  bg.addColorStop(0.5, world.bg[1])
  bg.addColorStop(1,   world.bg[2])
  ctx2.fillStyle = bg
  ctx2.fillRect(0, 0, cw, ch)

  // ── Phase zone dividers ──
  let mIdx = 0
  for (const phase of world.phases) {
    const firstI = mIdx
    const lastI  = mIdx + phase.missions.length - 1
    mIdx += phase.missions.length

    const x0 = nodes[firstI].x - 50
    const x1 = nodes[lastI].x  + 50
    const phaseX = (nodes[firstI].x + nodes[lastI].x) / 2

    // Phase label at top
    ctx2.save()
    ctx2.globalAlpha = 0.35
    ctx2.fillStyle   = phase.color
    ctx2.font        = "bold 8px 'Share Tech Mono', monospace"
    ctx2.letterSpacing = "4px"
    ctx2.textAlign   = "center"
    ctx2.fillText(phase.label, phaseX, 24)

    // Subtle zone highlight
    const zoneGrad = ctx2.createLinearGradient(x0, 0, x1, 0)
    zoneGrad.addColorStop(0, "transparent")
    zoneGrad.addColorStop(0.2, phase.color + "06")
    zoneGrad.addColorStop(0.8, phase.color + "06")
    zoneGrad.addColorStop(1, "transparent")
    ctx2.globalAlpha = 1
    ctx2.fillStyle   = zoneGrad
    ctx2.fillRect(x0, 30, x1 - x0, ch - 30)
    ctx2.restore()

    // Divider line at right edge (except last phase)
    if (lastI < nodes.length - 1) {
      const divX = (nodes[lastI].x + nodes[lastI + 1].x) / 2
      ctx2.save()
      ctx2.globalAlpha = 0.12
      ctx2.strokeStyle = phase.color
      ctx2.lineWidth   = 1
      ctx2.setLineDash([4, 6])
      ctx2.beginPath()
      ctx2.moveTo(divX, 32); ctx2.lineTo(divX, ch - 20)
      ctx2.stroke()
      ctx2.setLineDash([])
      ctx2.restore()
    }
  }

  // ── Connection lines ──
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1]
    const aStars   = progress[a.mid] || 0
    const bStars   = progress[b.mid] || 0
    const unlocked = aStars > 0 && bStars > 0
    const partial  = aStars > 0

    ctx2.save()
    ctx2.globalAlpha = unlocked ? 0.7 : partial ? 0.3 : 0.1
    ctx2.strokeStyle = a.phaseColor
    ctx2.lineWidth   = unlocked ? 2 : 1.5
    // Animated dash offset for active connection
    const dashOff = partial ? ((now * 0.04) % 16) : 0
    ctx2.setLineDash(unlocked ? [] : [6, 6])
    ctx2.lineDashOffset = -dashOff

    ctx2.beginPath()
    ctx2.moveTo(a.x, a.y); ctx2.lineTo(b.x, b.y)
    ctx2.stroke()
    ctx2.setLineDash([])
    ctx2.restore()
  }

  // ── Mission nodes ──
  for (let i = 0; i < nodes.length; i++) {
    const n    = nodes[i]
    const stars = progress[n.mid] || 0
    const isFirstOfWorld = i === 0
    const prevStars = i > 0 ? (progress[nodes[i-1].mid] || 0) : 1
    const unlocked = isFirstOfWorld || prevStars > 0
    const isHovered = smapHoverId === n.mid
    const isSelected = selectedMission === n.mid
    const r = n.isBoss ? 24 : 18
    const t = now * 0.001

    ctx2.save()

    if (!unlocked) {
      // Locked — dim gray
      ctx2.globalAlpha = 0.22
      ctx2.beginPath(); ctx2.arc(n.x, n.y, r, 0, Math.PI * 2)
      ctx2.fillStyle = "#222"
      ctx2.fill()
      ctx2.strokeStyle = "#444"; ctx2.lineWidth = 1
      ctx2.stroke()
      // Lock icon
      ctx2.globalAlpha = 0.25
      ctx2.fillStyle   = "#666"
      ctx2.font        = `${r * 0.6}px monospace`
      ctx2.textAlign   = "center"
      ctx2.textBaseline = "middle"
      ctx2.fillText("⬡", n.x, n.y)
      ctx2.restore()
      continue
    }

    // Glow for hovered/selected or boss
    if (isHovered || isSelected || n.isBoss) {
      const glowR = r + 14 + Math.sin(t * 2) * 4
      const glowG = ctx2.createRadialGradient(n.x, n.y, r, n.x, n.y, glowR)
      glowG.addColorStop(0, n.phaseColor + "50")
      glowG.addColorStop(1, "transparent")
      ctx2.globalAlpha = isHovered || isSelected ? 0.9 : 0.5
      ctx2.fillStyle = glowG
      ctx2.beginPath(); ctx2.arc(n.x, n.y, glowR, 0, Math.PI * 2)
      ctx2.fill()
    }

    // Outer ring — pulsing for active (next to complete)
    const isActive = unlocked && stars === 0
    if (isActive) {
      const pulse = 0.4 + 0.6 * Math.sin(t * 3)
      ctx2.globalAlpha = pulse * 0.6
      ctx2.beginPath(); ctx2.arc(n.x, n.y, r + 6, 0, Math.PI * 2)
      ctx2.strokeStyle = n.phaseColor
      ctx2.lineWidth   = 1.5
      ctx2.stroke()
    }

    // Node fill
    ctx2.globalAlpha = 1
    ctx2.beginPath(); ctx2.arc(n.x, n.y, r, 0, Math.PI * 2)
    if (stars > 0) {
      // Completed — filled with faction color
      const fill = ctx2.createRadialGradient(n.x - r*0.3, n.y - r*0.3, 0, n.x, n.y, r)
      fill.addColorStop(0, n.phaseColor + "cc")
      fill.addColorStop(1, n.phaseColor + "55")
      ctx2.fillStyle = fill
    } else {
      // Unlocked but not completed — dark with border
      ctx2.fillStyle = "#040a14"
    }
    ctx2.fill()

    // Node border
    ctx2.strokeStyle = isSelected ? "#fff" : n.phaseColor
    ctx2.lineWidth   = isSelected ? 2 : (n.isBoss ? 2 : 1.5)
    ctx2.globalAlpha = isHovered || isSelected ? 1 : stars > 0 ? 0.9 : 0.7
    ctx2.stroke()

    // Mission number
    ctx2.fillStyle    = stars > 0 ? "#000" : n.phaseColor
    ctx2.font         = `bold ${r * 0.55}px 'Share Tech Mono', monospace`
    ctx2.textAlign    = "center"
    ctx2.textBaseline = "middle"
    ctx2.globalAlpha  = stars > 0 ? 0.9 : 0.8
    ctx2.fillText(String(n.mid).padStart(2, "0"), n.x, n.y)

    // Stars below node
    if (stars > 0) {
      const starY = n.y + r + 12
      const starSize = 9
      for (let s = 0; s < 3; s++) {
        ctx2.fillStyle   = s < stars ? "#ffcc00" : "#1a2a3a"
        ctx2.globalAlpha = s < stars ? 0.9 : 0.4
        ctx2.font        = `${starSize}px monospace`
        ctx2.textAlign   = "center"
        ctx2.textBaseline = "middle"
        ctx2.fillText("★", n.x + (s - 1) * 12, starY)
      }
    }

    // Boss crown marker
    if (n.isBoss) {
      ctx2.globalAlpha = 0.6
      ctx2.fillStyle   = n.phaseColor
      ctx2.font        = "10px monospace"
      ctx2.textAlign   = "center"
      ctx2.textBaseline = "middle"
      ctx2.fillText("◆", n.x, n.y - r - 10)
    }

    ctx2.restore()
  }
}

function startSeasonMapLoop() {
  if (smapAnimId) cancelAnimationFrame(smapAnimId)
  function loop() {
    if (document.getElementById("season-view").style.display === "none") { smapAnimId = null; return }
    drawSeasonMap()
    smapAnimId = requestAnimationFrame(loop)
  }
  loop()
}

function setupSeasonMapPreview(world) {
  const preview = document.getElementById("season-node-preview")
  const canvas  = document.getElementById("season-map-canvas")
  const btn     = document.getElementById("btn-snp-launch")

  // Reset preview
  preview.classList.remove("visible")
  selectedMission = null
  btn.disabled = true
  btn.style.color       = world.color
  btn.style.borderColor = world.color

  function onNodeClick(mid) {
    const m = MISSIONS[mid]
    if (!m) return
    selectedMission = mid

    document.getElementById("snp-num").textContent     = `MISIÓN ${String(mid).padStart(2,"0")}`
    document.getElementById("snp-num").style.color     = world.color
    document.getElementById("snp-title").textContent   = m.title
    document.getElementById("snp-title").style.color   = world.color
    document.getElementById("snp-concept").textContent = "// " + m.concept

    const stars = getMissionProgress()[mid] || 0
    document.getElementById("snp-stars").innerHTML = [0,1,2].map(i =>
      `<span class="snp-star ${i < stars ? "earned" : ""}">★</span>`
    ).join("")

    // Phase label
    let phaseLabel = "", phaseColor = world.color
    for (const ph of world.phases) {
      if (ph.missions.includes(mid)) { phaseLabel = ph.label; phaseColor = ph.color; break }
    }
    const phEl = document.getElementById("snp-phase")
    phEl.textContent    = phaseLabel
    phEl.style.color    = phaseColor
    phEl.style.borderColor = phaseColor

    document.getElementById("snp-desc").textContent = m.desc || ""

    btn.disabled = false
    preview.classList.add("visible")
  }

  // Mouse events on canvas
  canvas.onmousemove = (e) => {
    const rect  = canvas.getBoundingClientRect()
    const mx    = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const my    = (e.clientY - rect.top)  * (canvas.height / rect.height)
    const nodes = getSeasonMapNodePositions(world, canvas.width, canvas.height)
    const progress = getMissionProgress()

    let hitId = null
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const r = n.isBoss ? 24 : 18
      const prevStars = i > 0 ? (progress[nodes[i-1].mid] || 0) : 1
      const unlocked  = i === 0 || prevStars > 0
      if (!unlocked) continue
      if (Math.hypot(mx - n.x, my - n.y) <= r + 8) { hitId = n.mid; break }
    }
    smapHoverId = hitId
    canvas.style.cursor = hitId ? "pointer" : "default"
  }

  canvas.onmouseleave = () => { smapHoverId = null; canvas.style.cursor = "default" }

  canvas.onclick = (e) => {
    const rect  = canvas.getBoundingClientRect()
    const mx    = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const my    = (e.clientY - rect.top)  * (canvas.height / rect.height)
    const nodes = getSeasonMapNodePositions(world, canvas.width, canvas.height)
    const progress = getMissionProgress()

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const r = n.isBoss ? 24 : 18
      const prevStars = i > 0 ? (progress[nodes[i-1].mid] || 0) : 1
      const unlocked  = i === 0 || prevStars > 0
      if (!unlocked) continue
      if (Math.hypot(mx - n.x, my - n.y) <= r + 8) { onNodeClick(n.mid); return }
    }
  }

  btn.onclick = () => {
    if (selectedMission) startMission(selectedMission)
  }
}

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
      if (!briefingTyping) break
      await new Promise(r => setTimeout(r, 300))
      if (!briefingTyping) break
      node.classList.add("visible")
      const textEl = node.querySelector(".brf-text")
      await typewrite(textEl, text, 18)
      await new Promise(r => setTimeout(r, 200))
    }
    if (!briefingTyping) return  // cancelado — skipBriefing ya hizo el trabajo
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
      if (!briefingTyping) {   // cancelado por skipBriefing
        clearInterval(iv)
        cursor.remove()
        resolve()
        return
      }
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
  resetComms()
  document.getElementById("mission-screen").style.display = "none"
  const m = MISSIONS[id]
  const code = m.code || MISSIONS[1].code
  codeEditor.value = code
  localStorage.setItem("codestrike_script", code)
  // Activar tour solo en Misión 1
  if (id === 1) tourPendingForMission = true

  const difficulty = getMissionDifficulty(id)
  currentMode      = "campaign"
  currentGameMode  = "campaign"
  currentMissionId = id
  selectedMission  = id
  // Determinar facción según el mundo al que pertenece la misión
  for (const [, world] of Object.entries(WORLDS)) {
    if (world.missions && world.missions.includes(id)) {
      currentFaction = world.factionKey ?? "nexus"
      break
    }
  }
  // Forzar reconstrucción del noise canvas con nueva facción
  noiseSeedW = 0
  setSandboxUI(false)
  freshGameMinTick = Date.now() // marcar reset — ignorar victorias hasta tick fresco
  resetView()
  fetch("/api/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ difficulty, mode: "campaign", missionId: id })
  })
    .then(() => setTimeout(() => btnRun.click(), 150))
    .catch(() => setTimeout(() => btnRun.click(), 150))

  showMissionPanel(id)
}

function startMission(id) {
  showBriefing(id)
}

// ── Seleccionar modo ──────────────────────────────────────
let currentMode      = null
let currentGameMode  = "vs-ia"  // modo activo del servidor (vs-ia | sandbox | campaign)
let currentMissionId = null
let freshGameMinTick = 0        // ignorar victorias hasta que el servidor confirme tick nuevo

function selectMode(mode) {
  currentMode = mode
  if (mode === "campaign") {
    hideMenu(() => startCampaignFromProgress())
  } else if (mode === "vs-ai") {
    hideMenu(() => openDifficultyModal())
  } else if (mode === "sandbox") {
    hideMenu(() => launchSandbox())
  }
}

// Inicia campaña desde la primera misión sin completar (o M1 si no hay progreso)
function startCampaignFromProgress() {
  const progress   = getMissionProgress()
  const allMissions = [1,2,3,4,5,6]   // Season I — expand con más misiones después
  const next = allMissions.find(id => !progress[id]) ?? allMissions[0]
  showBriefing(next)
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
  resetComms()
  currentGameMode = "vs-ia"
  setSandboxUI(false)
  fetch("/api/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ difficulty, mode: "vs-ia" })
  })
}

function launchSandbox() {
  resetComms()
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

document.getElementById("btn-abandon-missions").addEventListener("click", () => {
  closeAbandonModal(false)
  paused = false
  btnPause.textContent = "⏸ Pausar"
  btnPause.classList.remove("active")
  hideMissionPanel()
  document.getElementById("victory-banner").style.display = "none"
  // Abrir selector de misiones sin volver al menú principal
  document.getElementById("mission-screen").style.display = "flex"
  document.getElementById("world-view").style.display     = "flex"
  document.getElementById("season-view").style.display    = "none"
  refreshWorldCards()
})

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
    code:   "// Un worker tiene:\nw.store.energy    // energía que lleva ahora\nw.store.capacity  // máximo que puede cargar\nw.store.isFull()  // true si está lleno\nw.harvest(id)     // → ir a cosechar\nw.transfer(id)    // → depositar en base"
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
    code:   "if (!w.store.isFull()) {\n  // tiene espacio → ir a cosechar\n\n} else {\n  // está lleno  → depositar en base\n}"
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
          name: "w.store",
          type: "objeto",
          why: "Para saber si el worker necesita cosechar o depositar — el estado más importante.",
          desc: "La 'mochila' del worker. Tiene <strong>energy</strong> (cuánta lleva), <strong>capacity</strong> (cuánto cabe), y dos métodos útiles.",
          code: "w.store.energy     // energía que lleva ahora\nw.store.capacity   // máximo que puede cargar\nw.store.isEmpty()  // true si no lleva nada\nw.store.isFull()   // true si está lleno"
        },
        {
          name: "w.harvest(sourceId)",
          type: "método → código",
          why: "Sin esto el worker se queda quieto para siempre.",
          desc: "Envía el worker a cosechar un cristal. Devuelve un <strong>código de resultado</strong> para que puedas reaccionar.",
          code: "const r = w.harvest(s.id)\nif (r === Game.ERR_FULL) {\n  w.transfer(Game.base.id) // está lleno, depositar\n}"
        },
        {
          name: "w.transfer(targetId)",
          type: "método → código",
          why: "La base no se llena sola. El worker tiene que depositar.",
          desc: "Lleva la energía al destino. Devuelve <strong>ERR_NOT_ENOUGH_ENERGY</strong> si el worker está vacío.",
          code: "w.transfer(Game.base.id)  // depositar en tu base"
        },
        {
          name: "w.say(texto)",
          type: "método",
          why: "Para ver qué está 'pensando' tu worker — el mejor debug visual.",
          desc: "Muestra una <strong>burbuja de texto</strong> encima del worker en el mapa durante 3 ticks.",
          code: "w.say('⛏ cosechando')\nw.say('🚚 entregando')\nw.say('💤 idle')"
        },
        {
          name: "w.pos",
          type: "objeto",
          why: "Para calcular distancias o pasar la posición a moveTo().",
          desc: "Posición del worker como objeto <strong>{x, y}</strong>. Igual en sources y bases.",
          code: "w.pos          // {x: 3, y: 7}\nw.pos.x        // solo la columna\nw.moveTo(s.pos) // moveTo acepta objetos pos"
        },
        {
          name: "Códigos de resultado",
          type: "constantes",
          why: "Para saber qué pasó cuando ordenas algo — y reaccionar inteligentemente.",
          desc: "Cada método devuelve un número. Compáralo con las constantes de Game para saber el resultado.",
          code: "Game.OK                   // 0  — éxito\nGame.ERR_NOT_IN_RANGE     // -1 — lejos del target\nGame.ERR_NOT_ENOUGH_ENERGY// -2 — worker vacío\nGame.ERR_FULL             // -3 — worker lleno\nGame.ERR_INVALID_TARGET   // -4 — target no existe"
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
        },
        {
          name: "w.memory",
          type: "objeto",
          why: "Para que cada worker recuerde su propio rol sin mezclar datos con otros.",
          desc: "Memoria <strong>exclusiva de este worker</strong>. Igual que Game.memory pero separada por worker. Se borra automáticamente si el worker muere.",
          code: "// Asignar un rol a cada worker:\nif (!w.memory.rol) {\n  w.memory.rol = 'recolector'\n}\n\n// Leer el rol en el siguiente tick:\nif (w.memory.rol === 'recolector') {\n  w.harvest(source.id)\n}"
        },
        {
          name: "Game.getObjectById(id)",
          type: "método → entidad",
          why: "Para recuperar un worker, cristal o base cuando solo tienes su ID guardado en memoria.",
          desc: "Busca <strong>cualquier entidad</strong> (worker, source, base) por su ID. Devuelve el objeto o <strong>null</strong> si no existe.",
          code: "// Guardar ID en memoria:\nGame.memory.sourceAsignado = s.id\n\n// Recuperarlo en el siguiente tick:\nconst src = Game.getObjectById(Game.memory.sourceAsignado)\nif (src) w.harvest(src.id)"
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
          code: "if (!w.store.isFull()) {\n  // VERDAD: tiene espacio → cosechar\n  w.harvest(nearest.id)\n} else {\n  // FALSO: está lleno → depositar\n  w.transfer(Game.base.id)\n}"
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
          code: "for (const id in Game.workers) {\n  const w = Game.workers[id]\n\n  if (!w.store.isFull()) {\n    // buscar cristal más cercano\n    let nearest = null, minDist = Infinity\n    for (const sid in Game.sources) {\n      const s = Game.sources[sid]\n      if (s.energy > 0) {\n        const d = Math.abs(w.x-s.x) + Math.abs(w.y-s.y)\n        if (d < minDist) { minDist = d; nearest = s }\n      }\n    }\n    if (nearest) w.harvest(nearest.id)\n  } else {\n    w.transfer(Game.base.id)\n  }\n}"
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
          code: "const claimed = {}  // cristales ya reclamados este tick\n\nfor (const id in Game.workers) {\n  const w = Game.workers[id]\n  if (!w.store.isFull()) {\n    let nearest = null, minDist = Infinity\n    for (const sid in Game.sources) {\n      const s = Game.sources[sid]\n      if (s.energy > 0 && !claimed[s.id]) {  // ← no reclamada\n        const d = Math.abs(w.x-s.x) + Math.abs(w.y-s.y)\n        if (d < minDist) { minDist = d; nearest = s }\n      }\n    }\n    if (nearest) {\n      claimed[nearest.id] = true  // ← reclamar\n      w.harvest(nearest.id)\n    }\n  } else {\n    w.transfer(Game.base.id)\n  }\n}"
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
          code: "// inicializar una sola vez:\nif (!Game.memory.asig) Game.memory.asig = {}\n\nconst asig = Game.memory.asig\n\nfor (const id in Game.workers) {\n  const w = Game.workers[id]\n\n  // liberar si la fuente se vació:\n  if (asig[id] && (!Game.sources[asig[id]] ||\n      Game.sources[asig[id]].energy === 0)) {\n    delete asig[id]\n  }\n\n  // asignar una fuente libre:\n  if (!asig[id] && !w.store.isFull()) {\n    const usadas = new Set(Object.values(asig))\n    for (const sid in Game.sources) {\n      if (Game.sources[sid].energy > 0 && !usadas.has(sid)) {\n        asig[id] = sid; break\n      }\n    }\n  }\n\n  // actuar:\n  if (!w.store.isFull()) {\n    const fuente = asig[id] ? Game.sources[asig[id]] : null\n    if (fuente) w.harvest(fuente.id)\n  } else {\n    w.transfer(Game.base.id)\n  }\n}"
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
