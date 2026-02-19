import React from 'react'

interface TemplatePreviewSwatchProps {
  colorScheme: { background: string; text: string; accent: string; border: string }
  typography: { menuTitle: { fontFamily: string; fontSize: number; color: string } }
  title?: string
}

export function TemplatePreviewSwatch({
  colorScheme,
  typography,
  title,
}: TemplatePreviewSwatchProps) {
  const scaledFontSize = Math.min(
    Math.round(typography.menuTitle.fontSize * 0.55),
    24
  )

  return (
    <div
      style={{
        height: '7rem',
        backgroundColor: colorScheme.background,
        borderRadius: '6px 6px 0 0',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '0 12px 12px',
        boxSizing: 'border-box',
      }}
    >
      {/* Accent bar at the top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: colorScheme.accent,
        }}
      />

      {/* Title text */}
      <div
        style={{
          fontFamily: typography.menuTitle.fontFamily,
          fontSize: `${scaledFontSize}px`,
          color: typography.menuTitle.color,
          fontWeight: 700,
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: '8px',
          lineHeight: 1.2,
        }}
        title={title}
      >
        {title || 'Menu'}
      </div>

      {/* Faded text-line bars */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          width: '100%',
        }}
      >
        {([40, 60, 50] as const).map((widthPct, index) => (
          <div
            key={index}
            style={{
              width: `${widthPct}%`,
              height: '4px',
              backgroundColor: colorScheme.text,
              opacity: 0.18,
              borderRadius: '2px',
            }}
          />
        ))}
      </div>

      {/* Color dots at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          display: 'flex',
          gap: '5px',
          alignItems: 'center',
        }}
      >
        {[
          { color: colorScheme.background, label: 'Background' },
          { color: colorScheme.text, label: 'Text' },
          { color: colorScheme.accent, label: 'Accent' },
          { color: colorScheme.border, label: 'Border' },
        ].map(({ color, label }) => (
          <div
            key={label}
            title={label}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: color,
              border: '1px solid rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}
