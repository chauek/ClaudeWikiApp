import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum
} from 'd3-force'
import type { GraphData, GraphNode, GraphEdge } from '../../../shared/types'
import { useT } from '../i18n'

interface GraphViewProps {
  knowledgePath: string
  onNavigateToNode?: (nodePath: string) => void
}

interface SimNode extends SimulationNodeDatum, GraphNode {}

interface SimLink extends SimulationLinkDatum<SimNode> {
  reason: string
}

const MIN_ZOOM = 0.15
const MAX_ZOOM = 4

export function GraphView({ knowledgePath, onNavigateToNode }: GraphViewProps): JSX.Element {
  const t = useT()
  const svgRef = useRef<SVGSVGElement>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [simNodes, setSimNodes] = useState<SimNode[]>([])
  const [simLinks, setSimLinks] = useState<SimLink[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [rebuilding, setRebuilding] = useState(false)

  // Transform state (zoom + pan)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })

  // Center (0,0) at viewport center on mount
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setTransform({ x: rect.width / 2, y: rect.height / 2, k: 1 })
    }
  }, [])
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragNodeId = useRef<string | null>(null)
  const dragNodeStart = useRef({ x: 0, y: 0 })
  const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null)

  // Load graph data
  useEffect(() => {
    window.api.readGraph(knowledgePath).then((data) => {
      if (data) setGraphData(data)
    })
  }, [knowledgePath])

  // Rebuild on graph.json file change
  useEffect(() => {
    return window.api.onWatcherChange((change) => {
      if (change.filePath.endsWith('graph.json')) {
        window.api.readGraph(knowledgePath).then((data) => {
          if (data) setGraphData(data)
        })
      }
    })
  }, [knowledgePath])

  // Connection count per node (for sizing)
  const connectionCount = useMemo(() => {
    const map: Record<string, number> = {}
    if (!graphData) return map
    for (const edge of graphData.edges) {
      map[edge.source] = (map[edge.source] || 0) + 1
      map[edge.target] = (map[edge.target] || 0) + 1
    }
    return map
  }, [graphData])

  // Build simulation when graphData changes
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) return

    const nodes: SimNode[] = graphData.nodes.map((n) => ({ ...n }))
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    const links: SimLink[] = graphData.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        reason: e.reason
      }))

    const sim = forceSimulation<SimNode>(nodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(120)
          .strength(0.4)
      )
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide<SimNode>().radius((d) => {
        const count = connectionCount[d.id] || 0
        const depth = getNodeDepth(d.path)
        return getNodeRadius(count, depth) + 10
      }))
      .alphaDecay(0.02)

    sim.on('tick', () => {
      setSimNodes([...nodes])
      setSimLinks(
        links.map((l) => ({
          ...l,
          source: l.source as unknown as string,
          target: l.target as unknown as string
        }))
      )
    })

    simulationRef.current = sim

    return () => {
      sim.stop()
    }
  }, [graphData, connectionCount])

  // ── Zoom ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    setTransform((prev) => {
      const newK = Math.min(Math.max(prev.k * factor, MIN_ZOOM), MAX_ZOOM)
      const svg = svgRef.current
      if (!svg) return { ...prev, k: newK }
      const rect = svg.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      return {
        k: newK,
        x: mx - (mx - prev.x) * (newK / prev.k),
        y: my - (my - prev.y) * (newK / prev.k)
      }
    })
  }, [])

  // ── Pan (background drag) ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      // Only start pan if clicking the background
      if ((e.target as SVGElement).closest('.graph-node')) return
      dragging.current = true
      dragNodeId.current = null
      dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y }
    },
    [transform]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragNodeId.current) {
        // Dragging a node
        const sim = simulationRef.current
        if (!sim) return
        const nodes = sim.nodes()
        const node = nodes.find((n) => n.id === dragNodeId.current)
        if (!node) return
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        node.fx = (e.clientX - rect.left - transform.x) / transform.k
        node.fy = (e.clientY - rect.top - transform.y) / transform.k
        sim.alpha(0.3).restart()
        return
      }
      if (!dragging.current) return
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      }))
    },
    [transform]
  )

  const handleMouseUp = useCallback(() => {
    dragging.current = false
    if (dragNodeId.current) {
      const sim = simulationRef.current
      if (sim) {
        const node = sim.nodes().find((n) => n.id === dragNodeId.current)
        if (node) {
          node.fx = null
          node.fy = null
        }
      }
      dragNodeId.current = null
    }
  }, [])

  // ── Node drag ──
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      dragNodeId.current = nodeId
      const sim = simulationRef.current
      if (!sim) return
      const node = sim.nodes().find((n) => n.id === nodeId)
      if (node) {
        dragNodeStart.current = { x: node.x || 0, y: node.y || 0 }
        node.fx = node.x
        node.fy = node.y
      }
    },
    []
  )

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode((prev) => (prev === nodeId ? null : nodeId))
    },
    []
  )

  const handleNodeDoubleClick = useCallback(
    (nodePath: string) => {
      if (onNavigateToNode) onNavigateToNode(nodePath)
    },
    [onNavigateToNode]
  )

  // ── Fit to view ──
  const fitToView = useCallback(() => {
    const svg = svgRef.current
    if (!svg || simNodes.length === 0) return
    const rect = svg.getBoundingClientRect()
    const xs = simNodes.map((n) => n.x || 0)
    const ys = simNodes.map((n) => n.y || 0)
    const minX = Math.min(...xs) - 60
    const maxX = Math.max(...xs) + 60
    const minY = Math.min(...ys) - 60
    const maxY = Math.max(...ys) + 60
    const graphW = maxX - minX || 1
    const graphH = maxY - minY || 1
    const k = Math.min(rect.width / graphW, rect.height / graphH, 2) * 0.85
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    setTransform({
      k,
      x: rect.width / 2 - cx * k,
      y: rect.height / 2 - cy * k
    })
  }, [simNodes])

  const handleRebuildGraph = useCallback(async () => {
    setRebuilding(true)
    try {
      const data = await window.api.rebuildGraph(knowledgePath)
      if (data) setGraphData(data)
    } finally {
      setRebuilding(false)
    }
  }, [knowledgePath])

  // Auto-fit on first render with nodes
  const didAutoFit = useRef(false)
  useEffect(() => {
    if (simNodes.length > 0 && !didAutoFit.current) {
      const timer = setTimeout(() => {
        fitToView()
        didAutoFit.current = true
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [simNodes, fitToView])

  // ── Helpers ──
  const connectedToHovered = useMemo(() => {
    if (!hoveredNode || !graphData) return new Set<string>()
    const set = new Set<string>()
    for (const e of graphData.edges) {
      if (e.source === hoveredNode) set.add(e.target)
      if (e.target === hoveredNode) set.add(e.source)
    }
    return set
  }, [hoveredNode, graphData])

  const selectedNodeData = useMemo(() => {
    if (!selectedNode || !graphData) return null
    const node = graphData.nodes.find((n) => n.id === selectedNode)
    if (!node) return null
    const connections = graphData.edges.filter(
      (e) => e.source === selectedNode || e.target === selectedNode
    )
    return { node, connections }
  }, [selectedNode, graphData])

  // ── Empty state ──
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="graph-view graph-view--empty">
        <div className="graph-empty-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}>
            <circle cx="6" cy="6" r="2" />
            <circle cx="18" cy="6" r="2" />
            <circle cx="12" cy="18" r="2" />
            <line x1="7.5" y1="7.5" x2="11" y2="16" />
            <line x1="16.5" y1="7.5" x2="13" y2="16" />
            <line x1="8" y1="6" x2="16" y2="6" />
          </svg>
          <span>{t('graph.empty')}</span>
          <button
            className="graph-rebuild-btn"
            onClick={handleRebuildGraph}
            disabled={rebuilding}
          >
            {rebuilding ? t('graph.rebuilding') : t('graph.rebuild')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="graph-view">
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="graph-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid background */}
        <defs>
          <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            <circle cx="20" cy="20" r="0.8" fill="var(--surface-3)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#graph-grid)" />

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Edges */}
          {simLinks.map((link, i) => {
            const sourceNode = simNodes.find((n) => n.id === (typeof link.source === 'string' ? link.source : (link.source as SimNode).id))
            const targetNode = simNodes.find((n) => n.id === (typeof link.target === 'string' ? link.target : (link.target as SimNode).id))
            if (!sourceNode || !targetNode) return null
            const isHighlighted =
              hoveredNode === sourceNode.id ||
              hoveredNode === targetNode.id
            const dimmed = hoveredNode && !isHighlighted
            return (
              <line
                key={`edge-${i}`}
                x1={sourceNode.x || 0}
                y1={sourceNode.y || 0}
                x2={targetNode.x || 0}
                y2={targetNode.y || 0}
                className={`graph-edge${isHighlighted ? ' graph-edge--highlighted' : ''}${dimmed ? ' graph-edge--dimmed' : ''}`}
              />
            )
          })}

          {/* Nodes */}
          {simNodes.map((node) => {
            const count = connectionCount[node.id] || 0
            const depth = getNodeDepth(node.path)
            const radius = getNodeRadius(count, depth)
            const depthClass = depth < 3 ? ` graph-node-circle--depth-${depth}` : ''
            const isHovered = hoveredNode === node.id
            const isConnected = connectedToHovered.has(node.id)
            const isSelected = selectedNode === node.id
            const dimmed = hoveredNode && !isHovered && !isConnected
            return (
              <g
                key={node.id}
                className="graph-node"
                transform={`translate(${node.x || 0},${node.y || 0})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={() => handleNodeClick(node.id)}
                onDoubleClick={() => handleNodeDoubleClick(node.path)}
              >
                {/* Glow for hovered/selected */}
                {(isHovered || isSelected) && (
                  <circle
                    r={radius + 8}
                    className="graph-node-glow"
                  />
                )}
                {/* Node circle */}
                <circle
                  r={radius}
                  className={`graph-node-circle${depthClass}${isHovered ? ' graph-node-circle--hovered' : ''}${isSelected ? ' graph-node-circle--selected' : ''}${dimmed ? ' graph-node-circle--dimmed' : ''}${node.hasOpenTodos ? ' graph-node-circle--has-todos' : ''}`}
                />
                {/* Label */}
                <text
                  y={radius + 16}
                  className={`graph-node-label${dimmed ? ' graph-node-label--dimmed' : ''}`}
                >
                  {node.title}
                </text>
                {/* Todo count badge */}
                {node.openTodosCount > 0 && (
                  <g transform={`translate(${radius * 0.6},${-radius * 0.6})`}>
                    <circle r={8} className="graph-node-todo-badge" />
                    <text
                      dy="0.35em"
                      className="graph-node-todo-count"
                    >
                      {node.openTodosCount > 9 ? '9+' : node.openTodosCount}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Info overlay (top-left) */}
      <div className="graph-overlay graph-overlay--stats">
        <h3 className="graph-overlay-title">{t('graph.overview')}</h3>
        <div className="graph-stat-row">
          <span className="graph-stat-label">{t('graph.totalNodes')}</span>
          <span className="graph-stat-value">{graphData.nodes.length}</span>
        </div>
        <div className="graph-stat-row">
          <span className="graph-stat-label">{t('graph.connections')}</span>
          <span className="graph-stat-value">{graphData.edges.length}</span>
        </div>
        <div className="graph-legend">
          <div className="graph-legend-item">
            <span className="graph-legend-dot graph-legend-dot--accent" />
            <span>{t('graph.highConnections')}</span>
          </div>
          <div className="graph-legend-item">
            <span className="graph-legend-dot graph-legend-dot--todo" />
            <span>{t('graph.hasOpenTodos')}</span>
          </div>
        </div>
      </div>

      {/* Controls (bottom-right) */}
      <div className="graph-controls">
        <button className="graph-control-btn" onClick={() => setTransform((p) => ({ ...p, k: Math.min(p.k * 1.3, MAX_ZOOM) }))} title="Zoom in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <button className="graph-control-btn" onClick={() => setTransform((p) => ({ ...p, k: Math.max(p.k * 0.7, MIN_ZOOM) }))} title="Zoom out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <button className="graph-control-btn" onClick={fitToView} title={t('graph.fitView')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>

      {/* Selected node detail panel */}
      {selectedNodeData && (
        <div className="graph-overlay graph-overlay--detail">
          <h3 className="graph-detail-title">{selectedNodeData.node.title}</h3>
          <div className="graph-detail-path">{selectedNodeData.node.path}</div>
          {selectedNodeData.node.tags.length > 0 && (
            <div className="graph-detail-tags">
              {selectedNodeData.node.tags.map((tag) => (
                <span key={tag} className="graph-detail-tag">#{tag}</span>
              ))}
            </div>
          )}
          {selectedNodeData.connections.length > 0 && (
            <div className="graph-detail-connections">
              <span className="graph-detail-connections-title">{t('graph.connections')}</span>
              {selectedNodeData.connections.map((c, i) => (
                <div key={i} className="graph-detail-connection">
                  <span className="graph-detail-connection-dot" />
                  <span>{c.reason}</span>
                </div>
              ))}
            </div>
          )}
          <button
            className="graph-detail-open-btn"
            onClick={() => onNavigateToNode?.(selectedNodeData.node.path)}
          >
            {t('graph.openNode')}
          </button>
        </div>
      )}
    </div>
  )
}

function getNodeDepth(path: string): number {
  const parts = path.split('/').filter(Boolean)
  return Math.max(0, parts.length - 2)
}

function getNodeRadius(connectionCount: number, depth: number = 0): number {
  const depthBase = depth === 0 ? 30 : depth === 1 ? 24 : depth === 2 ? 20 : 16
  const bonus = connectionCount >= 5 ? 4 : connectionCount >= 2 ? 2 : 0
  return depthBase + bonus
}
