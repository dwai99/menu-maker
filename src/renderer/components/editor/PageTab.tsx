import React, { useCallback, useState } from 'react';
import { useLayoutStore } from '@/stores/layout-store';
import { useMenuStore } from '@/stores/menu-store';
import { useUIStore } from '@/stores/ui-store';
import { PAGE_SIZES, PageSizeId, TRI_FOLD_PANEL_LABELS, TRI_FOLD_FRONT_PANELS, TRI_FOLD_BACK_PANELS, createDefaultHeaderConfig } from '@/models/layout';
import type { ColumnCount, SectionTitleDecoration, TriFoldPanelRole, TriFoldPaperSize, TriFoldType, HeaderLayoutPreset, HeaderConfig } from '@/models/layout';
import { autoDistributeTriFold } from '@/layout/tri-fold';

import { computeAutoLayout, computeFlowLayout, computeMultiPageLayout } from '@/layout/auto-layout';
import {
  alignLeft, alignRight, alignTop, alignBottom,
  alignCenterH, alignCenterV,
  distributeH, distributeV,
  equalWidth, equalHeight,
} from '@/layout/align';

type Orientation = 'portrait' | 'landscape';
type LayoutDirection = 'vertical' | 'horizontal';
type ItemSeparator = 'none' | 'line' | 'dots' | 'dashes';
type PriceFormat = 'right-aligned' | 'inline' | 'dot-leaders';
type Currency = '$' | '\u20ac' | '\u00a3' | '\u00a5' | 'none';
type BackgroundTexture = 'none' | 'paper' | 'linen' | 'parchment' | 'chalkboard' | 'marble';
type SectionDivider = 'none' | 'line' | 'dots' | 'flourish' | 'diamond' | 'double-line';
type PageBorder = 'none' | 'thin' | 'double' | 'thick' | 'inset';
type VariantSeparator = '/' | '\u00b7' | '|' | '\u2014';
type SectionDecoration = 'none' | 'border' | 'shadow' | 'filled' | 'accent-left';

// ── Reusable AccordionSection ─────────────────────────────────────

