import React, { useCallback, useState } from 'react';
import { useLayoutStore } from '@/stores/layout-store';
import { useUIStore } from '@/stores/ui-store';
import type { TypographyConfig } from '@/models/layout';
import { createDefaultPageLayout } from '@/models/layout';
import { ColorInput } from './ColorInput';
import { TypographyControl } from './TypographyControl';
import { themePresets, resolveThemePreset } from '@/templates/theme-presets';
import { nanoid } from 'nanoid';
import { loadBrandingPresets, saveBrandingPreset, deleteBrandingPreset } from '@/utils/branding-kit';
import type { BrandingPreset } from '@/utils/branding-kit';

export const StyleTab: React.FC = () => {
  const { pageLayout, setColorScheme, setTypography, applyBatchUpdate } = useLayoutStore();
  const { markDirty } = useUIStore();
  const [isStylesExpanded, setIsStylesExpanded] = useState(true);
  const [includeDecorations, setIncludeDecorations] = useState(true);
  const [isColorSchemeExpanded, setIsColorSchemeExpanded] = useState(true);
  const [isTypographyExpanded, setIsTypographyExpanded] = useState(true);
  const [customPresets, setCustomPresets] = useState<BrandingPreset[]>(() => loadBrandingPresets());
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const applyQuickStyle = useCallback((themeId: string) => {
    const theme = themePresets.find((t) => t.id === themeId);
    if (!theme) return;
    const resolved = resolveThemePreset(theme);
    // Merge typography preserving user's menuTitle/menuSubtitle font sizes
    const mergedTypography: any = {};
    for (const role of Object.keys(resolved.typography) as (keyof TypographyConfig)[]) {
      if (role === 'menuTitle' || role === 'menuSubtitle') {
        const { fontSize: _drop, ...rest } = resolved.typography[role];
        mergedTypography[role] = { ...rest, fontSize: pageLayout.typography[role].fontSize };
      } else {
        mergedTypography[role] = resolved.typography[role];
      }
    }
    const update: any = {
      colorScheme: resolved.colorScheme,
      typography: mergedTypography,
    };
    if (includeDecorations) {
      Object.assign(update, resolved.decorations);
    }
    applyBatchUpdate(update);
    markDirty();
  }, [applyBatchUpdate, markDirty, includeDecorations]);

  const resetToDefaultStyle = useCallback(() => {
    const defaults = createDefaultPageLayout();
    applyBatchUpdate({
      colorScheme: defaults.colorScheme,
      typography: defaults.typography,
      itemSeparator: defaults.itemSeparator,
      priceFormat: defaults.priceFormat,
      sectionDecoration: defaults.sectionDecoration,
      currency: defaults.currency,
      backgroundTexture: defaults.backgroundTexture,
      sectionDivider: defaults.sectionDivider,
      pageBorder: defaults.pageBorder,
      sectionGap: defaults.sectionGap,
      variantDisplayMode: undefined,
      variantSeparator: undefined,
      sectionTitleDecoration: undefined,
      pricePosition: undefined,
    });
    markDirty();
  }, [applyBatchUpdate, markDirty]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: BrandingPreset = {
      id: nanoid(),
      name: presetName.trim(),
      createdAt: new Date().toISOString(),
      colorScheme: { ...pageLayout.colorScheme },
      typography: JSON.parse(JSON.stringify(pageLayout.typography)),
      decorations: {
        itemSeparator: pageLayout.itemSeparator,
        sectionDecoration: pageLayout.sectionDecoration,
        sectionDivider: pageLayout.sectionDivider,
        sectionTitleDecoration: pageLayout.sectionTitleDecoration,
        backgroundTexture: pageLayout.backgroundTexture,
        pageBorder: pageLayout.pageBorder,
        priceFormat: pageLayout.priceFormat,
      },
    };
    saveBrandingPreset(preset);
    setCustomPresets(loadBrandingPresets());
    setPresetName('');
    setShowSavePreset(false);
  }, [presetName, pageLayout]);

  const handleApplyPreset = useCallback((preset: BrandingPreset) => {
    applyBatchUpdate({
      colorScheme: preset.colorScheme,
      typography: preset.typography,
      itemSeparator: preset.decorations.itemSeparator,
      sectionDecoration: preset.decorations.sectionDecoration,
      sectionDivider: preset.decorations.sectionDivider,
      sectionTitleDecoration: preset.decorations.sectionTitleDecoration,
      backgroundTexture: preset.decorations.backgroundTexture,
      pageBorder: preset.decorations.pageBorder,
      priceFormat: preset.decorations.priceFormat,
    });
    markDirty();
  }, [applyBatchUpdate, markDirty]);

  const handleDeletePreset = useCallback((id: string) => {
    deleteBrandingPreset(id);
    setCustomPresets(loadBrandingPresets());
  }, []);

  const handleColorChange = (field: keyof typeof pageLayout.colorScheme, color: string) => {
    setColorScheme({ [field]: color });
    markDirty();
  };

  /** Scale all font sizes by a multiplier */
  const scaleAllFonts = useCallback((factor: number) => {
    const t = pageLayout.typography;
    for (const role of Object.keys(t) as (keyof TypographyConfig)[]) {
      const current = t[role];
      setTypography(role, { fontSize: Math.max(6, Math.round(current.fontSize * factor)) });
    }
    markDirty();
  }, [pageLayout.typography, setTypography, markDirty]);

  const typographyRoles: Array<{
    key: keyof typeof pageLayout.typography;
    label: string;
  }> = [
    { key: 'menuTitle', label: 'Menu Title' },
    { key: 'menuSubtitle', label: 'Menu Subtitle' },
    { key: 'sectionTitle', label: 'Section Title' },
    { key: 'sectionSubtitle', label: 'Section Subtitle' },
    { key: 'itemName', label: 'Item Name' },
    { key: 'itemDescription', label: 'Item Description' },
    { key: 'itemPrice', label: 'Item Price' },
    { key: 'footer', label: 'Footer' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Quick Styles Section */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsStylesExpanded(!isStylesExpanded)}
          className="w-full px-5 py-4 bg-neutral-50 hover:bg-neutral-100 transition-colors flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-neutral-800">Quick Styles</h2>
          <svg
            className={`w-5 h-5 text-neutral-500 transition-transform ${
              isStylesExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isStylesExpanded && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-neutral-500">
                Apply colors, fonts{includeDecorations ? ', and decorations' : ''}.
              </p>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDecorations}
                  onChange={(e) => setIncludeDecorations(e.target.checked)}
                  className="w-3.5 h-3.5 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-xs text-neutral-500 whitespace-nowrap">Decorations</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themePresets.map((theme) => {
                const resolved = resolveThemePreset(theme);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => applyQuickStyle(theme.id)}
                    title={theme.description}
                    className="group flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-neutral-200 hover:border-amber-400 hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex gap-1">
                      <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 flex-shrink-0" style={{ backgroundColor: resolved.colorScheme.background }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 flex-shrink-0" style={{ backgroundColor: resolved.colorScheme.text }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 flex-shrink-0" style={{ backgroundColor: resolved.colorScheme.accent }} />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-700 group-hover:text-amber-700 transition-colors text-center leading-tight">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-neutral-700">My Presets</h3>
                <button
                  type="button"
                  onClick={() => setShowSavePreset(!showSavePreset)}
                  className="px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded transition-colors"
                >
                  {showSavePreset ? 'Cancel' : '+ Save Current'}
                </button>
              </div>

              {showSavePreset && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                    placeholder="Preset name..."
                    className="flex-1 px-2 py-1.5 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-40 transition-colors"
                  >
                    Save
                  </button>
                </div>
              )}

              {customPresets.length > 0 ? (
                <div className="space-y-1">
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 hover:border-amber-400 hover:shadow-sm transition-all bg-white group"
                    >
                      <div className="flex gap-0.5 flex-shrink-0">
                        <span className="w-3 h-3 rounded-full border border-neutral-300" style={{ backgroundColor: preset.colorScheme.background }} />
                        <span className="w-3 h-3 rounded-full border border-neutral-300" style={{ backgroundColor: preset.colorScheme.text }} />
                        <span className="w-3 h-3 rounded-full border border-neutral-300" style={{ backgroundColor: preset.colorScheme.accent }} />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="flex-1 text-left text-xs font-medium text-neutral-700 hover:text-amber-700 transition-colors truncate"
                      >
                        {preset.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all text-xs"
                        title="Delete preset"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic">No saved presets yet.</p>
              )}
            </div>

            <button
              type="button"
              onClick={resetToDefaultStyle}
              className="mt-3 w-full px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Reset to Default Style
            </button>
          </div>
        )}
      </div>

      {/* Color Scheme Section */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsColorSchemeExpanded(!isColorSchemeExpanded)}
          className="w-full px-5 py-4 bg-neutral-50 hover:bg-neutral-100 transition-colors flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-neutral-800">Color Scheme</h2>
          <svg
            className={`w-5 h-5 text-neutral-500 transition-transform ${
              isColorSchemeExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isColorSchemeExpanded && (
          <div className="p-5 space-y-4">
            <ColorInput
              label="Background"
              value={pageLayout.colorScheme.background}
              onChange={(color) => handleColorChange('background', color)}
            />
            <ColorInput
              label="Text"
              value={pageLayout.colorScheme.text}
              onChange={(color) => handleColorChange('text', color)}
            />
            <ColorInput
              label="Accent"
              value={pageLayout.colorScheme.accent}
              onChange={(color) => handleColorChange('accent', color)}
            />
            <ColorInput
              label="Border"
              value={pageLayout.colorScheme.border}
              onChange={(color) => handleColorChange('border', color)}
            />
            <ColorInput
              label="Section Title"
              value={pageLayout.colorScheme.sectionTitle || pageLayout.colorScheme.accent}
              onChange={(color) => handleColorChange('sectionTitle', color)}
            />
            <ColorInput
              label="Price"
              value={pageLayout.colorScheme.price || pageLayout.colorScheme.accent}
              onChange={(color) => handleColorChange('price', color)}
            />
          </div>
        )}
      </div>

      {/* Typography Section */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsTypographyExpanded(!isTypographyExpanded)}
          className="w-full px-5 py-4 bg-neutral-50 hover:bg-neutral-100 transition-colors flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-neutral-800">Typography</h2>
          <svg
            className={`w-5 h-5 text-neutral-500 transition-transform ${
              isTypographyExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isTypographyExpanded && (
          <div className="p-5 space-y-3">
            {/* Universal font size scaler */}
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-neutral-200">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mr-auto">
                Scale All
              </span>
              <button
                type="button"
                onClick={() => scaleAllFonts(0.9)}
                className="px-2.5 py-1 text-xs font-medium text-neutral-600 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
                title="Shrink all fonts by 10%"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => scaleAllFonts(1.1)}
                className="px-2.5 py-1 text-xs font-medium text-neutral-600 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
                title="Grow all fonts by 10%"
              >
                A+
              </button>
            </div>

            {typographyRoles.map((role) => (
              <TypographyControl
                key={role.key}
                role={role.key}
                label={role.label}
                fontStyle={pageLayout.typography[role.key]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
