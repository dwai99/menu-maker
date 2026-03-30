import React, { useCallback } from 'react'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import type { Vertex } from '@/models/layout'
import type { BoundingBox } from '@/layout/polygon'
import { rectToPolygon } from '@/layout/polygon'

interface PolygonEditorProps {
  fragmentId: string
  polygon: Vertex[]
  contentWidthPx: number
  contentHeightPx: number
  zoom: number
  bbox: BoundingBox
  /** Column grid widths as percentages (e.g. [0, 50, 100] for 2 columns) */
  columnGridLines?: number[]
  /** Called when resize is complete — triggers auto-split/absorb */
  onResizeEnd?: () => void
}

/**
 * Rectangular resize handles for section editing.
 * Constrains to right angles and snaps to column grid boundaries.
 */
export const PolygonEditor: React.FC<PolygonEditorProps> = ({
  fragmentId,
  polygon,
  contentWidthPx,
  contentHeightPx,
  zoom,
  bbox,
  columnGridLines,
  onResizeEnd,
}) => {
  const setFragmentLayout = useLayoutStore((s) => s.setFragmentLayout)
  const markDirty = useUIStore((s) => s.markDirty)

  // Snap a percentage x value to the nearest column grid line
  const snapToGrid = useCallback(
    (xPct: number): number => {
      if (!columnGridLines || columnGridLines.length === 0) return xPct
      let closest = xPct
      let minDist = Infinity
      for (const line of columnGridLines) {
        const dist = Math.abs(xPct - line)
        if (dist < minDist) {
          minDist = dist
          closest = line
        }
      }
      // Only snap if within 3% of a grid line
      return minDist < 3 ? closest : xPct
    },
    [columnGridLines]
  )

  // Handle edge resize (right, bottom, or corner)
  const handleResize = useCallback(
    (e: React.MouseEvent, edge: 'right' | 'bottom' | 'corner') => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startY = e.clientY
      const startBbox = { ...bbox }
      let didMove = false

      const handleMouseMove = (moveE: MouseEvent) => {
        didMove = true
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const dy = ((moveE.clientY - startY) / (contentHeightPx * zoom)) * 100

        let newWidth = startBbox.width
        let newHeight = startBbox.height

        if (edge === 'right' || edge === 'corner') {
          const rawWidth = startBbox.width + dx
          const rightEdge = snapToGrid(startBbox.x + rawWidth)
          newWidth = Math.max(10, rightEdge - startBbox.x)
        }
        if (edge === 'bottom' || edge === 'corner') {
          newHeight = Math.max(5, startBbox.height + dy)
        }

        const newPolygon = rectToPolygon(startBbox.x, startBbox.y, newWidth, newHeight)
        setFragmentLayout(fragmentId, { polygon: newPolygon })
        markDirty()
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        if (didMove) {
          onResizeEnd?.()
        }
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [bbox, fragmentId, contentWidthPx, contentHeightPx, zoom, snapToGrid, setFragmentLayout, markDirty, onResizeEnd]
  )

  // Handle left-edge resize (move x, adjust width)
  const handleResizeLeft = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startBbox = { ...bbox }
      let didMove = false

      const handleMouseMove = (moveE: MouseEvent) => {
        didMove = true
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const rawX = startBbox.x + dx
        const newX = snapToGrid(rawX)
        const newWidth = Math.max(10, startBbox.x + startBbox.width - newX)

        const newPolygon = rectToPolygon(newX, startBbox.y, newWidth, startBbox.height)
        setFragmentLayout(fragmentId, { polygon: newPolygon })
        markDirty()
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        if (didMove) {
          onResizeEnd?.()
        }
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [bbox, fragmentId, contentWidthPx, zoom, snapToGrid, setFragmentLayout, markDirty, onResizeEnd]
  )

  // Handle top-edge resize (move y, adjust height — bottom stays fixed)
  const handleResizeTop = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startY = e.clientY
      const startBbox = { ...bbox }
      const bottomEdge = startBbox.y + startBbox.height
      let didMove = false

      const handleMouseMove = (moveE: MouseEvent) => {
        didMove = true
        const dy = ((moveE.clientY - startY) / (contentHeightPx * zoom)) * 100
        const newY = startBbox.y + dy
        const newHeight = bottomEdge - newY
        const clampedHeight = Math.max(5, newHeight)
        const clampedY = bottomEdge - clampedHeight

        const newPolygon = rectToPolygon(startBbox.x, clampedY, startBbox.width, clampedHeight)
        setFragmentLayout(fragmentId, { polygon: newPolygon })
        markDirty()
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        if (didMove) {
          onResizeEnd?.()
        }
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [bbox, fragmentId, contentHeightPx, zoom, setFragmentLayout, markDirty, onResizeEnd]
  )

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: '#3b82f6',
    pointerEvents: 'all',
  }

  return (
    <>
      {/* Top edge handle */}
      <div
        style={{
          ...handleStyle,
          top: '-3px',
          left: '20%',
          width: '60%',
          height: '6px',
          cursor: 'ns-resize',
          borderRadius: '3px',
        }}
        onMouseDown={handleResizeTop}
      />

      {/* Right edge handle */}
      <div
        style={{
          ...handleStyle,
          top: '20%',
          right: '-3px',
          width: '6px',
          height: '60%',
          cursor: 'ew-resize',
          borderRadius: '3px',
        }}
        onMouseDown={(e) => handleResize(e, 'right')}
      />

      {/* Bottom edge handle */}
      <div
        style={{
          ...handleStyle,
          bottom: '-3px',
          left: '20%',
          width: '60%',
          height: '6px',
          cursor: 'ns-resize',
          borderRadius: '3px',
        }}
        onMouseDown={(e) => handleResize(e, 'bottom')}
      />

      {/* Left edge handle */}
      <div
        style={{
          ...handleStyle,
          top: '20%',
          left: '-3px',
          width: '6px',
          height: '60%',
          cursor: 'ew-resize',
          borderRadius: '3px',
        }}
        onMouseDown={handleResizeLeft}
      />

      {/* Corner handle (bottom-right) */}
      <div
        style={{
          ...handleStyle,
          bottom: '-4px',
          right: '-4px',
          width: '8px',
          height: '8px',
          cursor: 'nwse-resize',
          borderRadius: '2px',
        }}
        onMouseDown={(e) => handleResize(e, 'corner')}
      />
    </>
  )
}