interface AccordionSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, expanded, onToggle, children }) => (
  <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-5 py-4 bg-neutral-50 hover:bg-neutral-100 transition-colors flex items-center justify-between"
    >
      <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>
      <svg
        className={`w-5 h-5 text-neutral-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {expanded && (
      <div className="p-5 space-y-6">
        {children}
      </div>
    )}
  </div>
);

export const PageTab: React.FC = () => {
  const { pageLayout, setPageSize, setOrientation, setMargins, setColumnCount, setLayoutDirection, setItemSeparator, setPriceFormat, setSectionDecoration, setCurrency, setBackgroundTexture, setSectionDivider, setPageBorder, setSectionGap, setVariantDisplayMode, setVariantSeparator, setSectionDecorations, setSectionLayouts, clearAllSectionLayouts, addPage, removePage, renamePage, setPageColumnCount, enableMultiPageMode, disableMultiPageMode, assignSectionToPage, setSectionTitleDecoration, enableTriFold, disableTriFold, setTriFoldPaperSize, setTriFoldPanelSections, setTriFoldType, updateTriFoldConfig, setHeaderConfig, setPrintMarks, setShowDietaryLegend } =
    useLayoutStore();
  const menuData = useMenuStore((s) => s.menuData);
  const { markDirty, overflowState, selectedSectionIds, setActivePageId } = useUIStore();

  // Accordion expanded states — all default to true
  const [isLayoutExpanded, setIsLayoutExpanded] = useState(true);
  const [isPageFormatExpanded, setIsPageFormatExpanded] = useState(true);
  const [isTriFoldExpanded, setIsTriFoldExpanded] = useState(true);
  const [isAppearanceExpanded, setIsAppearanceExpanded] = useState(true);
  const [isPriceVariantsExpanded, setIsPriceVariantsExpanded] = useState(true);
  const [isPrintExpanded, setIsPrintExpanded] = useState(true);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(e.target.value as PageSizeId);
    markDirty();
  };

  const handleOrientationChange = (orientation: Orientation) => {
    setOrientation(orientation);
    markDirty();
  };

  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    const numValue = parseFloat(value) || 0;
    setMargins({
      ...pageLayout.margins,
      [side]: numValue,
    });
    markDirty();
  };

  const handleItemSeparatorChange = (separator: ItemSeparator) => {
    setItemSeparator(separator);
    markDirty();
  };

  const handlePriceFormatChange = (format: PriceFormat) => {
    setPriceFormat(format);
    markDirty();
  };

  const handleAutoLayout = useCallback(() => {
    // Check if there are existing manual splits (continuation fragments)
    const currentLayouts = useLayoutStore.getState().pageLayout.sectionLayouts || [];
    const hasSplits = currentLayouts.some((l) => (l.startItemIndex ?? 0) > 0);

    let result;
    if (pageLayout.pages) {
      result = computeMultiPageLayout({
        pages: pageLayout.pages,
        sections: menuData.sections,
        pageLayout,
        menuData,
      });
    } else if (hasSplits) {
      // Use flow layout when splits exist — treemap can't produce splits
      result = computeFlowLayout({
        sections: menuData.sections,
        pageLayout,
        menuData,
      });
    } else {
      result = computeAutoLayout({
        sections: menuData.sections,
        pageLayout,
        menuData,
      });
    }

    // Apply section layouts (polygon positioning, possibly with splits)
    setSectionLayouts(result.sectionLayouts);
    // Apply font scaling if the algorithm needed to shrink fonts
    if (result.fontScale < 1.0) {
      const layoutStore = useLayoutStore.getState();
      const t = pageLayout.typography;
      for (const role of Object.keys(t) as (keyof typeof t)[]) {
        const current = t[role];
        layoutStore.setTypography(role, {
          fontSize: Math.max(6, Math.round(current.fontSize * result.fontScale)),
        });
      }
    }
    markDirty();
  }, [menuData, pageLayout, setSectionLayouts, markDirty]);

  const handleClearLayout = useCallback(() => {
    clearAllSectionLayouts();
    markDirty();
  }, [clearAllSectionLayouts, markDirty]);

  const overflowInches = overflowState
    ? (overflowState.overflowAmount / 96).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      {/* ── Always-visible: Overflow Status + Auto Layout ── */}
      <div className="space-y-3">
        {overflowState && (
          <div
            className={`px-4 py-3 rounded-lg text-sm font-medium ${
              overflowState.isOverflowing
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            {overflowState.isOverflowing
              ? `Content overflows by ${overflowInches}" (needs ${overflowState.pageCount} pages)`
              : 'Content fits on page'}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAutoLayout}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Auto Layout
          </button>
          <button
            type="button"
            onClick={handleClearLayout}
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── 1. Layout ── */}
      <AccordionSection
        title="Layout"
        expanded={isLayoutExpanded}
        onToggle={() => setIsLayoutExpanded(!isLayoutExpanded)}
      >
        {/* Arrange — align & distribute (visible when 2+ sections selected with explicit layouts) */}
        {pageLayout.sectionLayouts.length >= 2 && (
          <ArrangeButtons
            allLayouts={pageLayout.sectionLayouts}
            selectedIds={selectedSectionIds}
            onApply={(next) => { setSectionLayouts(next); markDirty(); }}
          />
        )}

        {/* Pages Management */}
        <PagesSection
          pages={pageLayout.pages}
          onToggle={(enabled) => {
            if (enabled) {
              // Ensure all sections get assigned
              enableMultiPageMode();
              const state = useLayoutStore.getState();
              if (state.pageLayout.pages && state.pageLayout.pages.length === 1) {
                const page = state.pageLayout.pages[0];
                const allIds = menuData.sections.map((s) => s.id);
                const missing = allIds.filter((id) => !page.sectionIds.includes(id));
                for (const id of missing) {
                  assignSectionToPage(id, page.id);
                }
              }
              const updated = useLayoutStore.getState().pageLayout.pages;
              if (updated && updated.length > 0) {
                setActivePageId(updated[0].id);
              }
            } else {
              disableMultiPageMode();
              setActivePageId(null);
            }
            markDirty();
          }}
          onAddPage={() => { addPage(`Page ${(pageLayout.pages?.length ?? 0) + 1}`); markDirty(); }}
          onRemovePage={(id) => { removePage(id); markDirty(); }}
          onRenamePage={(id, name) => { renamePage(id, name); markDirty(); }}
          onSetColumnCount={(id, count) => { setPageColumnCount(id, count); markDirty(); }}
        />

        {/* Columns */}
        {!pageLayout.triFold?.enabled && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-neutral-700">
              Columns
            </label>
            <div className="flex">
              {([1, 2, 3, 4, 5, 6] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setColumnCount(n as ColumnCount); markDirty(); }}
                  className={`px-3 py-2 text-sm border ${
                    n > 1 ? 'border-l-0' : ''
                  } ${n === 1 ? 'rounded-l-lg' : ''} ${n === 6 ? 'rounded-r-lg' : ''} ${
                    pageLayout.columnCount === n
                      ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Direction */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Direction
          </label>
          <div className="flex">
            <button
              type="button"
              onClick={() => { setLayoutDirection('vertical'); markDirty(); }}
              className={`px-3 py-2 text-sm border border-r-0 rounded-l-lg ${
                pageLayout.layoutDirection !== 'horizontal'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              ↓ Vertical
            </button>
            <button
              type="button"
              onClick={() => { setLayoutDirection('horizontal'); markDirty(); }}
              className={`px-3 py-2 text-sm border rounded-r-lg ${
                pageLayout.layoutDirection === 'horizontal'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              → Horizontal
            </button>
          </div>
        </div>

        {/* Section Spacing */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Section Spacing
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={48}
              step={4}
              value={pageLayout.sectionGap ?? 16}
              onChange={(e) => { setSectionGap(parseInt(e.target.value)); markDirty(); }}
              className="flex-1"
            />
            <span className="text-sm text-neutral-500 w-8 text-right">{pageLayout.sectionGap ?? 16}px</span>
          </div>
        </div>
      </AccordionSection>

      {/* ── 2. Page Format ── */}
      <AccordionSection
        title="Page Format"
        expanded={isPageFormatExpanded}
        onToggle={() => setIsPageFormatExpanded(!isPageFormatExpanded)}
      >
        {/* Page Size */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Page Size
          </label>
          <select
            value={pageLayout.pageSize}
            onChange={handlePageSizeChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {Object.entries(PAGE_SIZES).map(([id, { label }]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Orientation */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Orientation
          </label>
          <div className="flex">
            <button
              type="button"
              onClick={() => handleOrientationChange('portrait')}
              className={`px-3 py-2 text-sm border border-r-0 rounded-l-lg ${
                pageLayout.orientation === 'portrait'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => handleOrientationChange('landscape')}
              className={`px-3 py-2 text-sm border rounded-r-lg ${
                pageLayout.orientation === 'landscape'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Landscape
            </button>
          </div>
        </div>

        {/* Margins */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Margins (inches)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Top</label>
              <input
                type="number"
                value={pageLayout.margins.top}
                onChange={(e) => handleMarginChange('top', e.target.value)}
                step={0.125}
                min={0}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Right</label>
              <input
                type="number"
                value={pageLayout.margins.right}
                onChange={(e) => handleMarginChange('right', e.target.value)}
                step={0.125}
                min={0}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Bottom</label>
              <input
                type="number"
                value={pageLayout.margins.bottom}
                onChange={(e) => handleMarginChange('bottom', e.target.value)}
                step={0.125}
                min={0}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Left</label>
              <input
                type="number"
                value={pageLayout.margins.left}
                onChange={(e) => handleMarginChange('left', e.target.value)}
                step={0.125}
                min={0}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Header Layout */}
        <HeaderLayoutSection
          headerConfig={pageLayout.headerConfig ?? createDefaultHeaderConfig()}
          hasLogo={!!menuData.logo}
          onChange={(cfg) => { setHeaderConfig(cfg); markDirty(); }}
        />
      </AccordionSection>

      {/* ── 3. Tri-Fold Brochure ── */}
      <AccordionSection
        title="Tri-Fold Brochure"
        expanded={isTriFoldExpanded}
        onToggle={() => setIsTriFoldExpanded(!isTriFoldExpanded)}
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!pageLayout.triFold?.enabled}
              onChange={(e) => {
                if (e.target.checked) {
                  enableTriFold('letter');
                  // Auto-distribute sections
                  const sIds = menuData.sections.map((s) => s.id);
                  const dist = autoDistributeTriFold(sIds);
                  const store = useLayoutStore.getState();
                  for (const [panel, ids] of Object.entries(dist)) {
                    store.setTriFoldPanelSections(panel as TriFoldPanelRole, ids as string[]);
                  }
                } else {
                  disableTriFold();
                }
                markDirty();
              }}
              className="w-4 h-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
            Enable Tri-Fold
          </label>
          <p className="text-xs text-neutral-500">
            6-panel layout on letter/legal paper with fold lines
          </p>

          {pageLayout.triFold?.enabled && (
            <div className="space-y-4 mt-2">
              {/* Paper size */}
              <div className="flex gap-2">
                {(['letter', 'legal'] as TriFoldPaperSize[]).map((ps) => (
                  <button
                    key={ps}
                    type="button"
                    onClick={() => { setTriFoldPaperSize(ps); markDirty(); }}
                    className={`px-3 py-1.5 text-sm border rounded-lg ${
                      pageLayout.triFold?.paperSize === ps
                        ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                        : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {ps === 'letter' ? 'Letter (11"\u00d78.5")' : 'Legal (14"\u00d78.5")'}
                  </button>
                ))}
              </div>

              {/* Fold Type */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Fold Type</label>
                <div className="flex gap-1">
                  {([
                    ['letter-fold', 'Letter Fold', '|||'],
                    ['z-fold', 'Z-Fold', 'Z'],
                    ['gate-fold', 'Gate Fold', '|...|'],
                  ] as [TriFoldType, string, string][]).map(([type, label, icon], i, arr) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setTriFoldType(type); markDirty(); }}
                      className={`flex-1 px-2 py-2 text-xs border ${
                        i > 0 ? 'border-l-0' : ''
                      } ${i === 0 ? 'rounded-l-lg' : ''} ${i === arr.length - 1 ? 'rounded-r-lg' : ''} ${
                        (pageLayout.triFold?.foldType ?? 'letter-fold') === type
                          ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                          : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="font-mono text-xs mb-0.5">{icon}</div>
                      <div>{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cover Panel</label>
                <div className="space-y-1.5 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200">
                  {([
                    ['coverShowTitle', 'Show Title'],
                    ['coverShowSubtitle', 'Show Subtitle'],
                    ['coverShowLogo', 'Show Logo'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(pageLayout.triFold as any)?.[key] !== false}
                        onChange={(e) => { updateTriFoldConfig({ [key]: e.target.checked }); markDirty(); }}
                        className="w-3.5 h-3.5 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-xs text-neutral-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Back Panel Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Back Panel</label>
                <div className="space-y-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageLayout.triFold?.backShowFooter !== false}
                      onChange={(e) => { updateTriFoldConfig({ backShowFooter: e.target.checked }); markDirty(); }}
                      className="w-3.5 h-3.5 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs text-neutral-600">Show footer text</span>
                  </label>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Custom text</label>
                    <textarea
                      rows={3}
                      value={pageLayout.triFold?.backCustomText ?? ''}
                      onChange={(e) => { updateTriFoldConfig({ backCustomText: e.target.value || undefined }); markDirty(); }}
                      placeholder="Additional info on back panel..."
                      className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Auto-distribute button */}
              <button
                type="button"
                onClick={() => {
                  const sIds = menuData.sections.map((s) => s.id);
                  const dist = autoDistributeTriFold(sIds);
                  for (const [panel, ids] of Object.entries(dist)) {
                    setTriFoldPanelSections(panel as TriFoldPanelRole, ids as string[]);
                  }
                  markDirty();
                }}
                className="w-full px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                Auto-Distribute Sections
              </button>

              {/* Panel assignments */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Front Side</h4>
                {TRI_FOLD_FRONT_PANELS.map((panel) => (
                  <TriFoldPanelAssigner
                    key={panel}
                    panel={panel}
                    assignedSections={pageLayout.triFold?.panelSections?.[panel] ?? []}
                    allSections={menuData.sections}
                    onChange={(ids) => { setTriFoldPanelSections(panel, ids); markDirty(); }}
                  />
                ))}
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mt-3">Back Side (Inside)</h4>
                {TRI_FOLD_BACK_PANELS.map((panel) => (
                  <TriFoldPanelAssigner
                    key={panel}
                    panel={panel}
                    assignedSections={pageLayout.triFold?.panelSections?.[panel] ?? []}
                    allSections={menuData.sections}
                    onChange={(ids) => { setTriFoldPanelSections(panel, ids); markDirty(); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ── 4. Appearance ── */}
      <AccordionSection
        title="Appearance"
        expanded={isAppearanceExpanded}
        onToggle={() => setIsAppearanceExpanded(!isAppearanceExpanded)}
      >
        {/* Item Separator */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Item Separator
          </label>
          <div className="flex">
            <button
              type="button"
              onClick={() => handleItemSeparatorChange('none')}
              className={`px-3 py-2 text-sm border border-r-0 rounded-l-lg ${
                pageLayout.itemSeparator === 'none'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              None
            </button>
            <button
              type="button"
              onClick={() => handleItemSeparatorChange('line')}
              className={`px-3 py-2 text-sm border border-r-0 ${
                pageLayout.itemSeparator === 'line'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Line
            </button>
            <button
              type="button"
              onClick={() => handleItemSeparatorChange('dots')}
              className={`px-3 py-2 text-sm border border-r-0 ${
                pageLayout.itemSeparator === 'dots'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Dots
            </button>
            <button
              type="button"
              onClick={() => handleItemSeparatorChange('dashes')}
              className={`px-3 py-2 text-sm border rounded-r-lg ${
                pageLayout.itemSeparator === 'dashes'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Dashes
            </button>
          </div>
        </div>

        {/* Section Style */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Section Style
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              ['border', 'Border'],
              ['shadow', 'Shadow'],
              ['filled', 'Filled'],
              ['accent-left', 'Accent'],
            ] as const).map(([value, label]) => {
              const currentDecs = pageLayout.sectionDecorations ?? (pageLayout.sectionDecoration === 'none' ? [] : [pageLayout.sectionDecoration])
              const isActive = currentDecs.includes(value as SectionDecoration)
              return (
                <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => {
                      const next = isActive
                        ? currentDecs.filter((d) => d !== value)
                        : [...currentDecs, value as SectionDecoration]
                      setSectionDecorations(next)
                      // Keep legacy field in sync
                      setSectionDecoration(next.length > 0 ? next[0] : 'none')
                      markDirty()
                    }}
                    className="w-3.5 h-3.5 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-sm text-neutral-600">{label}</span>
                </label>
              )
            })}
          </div>
          <p className="text-xs text-neutral-400">Combine multiple styles (e.g. border + shadow)</p>
        </div>

        {/* Section Divider */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Section Divider
          </label>
          <div className="flex flex-wrap gap-1">
            {([
              ['none', 'None'],
              ['line', 'Line'],
              ['dots', 'Dots'],
              ['flourish', 'Flourish'],
              ['diamond', 'Diamond'],
              ['double-line', 'Double'],
            ] as const).map(([value, label], i, arr) => (
              <button
                key={value}
                type="button"
                onClick={() => { setSectionDivider(value as SectionDivider); markDirty(); }}
                className={`px-3 py-2 text-sm border ${
                  i > 0 ? 'border-l-0' : ''
                } ${i === 0 ? 'rounded-l-lg' : ''} ${i === arr.length - 1 ? 'rounded-r-lg' : ''} ${
                  (pageLayout.sectionDivider || 'none') === value
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Title Decoration */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Title Decoration
          </label>
          <div className="flex flex-wrap gap-1">
            {([
              ['none', 'None'],
              ['underline-solid', 'Underline'],
              ['underline-double', 'Double'],
              ['ornamental-flourish', 'Flourish'],
              ['ornamental-lines', 'Lines'],
              ['ornamental-diamond', 'Diamond'],
            ] as const).map(([value, label], i, arr) => (
              <button
                key={value}
                type="button"
                onClick={() => { setSectionTitleDecoration(value as SectionTitleDecoration); markDirty(); }}
                className={`px-3 py-2 text-sm border ${
                  i > 0 ? 'border-l-0' : ''
                } ${i === 0 ? 'rounded-l-lg' : ''} ${i === arr.length - 1 ? 'rounded-r-lg' : ''} ${
                  (pageLayout.sectionTitleDecoration || 'none') === value
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Currency
          </label>
          <div className="flex">
            {([
              ['$', '$'],
              ['\u20ac', '\u20ac'],
              ['\u00a3', '\u00a3'],
              ['\u00a5', '\u00a5'],
              ['none', 'None'],
            ] as const).map(([value, label], i, arr) => (
              <button
                key={value}
                type="button"
                onClick={() => { setCurrency(value as Currency); markDirty(); }}
                className={`px-3 py-2 text-sm border ${
                  i > 0 ? 'border-l-0' : ''
                } ${i === 0 ? 'rounded-l-lg' : ''} ${i === arr.length - 1 ? 'rounded-r-lg' : ''} ${
                  (pageLayout.currency || '$') === value
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Background Texture */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Background
          </label>
          <div className="flex flex-wrap gap-1">
            {([
              ['none', 'Plain'],
              ['paper', 'Paper'],
              ['linen', 'Linen'],
              ['parchment', 'Parchment'],
              ['chalkboard', 'Chalk'],
              ['marble', 'Marble'],
            ] as const).map(([value, label], i, arr) => (
              <button
                key={value}
                type="button"
                onClick={() => { setBackgroundTexture(value as BackgroundTexture); markDirty(); }}
                className={`px-3 py-2 text-sm border ${
                  i > 0 ? 'border-l-0' : ''
                } ${i === 0 ? 'rounded-l-lg' : ''} ${i === arr.length - 1 ? 'rounded-r-lg' : ''} ${
                  (pageLayout.backgroundTexture || 'none') === value
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Page Border */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Page Border
          </label>
          <div className="flex">
            {([
              ['none', 'None'],
              ['thin', 'Thin'],
              ['double', 'Double'],
              ['thick', 'Thick'],
              ['inset', 'Inset'],
            ] as const).map(([value, label], i, arr) => (
              <button
                key={value}
                type="button"
                onClick={() => { setPageBorder(value as PageBorder); markDirty(); }}
                className={`px-3 py-2 text-sm border ${
                  i > 0 ? 'border-l-0' : ''
                } ${i === 0 ? 'rounded-l-lg' : ''} ${i === arr.length - 1 ? 'rounded-r-lg' : ''} ${
                  (pageLayout.pageBorder || 'none') === value
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Legend */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pageLayout.showDietaryLegend ?? false}
              onChange={(e) => { setShowDietaryLegend(e.target.checked); markDirty(); }}
              className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm font-semibold text-neutral-700">Show dietary legend</span>
          </label>
          <p className="text-xs text-neutral-400">Displays a key for V, VG, GF, etc. at the bottom of the menu</p>
        </div>
      </AccordionSection>

      {/* ── 5. Price & Variants ── */}
      <AccordionSection
        title="Price & Variants"
        expanded={isPriceVariantsExpanded}
        onToggle={() => setIsPriceVariantsExpanded(!isPriceVariantsExpanded)}
      >
        {/* Price Format */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Price Format
          </label>
          <div className="flex">
            <button
              type="button"
              onClick={() => handlePriceFormatChange('right-aligned')}
              className={`px-3 py-2 text-sm border border-r-0 rounded-l-lg ${
                pageLayout.priceFormat === 'right-aligned'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Right-aligned
            </button>
            <button
              type="button"
              onClick={() => handlePriceFormatChange('inline')}
              className={`px-3 py-2 text-sm border border-r-0 ${
                pageLayout.priceFormat === 'inline'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Inline
            </button>
            <button
              type="button"
              onClick={() => handlePriceFormatChange('dot-leaders')}
              className={`px-3 py-2 text-sm border rounded-r-lg ${
                pageLayout.priceFormat === 'dot-leaders'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Dot Leaders
            </button>
          </div>
        </div>

        {/* Variant Display */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Variant Display
          </label>
          <div className="flex">
            <button
              type="button"
              onClick={() => { setVariantDisplayMode('inline'); markDirty(); }}
              className={`px-3 py-2 text-sm border border-r-0 rounded-l-lg ${
                (pageLayout.variantDisplayMode || 'inline') === 'inline'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Inline
            </button>
            <button
              type="button"
              onClick={() => { setVariantDisplayMode('stacked'); markDirty(); }}
              className={`px-3 py-2 text-sm border rounded-r-lg ${
                pageLayout.variantDisplayMode === 'stacked'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Stacked
            </button>
          </div>
          <p className="text-xs text-neutral-400">How items with multiple sizes are displayed</p>
        </div>

        {/* Variant Separator */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Variant Separator
          </label>
          <div className="flex">
            {([
              ['/', '/'],
              ['\u00b7', '\u00b7'],
              ['|', '|'],
              ['\u2014', '\u2014'],
            ] as const).map(([value, label], i, arr) => (
              <button
                key={value}
                type="button"
                onClick={() => { setVariantSeparator(value as VariantSeparator); markDirty(); }}
                className={`px-4 py-2 text-sm border ${
                  i > 0 ? 'border-l-0' : ''
                } ${i === 0 ? 'rounded-l-lg' : ''} ${i === arr.length - 1 ? 'rounded-r-lg' : ''} ${
                  (pageLayout.variantSeparator || '/') === value
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400">Character between variant prices (e.g. Half $9 / Full $14)</p>
        </div>
      </AccordionSection>

      {/* ── 6. Print ── */}
      <AccordionSection
        title="Print"
        expanded={isPrintExpanded}
        onToggle={() => setIsPrintExpanded(!isPrintExpanded)}
      >
        {/* Print Marks */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-700">
            Print Marks
          </label>
          <p className="text-xs text-neutral-400">Marks appear only in exported images, not in the preview</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pageLayout.printMarks?.showCropMarks ?? false}
                onChange={(e) => { setPrintMarks({ showCropMarks: e.target.checked }); markDirty(); }}
                className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-neutral-700">Crop marks</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pageLayout.printMarks?.showRegistrationMarks ?? false}
                onChange={(e) => { setPrintMarks({ showRegistrationMarks: e.target.checked }); markDirty(); }}
                className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-neutral-700">Registration marks</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-neutral-600 whitespace-nowrap">Bleed</label>
            <input
              type="number"
              min={0}
              max={0.5}
              step={0.0625}
              value={pageLayout.printMarks?.bleed ?? 0.125}
              onChange={(e) => { setPrintMarks({ bleed: parseFloat(e.target.value) || 0.125 }); markDirty(); }}
              className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-xs text-neutral-400">inches</span>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
};

// ── Arrange Buttons ────────────────────────────────────────────────

interface ArrangeButtonsProps {
  allLayouts: import('@/models/layout').SectionLayout[]
  selectedIds: string[]
  onApply: (next: import('@/models/layout').SectionLayout[]) => void
}

const ABtnClass =
  'px-2 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors'

// ── Pages Management Section ─────────────────────────────────────

interface PagesSectionProps {
  pages: import('@/models/layout').PageDefinition[] | undefined
  onToggle: (enabled: boolean) => void
  onAddPage: () => void
  onRemovePage: (id: string) => void
  onRenamePage: (id: string, name: string) => void
  onSetColumnCount: (id: string, count: ColumnCount) => void
}

const PagesSection: React.FC<PagesSectionProps> = ({ pages, onToggle, onAddPage, onRemovePage, onRenamePage, onSetColumnCount }) => {
  const isEnabled = !!pages && pages.length > 0
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-neutral-700">Pages</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-xs text-neutral-500">Multi-page</span>
        </label>
      </div>

      {isEnabled && pages && (
        <div className="space-y-2">
          {pages.map((page) => (
            <div key={page.id} className="flex items-center gap-2 p-2 bg-white border border-neutral-200 rounded-lg">
              {editingId === page.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue.trim()) onRenamePage(page.id, editValue.trim())
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editValue.trim()) onRenamePage(page.id, editValue.trim())
                      setEditingId(null)
                    }
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                  className="flex-1 px-2 py-0.5 text-sm border border-amber-400 rounded focus:outline-none"
                />
              ) : (
                <span
                  className="flex-1 text-sm text-neutral-700 cursor-pointer"
                  onDoubleClick={() => { setEditingId(page.id); setEditValue(page.name) }}
                >
                  {page.name}
                </span>
              )}

              <span className="text-xs text-neutral-400">Cols:</span>
              <select
                value={page.columnCount}
                onChange={(e) => onSetColumnCount(page.id, parseInt(e.target.value) as ColumnCount)}
                className="text-xs border border-neutral-300 rounded px-1 py-0.5 bg-white focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemovePage(page.id)}
                  className="text-neutral-400 hover:text-red-500 text-sm font-bold transition-colors"
                  title="Delete page"
                >
                  x
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={onAddPage}
            className="w-full px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            + Add Page
          </button>
        </div>
      )}
    </div>
  )
}

const ArrangeButtons: React.FC<ArrangeButtonsProps> = ({ allLayouts, selectedIds, onApply }) => {
  // When 2+ sections are selected, operate only on those; otherwise operate on all
  const hasSelection = selectedIds.length >= 2
  const selectedSet = new Set(selectedIds)

  /** Apply an alignment fn to only the selected layouts, merge back into the full list */
  const apply = (fn: (layouts: import('@/models/layout').SectionLayout[]) => import('@/models/layout').SectionLayout[]) => {
    if (hasSelection) {
      const selected = allLayouts.filter((l) => selectedSet.has(l.sectionId))
      const aligned = fn(selected)
      const alignedMap = new Map(aligned.map((l) => [l.sectionId, l]))
      const merged = allLayouts.map((l) => alignedMap.get(l.sectionId) ?? l)
      onApply(merged)
    } else {
      onApply(fn(allLayouts))
    }
  }

  const btnClass = ABtnClass
  const selectionHint = hasSelection
    ? `${selectedIds.length} selected`
    : 'all sections'

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        Arrange
        <span className="ml-1 normal-case font-normal text-neutral-400">
          ({selectionHint})
        </span>
      </label>
      <p className="text-[10px] text-neutral-400">
        Cmd/Ctrl+click sections in the preview to multi-select
      </p>
      {/* Row 1: Align */}
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btnClass} onClick={() => apply(alignLeft)} title="Align left edges">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="1" x2="2" y2="13" />
            <rect x="4" y="3" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="4" y="8" width="5" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
        <button type="button" className={btnClass} onClick={() => apply(alignCenterH)} title="Align horizontal centers">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="7" y1="1" x2="7" y2="13" strokeDasharray="2 1" />
            <rect x="2" y="3" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="3.5" y="8" width="7" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
        <button type="button" className={btnClass} onClick={() => apply(alignRight)} title="Align right edges">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="12" y1="1" x2="12" y2="13" />
            <rect x="2" y="3" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="5" y="8" width="5" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
        <span className="w-1" />
        <button type="button" className={btnClass} onClick={() => apply(alignTop)} title="Align top edges">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="1" y1="2" x2="13" y2="2" />
            <rect x="2" y="4" width="4" height="8" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="8" y="4" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
        <button type="button" className={btnClass} onClick={() => apply(alignCenterV)} title="Align vertical centers">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="1" y1="7" x2="13" y2="7" strokeDasharray="2 1" />
            <rect x="2" y="2" width="4" height="10" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="8" y="3.5" width="4" height="7" rx="0.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
        <button type="button" className={btnClass} onClick={() => apply(alignBottom)} title="Align bottom edges">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="1" y1="12" x2="13" y2="12" />
            <rect x="2" y="2" width="4" height="8" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="8" y="5" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
      </div>
      {/* Row 2: Distribute + Equalize */}
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btnClass} onClick={() => apply(distributeH)} title="Distribute horizontal spacing">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="4" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="5.5" y="4" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="10" y="4" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
        <button type="button" className={btnClass} onClick={() => apply(distributeV)} title="Distribute vertical spacing">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="1" width="6" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="4" y="5.5" width="6" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="4" y="10" width="6" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
        <span className="w-1" />
        <button type="button" className={btnClass} onClick={() => apply(equalWidth)} title="Equal width">
          <span className="text-[10px] leading-none font-bold">=W</span>
        </button>
        <button type="button" className={btnClass} onClick={() => apply(equalHeight)} title="Equal height">
          <span className="text-[10px] leading-none font-bold">=H</span>
        </button>
      </div>
    </div>
  )
};

// ── Header Layout Section ─────────────────────────────────────────

const PRESET_ICONS: Record<HeaderLayoutPreset, { label: string; diagram: React.ReactNode }> = {
  'centered-stack': {
    label: 'Centered Stack',
    diagram: (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <rect x="12" y="2" width="8" height="6" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="6" y="10" width="20" height="3" rx="0.5" fill="currentColor" opacity="0.7" />
        <rect x="8" y="15" width="16" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  'left-logo': {
    label: 'Left Logo',
    diagram: (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <rect x="2" y="5" width="10" height="10" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="15" y="7" width="15" height="3" rx="0.5" fill="currentColor" opacity="0.7" />
        <rect x="15" y="12" width="10" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  'right-logo': {
    label: 'Right Logo',
    diagram: (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <rect x="20" y="5" width="10" height="10" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="2" y="7" width="15" height="3" rx="0.5" fill="currentColor" opacity="0.7" />
        <rect x="2" y="12" width="10" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  'inline': {
    label: 'Inline',
    diagram: (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <rect x="1" y="8" width="8" height="8" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="11" y="9" width="12" height="3" rx="0.5" fill="currentColor" opacity="0.7" />
        <rect x="11" y="14" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  'minimal': {
    label: 'Minimal',
    diagram: (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <rect x="4" y="8" width="24" height="4" rx="0.5" fill="currentColor" opacity="0.7" />
        <rect x="8" y="14" width="16" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  'custom': {
    label: 'Custom',
    diagram: (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <text x="8" y="16" fontSize="12" fill="currentColor" opacity="0.6">✦</text>
        <rect x="18" y="8" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
        <rect x="4" y="16" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
}

interface HeaderLayoutSectionProps {
  headerConfig: HeaderConfig
  hasLogo: boolean
  onChange: (updates: Partial<HeaderConfig>) => void
}

function HeaderLayoutSection({ headerConfig, hasLogo, onChange }: HeaderLayoutSectionProps) {
  const preset = headerConfig.preset
  const isAutoHeight = headerConfig.height === 0

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-neutral-700">Header Layout</label>

      {/* Preset picker */}
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(PRESET_ICONS) as HeaderLayoutPreset[]).map((p) => {
          const { label, diagram } = PRESET_ICONS[p]
          const isActive = preset === p
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ preset: p })}
              title={label}
              className={`flex flex-col items-center gap-1 px-2 py-2 border rounded-lg text-[10px] leading-tight transition-colors ${
                isActive
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                  : 'border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {diagram}
              <span className="text-center">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Logo Scale — only when logo exists and not in minimal/custom mode */}
      {hasLogo && preset !== 'minimal' && preset !== 'custom' && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-neutral-500">
            Logo Scale: {headerConfig.logoScale.toFixed(1)}x
          </label>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={headerConfig.logoScale}
            onChange={(e) => onChange({ logoScale: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
      )}

      {/* Show Divider */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={headerConfig.showDivider}
          onChange={(e) => onChange({ showDivider: e.target.checked })}
          className="w-3.5 h-3.5 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
        />
        <span className="text-sm text-neutral-600">Show divider line</span>
      </label>

      {/* Header Height */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoHeight}
              onChange={(e) => onChange({ height: e.target.checked ? 0 : 120 })}
              className="w-3.5 h-3.5 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-sm text-neutral-600">Auto height</span>
          </label>
        </div>
        {!isAutoHeight && (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={40}
              max={400}
              step={10}
              value={headerConfig.height}
              onChange={(e) => onChange({ height: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm text-neutral-500 w-14 text-right">{headerConfig.height}px</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** Panel assignment widget for tri-fold mode */
function TriFoldPanelAssigner({
  panel,
  assignedSections,
  allSections,
  onChange,
}: {
  panel: TriFoldPanelRole
  assignedSections: string[]
  allSections: { id: string; title: string }[]
  onChange: (ids: string[]) => void
}) {
  const label = TRI_FOLD_PANEL_LABELS[panel]

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200">
      <span className="text-xs font-medium text-neutral-700 w-24 pt-0.5 shrink-0">{label}</span>
      <div className="flex-1 space-y-1">
        {assignedSections.length === 0 && (
          <span className="text-xs text-neutral-400 italic">None</span>
        )}
        {assignedSections.map((sid) => {
          const sec = allSections.find((s) => s.id === sid)
          return (
            <div key={sid} className="flex items-center gap-1 text-xs text-neutral-600">
              <span className="truncate">{sec?.title || 'Untitled'}</span>
              <button
                type="button"
                onClick={() => onChange(assignedSections.filter((id) => id !== sid))}
                className="text-neutral-400 hover:text-red-500 ml-auto"
              >
                x
              </button>
            </div>
          )
        })}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onChange([...assignedSections, e.target.value])
          }}
          className="w-full text-xs px-1.5 py-1 border border-neutral-200 rounded bg-white"
        >
          <option value="">+ Add section...</option>
          {allSections
            .filter((s) => !assignedSections.includes(s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>{s.title || 'Untitled'}</option>
            ))
          }
        </select>
      </div>
    </div>
  )
}
