import { useState, useRef, useEffect } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

const NODE_W = 180
const NODE_H = 52
const H_GAP = 60   // vertical gap between levels
const V_GAP = 14   // gap between siblings

// Zoom: 10% por tick, com animação de 120ms. Throttle de 80ms evita empilhar animações.
const ZOOM_STEP     = 0.1
const ZOOM_ANIM_MS  = 120
const ZOOM_THROTTLE = 80
const MIN_SCALE     = 0.4
const MAX_SCALE     = 2.0

const TYPE_COLORS = {
  CORPORATIVO: { bg: '#1a3a5c', border: '#2a6099', text: '#93c5fd' },
  'DIVISÃO':   { bg: '#1e2a1a', border: '#2d6e2d', text: '#86efac' },
  SETOR:       { bg: '#1e1a2a', border: '#5b3fa0', text: '#c4b5fd' },
  EQUIPE:      { bg: '#2a1a1a', border: '#8b3a3a', text: '#fca5a5' },
  CÉLULA:      { bg: '#1e261e', border: '#4a7c59', text: '#6ee7b7' },
}
const DEFAULT_COLOR = { bg: '#1a1e2a', border: '#374151', text: '#94a3b8' }

function layout(nodes) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  const childrenOf = {}
  nodes.forEach(n => {
    const pid = n.parent_id ?? 'root'
    childrenOf[pid] = childrenOf[pid] ?? []
    childrenOf[pid].push(n.id)
  })

  const positions = {}

  function subtreeWidth(id) {
    const kids = childrenOf[id] ?? []
    if (!kids.length) return NODE_W + V_GAP
    return kids.reduce((sum, k) => sum + subtreeWidth(k), 0)
  }

  function place(id, x, y) {
    const kids = childrenOf[id] ?? []
    const sw = subtreeWidth(id)
    positions[id] = { x: x + sw / 2 - NODE_W / 2, y }
    let cx = x
    kids.forEach(k => {
      const ksw = subtreeWidth(k)
      place(k, cx, y + NODE_H + H_GAP)
      cx += ksw
    })
  }

  const roots = nodes.filter(n => !n.parent_id)
  let ox = V_GAP
  roots.forEach(r => {
    place(r.id, ox, V_GAP)
    ox += subtreeWidth(r.id)
  })

  const maxX = Math.max(...Object.values(positions).map(p => p.x + NODE_W + V_GAP), 400)
  const maxY = Math.max(...Object.values(positions).map(p => p.y + NODE_H + V_GAP), 300)

  return { positions, width: maxX, height: maxY, byId, childrenOf }
}

function NodeBox({ node, pos, selected, onSelect, onAdd, onEdit, onDelete, hasChildren, panMoved, canEdit }) {
  const c = TYPE_COLORS[node.tipo] ?? DEFAULT_COLOR

  const guard = (fn) => (e) => {
    e.stopPropagation()
    if (!panMoved.current) fn()
  }

  return (
    <g
      transform={`translate(${pos.x},${pos.y})`}
      onClick={() => { if (!panMoved.current) onSelect(node.id) }}
      style={{ cursor: 'pointer' }}
      className="group"
    >
      {selected && (
        <rect x={-3} y={-3} width={NODE_W + 6} height={NODE_H + 6}
          rx="10" fill="none" stroke="#e8a020" strokeWidth="1.5" opacity="0.5" />
      )}

      <rect
        x={0} y={0} width={NODE_W} height={NODE_H}
        rx="8"
        fill={c.bg}
        stroke={selected ? '#e8a020' : c.border}
        strokeWidth={selected ? 1.5 : 1}
      />

      <text
        x={10} y={15}
        fontSize="8" fontFamily="IBM Plex Mono" fontWeight="500"
        fill={c.border} letterSpacing="1"
        style={{ textTransform: 'uppercase' }}
      >
        {node.tipo}
      </text>

      <text
        x={10} y={34}
        fontSize="11" fontFamily="IBM Plex Sans" fontWeight="500"
        fill={c.text}
      >
        {node.nome.length > 20 ? node.nome.slice(0, 19) + '…' : node.nome}
      </text>

      {canEdit && (
        <g className="opacity-0 group-hover:opacity-100" style={{ transition: 'opacity .15s' }}>
          <g onClick={guard(() => onAdd(node))}
            transform={`translate(${NODE_W - 48}, ${NODE_H - 16})`}>
            <rect x={0} y={0} width={14} height={14} rx="3" fill="#2a6099" opacity=".8" />
            <text x={3.5} y={10.5} fontSize="10" fill="white" fontFamily="monospace">+</text>
          </g>
          <g onClick={guard(() => onEdit(node))}
            transform={`translate(${NODE_W - 32}, ${NODE_H - 16})`}>
            <rect x={0} y={0} width={14} height={14} rx="3" fill="#374151" opacity=".8" />
            <text x={3} y={10.5} fontSize="9" fill="#94a3b8" fontFamily="monospace">✎</text>
          </g>
          <g onClick={guard(() => onDelete(node, hasChildren))}
            transform={`translate(${NODE_W - 16}, ${NODE_H - 16})`}>
            <rect x={0} y={0} width={14} height={14} rx="3"
              fill={hasChildren ? '#374151' : '#7f1d1d'} opacity=".8" />
            <text x={4} y={10.5} fontSize="10" fill={hasChildren ? '#4b5563' : '#fca5a5'} fontFamily="monospace">×</text>
          </g>
        </g>
      )}

      <circle cx={NODE_W / 2} cy={0} r={3} fill={c.border} />
      <circle cx={NODE_W / 2} cy={NODE_H} r={3} fill={c.border} />
    </g>
  )
}

