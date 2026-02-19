import React, { useCallback, useState } from 'react';
import { useLayoutStore } from '@/stores/layout-store';
import { useUIStore } from '@/stores/ui-store';
import type { TypographyConfig } from '@/models/layout';
import { ColorInput } from './ColorInput';
import { TypographyControl } from './TypographyControl';
import { stylePresets } from '@/templates/style-presets';

export const StyleTab: React.FC = () => {
  const { pageLayout, setColorScheme, setTypography } = useLayoutStore();
  const { markDirty } = useUIStore();
  const [isPresetsExpanded, setIsPresetsExpanded] = useState(true);
  const [isColorSchemeExpanded, setIsColorSchemeExpanded] = useState(true);
  const [isTypographyExpanded, setIsTypographyExpanded] = useState(true);

  const applyPreset = useCallback((presetId: string) => {
    const preset = stylePresets.find((p) => p.id === presetId);
    if (!preset) return;
    setColorScheme(preset.colorScheme);
    for (const role of Object.keys(preset.typography) as (keyof TypographyConfig)[]) {
      setTypography(role, preset.typography[role]);
    }
    markDirty();
  }, [setColorScheme, setTypography, markDirty]);

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
      {/* Style Presets Section */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsPresetsExpanded(!isPresetsExpanded)}
          className="w-full px-5 py-4 bg-neutral-50 hover:bg-neutral-100 transition-colors flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-neutral-800">Style Presets</h2>
          <svg
            className={`w-5 h-5 text-neutral-500 transition-transform ${
              isPresetsExpanded ? 'rotate-180' : ''
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

        {isPresetsExpanded && (
          <div className="p-5">
            <p className="text-xs text-neutral-500 mb-4">
              Click a preset to apply its color scheme and typography to your menu.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {stylePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  title={preset.description}
                  className="group flex flex-col items-center gap-2 p-3 rounded-lg border border-neutral-200 hover:border-blue-400 hover:shadow-md transition-all bg-white text-left"
                >
                  <div className="flex gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-neutral-300 flex-shrink-0"
                      style={{ backgroundColor: preset.colorScheme.background }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-neutral-300 flex-shrink-0"
                      style={{ backgroundColor: preset.colorScheme.text }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-neutral-300 flex-shrink-0"
                      style={{ backgroundColor: preset.colorScheme.accent }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-neutral-300 flex-shrink-0"
                      style={{ backgroundColor: preset.colorScheme.border }}
                    />
                  </div>
                  <span className="text-xs font-medium text-neutral-700 group-hover:text-blue-600 transition-colors text-center leading-tight">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
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
