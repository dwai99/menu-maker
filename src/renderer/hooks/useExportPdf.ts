import { useEffect } from 'react';
import { useLayoutStore } from '@/stores/layout-store';
import { PAGE_SIZES } from '@/models/layout';
import type { PrintMarks } from '@/models/layout';

const DPI = 96

/**
 * Create an SVG overlay element with crop marks and registration marks.
 * Uses safe DOM APIs (no innerHTML) to build the SVG.
 */
function createCropMarkOverlay(
  pageWidthIn: number,
  pageHeightIn: number,
  printMarks: PrintMarks,
): HTMLElement {
  const bleedIn = printMarks.bleed
  const markLenIn = 0.25
  const gapIn = 0.0625

  const totalW = (pageWidthIn + bleedIn * 2) * DPI
  const totalH = (pageHeightIn + bleedIn * 2) * DPI
  const bleedPx = bleedIn * DPI
  const pageW = pageWidthIn * DPI
  const pageH = pageHeightIn * DPI

  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', String(totalW))
  svg.setAttribute('height', String(totalH))
  svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`)

  function addLine(x1: number, y1: number, x2: number, y2: number) {
    const line = document.createElementNS(svgNS, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', 'black')
    line.setAttribute('stroke-width', '0.5')
    svg.appendChild(line)
  }

  if (printMarks.showCropMarks) {
    const corners = [
      { x: bleedPx, y: bleedPx, dx: -1, dy: -1 },
      { x: bleedPx + pageW, y: bleedPx, dx: 1, dy: -1 },
      { x: bleedPx, y: bleedPx + pageH, dx: -1, dy: 1 },
      { x: bleedPx + pageW, y: bleedPx + pageH, dx: 1, dy: 1 },
    ]
    for (const { x, y, dx, dy } of corners) {
      addLine(x + dx * gapIn * DPI, y, x + dx * (gapIn + markLenIn) * DPI, y)
      addLine(x, y + dy * gapIn * DPI, x, y + dy * (gapIn + markLenIn) * DPI)
    }
  }

  if (printMarks.showRegistrationMarks) {
    const crossIn = 0.125
    const circleIn = 0.0625
    const midpoints = [
      { x: bleedPx + pageW / 2, y: bleedPx / 2 },
      { x: bleedPx + pageW / 2, y: bleedPx + pageH + bleedPx / 2 },
      { x: bleedPx / 2, y: bleedPx + pageH / 2 },
      { x: bleedPx + pageW + bleedPx / 2, y: bleedPx + pageH / 2 },
    ]
    for (const { x, y } of midpoints) {
      const cs = crossIn * DPI
      const cr = circleIn * DPI
      addLine(x - cs, y, x + cs, y)
      addLine(x, y - cs, x, y + cs)
      const circle = document.createElementNS(svgNS, 'circle')
      circle.setAttribute('cx', String(x))
      circle.setAttribute('cy', String(y))
      circle.setAttribute('r', String(cr))
      circle.setAttribute('fill', 'none')
      circle.setAttribute('stroke', 'black')
      circle.setAttribute('stroke-width', '0.5')
      svg.appendChild(circle)
    }
  }

  const overlay = document.createElement('div')
  overlay.id = 'pdf-crop-marks'
  overlay.style.cssText = `position:fixed;top:0;left:0;width:${totalW}px;height:${totalH}px;pointer-events:none;z-index:99999;`
  overlay.appendChild(svg)
  return overlay
}

export const useExportPdf = () => {
  const { pageLayout } = useLayoutStore();

  const exportPdf = async () => {
    if (!window.electronAPI) return
    try {
      const pageSize = PAGE_SIZES[pageLayout.pageSize];

      if (!pageSize) {
        alert('Invalid page size selected');
        return;
      }

      let pageWidth = pageSize.width;
      let pageHeight = pageSize.height;

      if (pageLayout.orientation === 'landscape') {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      }

      const pm = pageLayout.printMarks
      const hasPrintMarks = pm && (pm.showCropMarks || pm.showRegistrationMarks)

      // Expand page dimensions for bleed if print marks are enabled
      let exportWidth = pageWidth
      let exportHeight = pageHeight
      let overlay: HTMLElement | null = null

      if (hasPrintMarks) {
        exportWidth = pageWidth + pm.bleed * 2
        exportHeight = pageHeight + pm.bleed * 2

        // Inject crop mark overlay into DOM
        overlay = createCropMarkOverlay(pageWidth, pageHeight, pm)
        document.body.appendChild(overlay)
      }

      // Inject print styles for multi-page support
      const styleEl = document.createElement('style');
      styleEl.id = 'pdf-export-styles';
      styleEl.textContent = `
        @media print {
          .print-page {
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        }
      `;
      document.head.appendChild(styleEl);

      try {
        // Call Electron API to export PDF with potentially expanded dimensions
        const result = await window.electronAPI.exportPdf({
          pageWidth: exportWidth,
          pageHeight: exportHeight,
        });

        if (result.success && result.filePath) {
          alert(`PDF exported to ${result.filePath}`);
        } else {
          alert(`Failed to export PDF: ${result.error || 'Unknown error'}`);
        }
      } finally {
        // Clean up injected elements even if export fails
        styleEl.remove();
        overlay?.remove();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to export PDF: ${errorMessage}`);
    }
  };

  // Register menu command listener for Cmd+E
  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onMenuExportPdf(() => {
      exportPdf();
    });

    return cleanup;
  }, [pageLayout.pageSize, pageLayout.orientation]);

  return { exportPdf };
};