function Edge({ from, to, animated }) {
  const x1 = from.x + NODE_W / 2
  const y1 = from.y + NODE_H
  const x2 = to.x + NODE_W / 2
  const y2 = to.y
  const cy = (y1 + y2) / 2

  return (
    <path
      d={`M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`}
      className={animated ? 'neural-line-active' : 'neural-line'}
    />
  )
}

export default function NeuralTree({ setores, canEdit, onAdd, onEdit, onDelete, selectedNodeId, onNodeSelect }) {
  const [internalSelected, setInternalSelected] = useState(null)
  const selected = selectedNodeId !== undefined ? selectedNodeId : internalSelected
  const setSelected = onNodeSelect || setInternalSelected
  const [grabbing, setGrabbing] = useState(false)

  const panMoved    = useRef(false)
  const transformRef = useRef(null)
  const wrapperRef  = useRef(null)
  const lastZoom    = useRef(0)

  // Wheel manual: normaliza o delta para sempre aplicar ZOOM_STEP fixo por tick,
  // independente da sensibilidade do mouse ou do trackpad.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()

      const now = Date.now()
      if (now - lastZoom.current < ZOOM_THROTTLE) return
      lastZoom.current = now

      if (e.deltaY < 0) {
        transformRef.current?.zoomIn(ZOOM_STEP, ZOOM_ANIM_MS)
      } else {
        transformRef.current?.zoomOut(ZOOM_STEP, ZOOM_ANIM_MS)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  if (!setores.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <div className="text-4xl opacity-20">⬡</div>
        <p className="text-sm">Nenhum setor cadastrado.</p>
      </div>
    )
  }

  const { positions, width, height, byId, childrenOf } = layout(setores)

  const edges = setores
    .filter(n => n.parent_id && positions[n.parent_id] && positions[n.id])
    .map(n => ({
      from: positions[n.parent_id],
      to: positions[n.id],
      animated: selected === n.id || selected === n.parent_id,
    }))

  return (
    <div ref={wrapperRef} className={`w-full h-full ${grabbing ? 'cursor-grabbing' : 'cursor-grab'}`}>
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        wheel={{ disabled: true }}
        doubleClick={{ disabled: true }}
        onPanningStart={() => {
          panMoved.current = false
          setGrabbing(true)
        }}
        onPanning={() => {
          panMoved.current = true
        }}
        onPanningStop={() => {
          setGrabbing(false)
          requestAnimationFrame(() => { panMoved.current = false })
        }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ display: 'block' }}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
            onClick={() => { if (!panMoved.current) setSelected(null) }}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2a6099" strokeWidth="0.3" opacity="0.2" />
              </pattern>
            </defs>
            <rect width={width} height={height} fill="url(#grid)" />

            {edges.map((e, i) => (
              <Edge key={i} from={e.from} to={e.to} animated={e.animated} />
            ))}

            {setores.map(n => positions[n.id] && (
              <NodeBox
                key={n.id}
                node={n}
                pos={positions[n.id]}
                selected={selected === n.id}
                hasChildren={!!(childrenOf[n.id]?.length)}
                onSelect={setSelected}
                onAdd={onAdd}
                onEdit={onEdit}
                canEdit={canEdit}
                panMoved={panMoved}
                onDelete={(node, hasKids) => {
                  if (hasKids) return
                  onDelete(node)
                }}
              />
            ))}
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
