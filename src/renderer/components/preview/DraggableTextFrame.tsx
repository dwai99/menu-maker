import React, { useCallback, useState, useRef, useEffect } from 'react'
import type { TextFrame } from '@/models/menu'

interface DraggableTextFrameProps {
  frame: TextFrame
  isSelected: boolean
  contentWidthPx: number
  contentHeightPx: number
  zoom: number
  onSelect: (frameId: string) => void
  onUpdate: (frameId: string, updates: Partial<TextFrame>) => void
  onUpdateContent: (frameId: string, content: string) => void
}

export function DraggableTextFrame({
  frame,
  isSelected,
  contentWidthPx,
  contentHeightPx,
  zoom,
  onSelect,
  onUpdate,
  onUpdateContent,
}: DraggableTextFrameProps) {
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Local drag/resize state — avoids store writes on every mousemove
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null)
  const [resizeState, setResizeState] = useState<{ w: number; h: number; x: number; y: number } | null>(null)

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // Exit edit mode when deselected
  useEffect(() => {
    if (!isSelected) setIsEditing(false)
  }, [isSelected])

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return
      e.preventDefault()
      e.stopPropagation()
      onSelect(frame.id)

      const startX = e.clientX
      const startY = e.clientY

      const handleMouseMove = (moveE: MouseEvent) => {
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const dy = ((moveE.clientY - startY) / (contentHeightPx * zoom)) * 100
        setDragOffset({ dx, dy })
      }

      const handleMouseUp = (moveE: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const dy = ((moveE.clientY - startY) / (contentHeightPx * zoom)) * 100
        setDragOffset(null)
        onUpdate(frame.id, {
          x: frame.x + dx,
          y: frame.y + dy,
        })
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [frame.id, frame.x, frame.y, contentWidthPx, contentHeightPx, zoom, onSelect, onUpdate, isEditing]
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
      e.preventDefault()
      e.stopPropagation()

      const isLeft = corner.includes('w')
      const isTop = corner.includes('n')
      const startX = e.clientX
      const startY = e.clientY
      const startW = frame.width
      const startH = frame.height
      const startFrameX = frame.x
      const startFrameY = frame.y

      const onMove = (moveE: MouseEvent) => {
        const dxPx = (moveE.clientX - startX) / zoom
        const dyPx = (moveE.clientY - startY) / zoom
        let newW = isLeft ? Math.max(40, startW - dxPx) : Math.max(40, startW + dxPx)
        let newH = isTop ? Math.max(24, startH - dyPx) : Math.max(24, startH + dyPx)

        let newFrameX = startFrameX
        let newFrameY = startFrameY
        if (isLeft) {
          newFrameX = startFrameX - ((newW - startW) / contentWidthPx) * 50
        }
        if (isTop) {
          newFrameY = startFrameY - ((newH - startH) / contentHeightPx) * 100
        }

        setResizeState({ w: Math.round(newW), h: Math.round(newH), x: newFrameX, y: newFrameY })
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        setResizeState((prev) => {
          if (prev) {
            onUpdate(frame.id, { width: prev.w, height: prev.h, x: prev.x, y: prev.y })
          }
          return null
        })
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [frame.id, frame.width, frame.height, frame.x, frame.y, contentWidthPx, contentHeightPx, zoom, onUpdate]
  )

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateContent(frame.id, e.target.value)
  }, [frame.id, onUpdateContent])

  const { style } = frame
  const PT_TO_PX = 96 / 72

  // Compute visual position: use local drag/resize state when active, otherwise frame data
  const visualX = dragOffset ? frame.x + dragOffset.dx : resizeState ? resizeState.x : frame.x
  const visualY = dragOffset ? frame.y + dragOffset.dy : resizeState ? resizeState.y : frame.y
  const visualW = resizeState ? resizeState.w : frame.width
  const visualH = resizeState ? resizeState.h : frame.height

  return (
    <div
      style={{
        position: 'absolute',
        left: `${visualX}%`,
        top: `${visualY}%`,
        transform: 'translate(-50%, 0)',
        width: `${visualW}px`,
        height: `${visualH}px`,
        opacity: frame.opacity / 100,
        pointerEvents: 'auto',
      }}
    >
      {/* Text content area */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: style.backgroundColor,
          border: style.borderWidth > 0
            ? `${style.borderWidth}px solid ${style.borderColor}`
            : isSelected ? undefined : 'none',
          borderRadius: `${style.borderRadius}px`,
          padding: `${style.padding}px`,
          fontFamily: style.fontFamily,
          fontSize: `${style.fontSize * PT_TO_PX}px`,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          color: style.color,
          textAlign: style.textAlign,
          lineHeight: style.lineHeight,
          overflow: 'hidden',
          cursor: isEditing ? 'text' : 'grab',
          outline: isSelected ? '2px dashed #3b82f6' : 'none',
          outlineOffset: '2px',
          boxSizing: 'border-box',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
        onMouseDown={handleDragStart}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(frame.id)
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={frame.content}
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder="Type here..."
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              fontStyle: 'inherit',
              color: 'inherit',
              textAlign: style.textAlign,
              lineHeight: 'inherit',
              padding: 0,
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflow: 'hidden',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          frame.content || (
            <span style={{ opacity: 0.4, fontStyle: 'italic' }}>
              Double-click to edit
            </span>
          )
        )}
      </div>

      {/* Corner resize handles — editor only */}
      {isSelected && !isEditing && (['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
        const isLeft = corner.includes('w')
        const isTopCorner = corner.includes('n')
        return (
          <div
            key={corner}
            data-editor-only
            style={{
              position: 'absolute',
              width: '8px',
              height: '8px',
              backgroundColor: '#3b82f6',
              border: '1px solid white',
              borderRadius: '50%',
              cursor: `${corner}-resize`,
              ...(isLeft ? { left: '-4px' } : { right: '-4px' }),
              ...(isTopCorner ? { top: '-4px' } : { bottom: '-4px' }),
              zIndex: 30,
            }}
            onMouseDown={(e) => handleResizeStart(e, corner)}
          />
        )
      })}
    </div>
  )
}
