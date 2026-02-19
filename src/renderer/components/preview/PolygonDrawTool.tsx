import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Vertex } from '@/models/layout'

interface PolygonDrawToolProps {
    /** Canvas width in pixels */
    width: number
    /** Canvas height in pixels */
    height: number
    /** Called when drawing is complete with vertices in % coordinates (0-100) */
    onComplete: (vertices: Vertex[]) => void
    /** Called when user cancels drawing */
    onCancel: () => void
    /** Whether snap-to-grid is enabled */
    snapToGrid?: boolean
    /** Grid size in percentage units */
    gridSize?: number
}

/**
 * An SVG-based polygon drawing tool overlay.
 * Users click to place vertices, double-click or press Enter to close the shape.
 * Press Escape to cancel. Backspace removes the last point.
 */
export const PolygonDrawTool: React.FC<PolygonDrawToolProps> = ({
    width,
    height,
    onComplete,
    onCancel,
    snapToGrid = true,
    gridSize = 5,
}) => {
    const [vertices, setVertices] = useState<Vertex[]>([])
    const [cursorPos, setCursorPos] = useState<Vertex | null>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    // Convert pixel coordinates to percentage
    const toPercent = useCallback((px: number, py: number): Vertex => {
        let x = width > 0 ? (px / width) * 100 : 0
        let y = height > 0 ? (py / height) * 100 : 0

        if (snapToGrid) {
            x = Math.round(x / gridSize) * gridSize
            y = Math.round(y / gridSize) * gridSize
        }

        return [
            Math.max(0, Math.min(100, x)),
            Math.max(0, Math.min(100, y)),
        ]
    }, [width, height, snapToGrid, gridSize])

    // Convert percentage to pixel for rendering
    const toPx = useCallback((v: Vertex): { x: number; y: number } => ({
        x: (v[0] / 100) * width,
        y: (v[1] / 100) * height,
    }), [width, height])

    const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        const rect = svgRef.current?.getBoundingClientRect()
        if (!rect) return

        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const vertex = toPercent(px, py)

        setVertices(prev => [...prev, vertex])
    }, [toPercent])

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (vertices.length >= 3) {
            onComplete(vertices)
        }
    }, [vertices, onComplete])

    const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        const rect = svgRef.current?.getBoundingClientRect()
        if (!rect) return

        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        setCursorPos(toPercent(px, py))
    }, [toPercent])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel()
            } else if (e.key === 'Enter' && vertices.length >= 3) {
                onComplete(vertices)
            } else if (e.key === 'Backspace' && vertices.length > 0) {
                setVertices(prev => prev.slice(0, -1))
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [vertices, onComplete, onCancel])

    // Build polygon points string
    const pointsStr = vertices.map(v => {
        const { x, y } = toPx(v)
        return `${x},${y}`
    }).join(' ')

    // Preview line from last vertex to cursor
    const lastVertex = vertices.length > 0 ? toPx(vertices[vertices.length - 1]) : null
    const cursorPx = cursorPos ? toPx(cursorPos) : null

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            className="absolute inset-0 cursor-crosshair"
            style={{ zIndex: 1000 }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseMove={handleMouseMove}
        >
            {/* Grid overlay */}
            {snapToGrid && (
                <g className="opacity-10">
                    {Array.from({ length: Math.floor(100 / gridSize) + 1 }, (_, i) => {
                        const pos = (i * gridSize / 100) * width
                        return (
                            <line key={`vg-${i}`} x1={pos} y1={0} x2={pos} y2={height} stroke="#666" strokeWidth={0.5} />
                        )
                    })}
                    {Array.from({ length: Math.floor(100 / gridSize) + 1 }, (_, i) => {
                        const pos = (i * gridSize / 100) * height
                        return (
                            <line key={`hg-${i}`} x1={0} y1={pos} x2={width} y2={pos} stroke="#666" strokeWidth={0.5} />
                        )
                    })}
                </g>
            )}

            {/* Completed polygon edges */}
            {vertices.length >= 2 && (
                <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="6,3"
                />
            )}

            {/* Fill preview when >= 3 vertices */}
            {vertices.length >= 3 && (
                <polygon
                    points={pointsStr}
                    fill="rgba(217, 119, 6, 0.1)"
                    stroke="none"
                />
            )}

            {/* Preview line to cursor */}
            {lastVertex && cursorPx && (
                <line
                    x1={lastVertex.x}
                    y1={lastVertex.y}
                    x2={cursorPx.x}
                    y2={cursorPx.y}
                    stroke="#d97706"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                    opacity={0.6}
                />
            )}

            {/* Closing line preview (from cursor to first vertex) */}
            {vertices.length >= 2 && cursorPx && (
                <line
                    x1={cursorPx.x}
                    y1={cursorPx.y}
                    x2={toPx(vertices[0]).x}
                    y2={toPx(vertices[0]).y}
                    stroke="#d97706"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                    opacity={0.3}
                />
            )}

            {/* Vertices */}
            {vertices.map((v, i) => {
                const { x, y } = toPx(v)
                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={i === 0 ? 6 : 4}
                        fill={i === 0 ? '#d97706' : '#fbbf24'}
                        stroke="white"
                        strokeWidth={2}
                    />
                )
            })}

            {/* Cursor point */}
            {cursorPx && (
                <circle
                    cx={cursorPx.x}
                    cy={cursorPx.y}
                    r={3}
                    fill="rgba(217, 119, 6, 0.5)"
                    stroke="none"
                />
            )}

            {/* Instructions */}
            <text x={10} y={20} fontSize={12} fill="#d97706" fontWeight="bold">
                Click to place points • Double-click or Enter to finish • Esc to cancel • Backspace to undo
            </text>

            {/* Vertex count */}
            <text x={10} y={height - 10} fontSize={11} fill="#666">
                {vertices.length} point{vertices.length !== 1 ? 's' : ''} placed
                {vertices.length < 3 ? ` (need ${3 - vertices.length} more)` : ' — ready to close'}
            </text>
        </svg>
    )
}
