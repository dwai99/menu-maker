import React, { useCallback, useState } from 'react'
import type { PageImage } from '@/models/menu'

interface DraggableImageProps {
  image: PageImage
  isSelected: boolean
  contentWidthPx: number
  contentHeightPx: number
  zoom: number
  onSelect: (imageId: string) => void
  onUpdate: (imageId: string, updates: Partial<PageImage>) => void
}

export function DraggableImage({
  image,
  isSelected,
  contentWidthPx,
  contentHeightPx,
  zoom,
  onSelect,
  onUpdate,
}: DraggableImageProps) {
  // Local drag/resize state — avoids store writes on every mousemove
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null)
  const [resizeState, setResizeState] = useState<{ w: number; h: number; x: number; y: number } | null>(null)

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onSelect(image.id)

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
        onUpdate(image.id, {
          x: image.x + dx,
          y: image.y + dy,
        })
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [image.id, image.x, image.y, contentWidthPx, contentHeightPx, zoom, onSelect, onUpdate]
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
      e.preventDefault()
      e.stopPropagation()

      const isLeft = corner.includes('w')
      const isTop = corner.includes('n')
      const startX = e.clientX
      const startY = e.clientY
      const startW = image.width
      const startH = image.height
      const startImgX = image.x
      const startImgY = image.y
      const aspectRatio = startH / startW

      const onMove = (moveE: MouseEvent) => {
        const dxPx = (moveE.clientX - startX) / zoom
        const dyPx = (moveE.clientY - startY) / zoom
        let newW = isLeft ? Math.max(20, startW - dxPx) : Math.max(20, startW + dxPx)
        let newH: number

        if (moveE.shiftKey) {
          newH = newW * aspectRatio
        } else {
          newH = isTop ? Math.max(20, startH - dyPx) : Math.max(20, startH + dyPx)
        }

        let newImgX = startImgX
        let newImgY = startImgY
        if (isLeft) {
          newImgX = startImgX - ((newW - startW) / contentWidthPx) * 50
        }
        if (isTop) {
          newImgY = startImgY - ((newH - startH) / contentHeightPx) * 100
        }

        setResizeState({ w: Math.round(newW), h: Math.round(newH), x: newImgX, y: newImgY })
      }

      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        setResizeState((prev) => {
          if (prev) {
            onUpdate(image.id, { width: prev.w, height: prev.h, x: prev.x, y: prev.y })
          }
          return null
        })
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [image.id, image.width, image.height, image.x, image.y, contentWidthPx, contentHeightPx, zoom, onUpdate]
  )

  // Use local state during drag/resize for smooth visuals, frame data otherwise
  const visualX = dragOffset ? image.x + dragOffset.dx : resizeState ? resizeState.x : image.x
  const visualY = dragOffset ? image.y + dragOffset.dy : resizeState ? resizeState.y : image.y
  const visualW = resizeState ? resizeState.w : image.width
  const visualH = resizeState ? resizeState.h : image.height

  return (
    <div
      style={{
        position: 'absolute',
        left: `${visualX}%`,
        top: `${visualY}%`,
        transform: 'translate(-50%, 0)',
        width: `${visualW}px`,
        height: `${visualH}px`,
        opacity: image.opacity / 100,
        pointerEvents: 'auto',
      }}
    >
      <img
        src={image.dataUrl}
        alt={image.label || 'Page image'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          cursor: 'grab',
          outline: isSelected ? '2px dashed #3b82f6' : 'none',
          outlineOffset: '2px',
        }}
        data-editor-only={isSelected ? '' : undefined}
        onMouseDown={handleDragStart}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(image.id)
        }}
        draggable={false}
      />
      {/* Corner resize handles — editor only */}
      {isSelected && (['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
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
