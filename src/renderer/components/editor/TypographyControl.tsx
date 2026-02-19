import React, { useState, useEffect } from 'react';
import { useLayoutStore } from '@/stores/layout-store';
import { useUIStore } from '@/stores/ui-store';
import { getAllFontFamilies } from '@/fonts/registry';
import { ColorInput } from './ColorInput';

interface FontStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textAlign: 'left' | 'center' | 'right';
  color: string;
}

interface TypographyConfig {
  menuTitle: FontStyle;
  menuSubtitle: FontStyle;
  sectionTitle: FontStyle;
  sectionSubtitle: FontStyle;
  itemName: FontStyle;
  itemDescription: FontStyle;
  itemPrice: FontStyle;
  footer: FontStyle;
}

interface TypographyControlProps {
  role: keyof TypographyConfig;
  label: string;
  fontStyle: FontStyle;
}

export const TypographyControl: React.FC<TypographyControlProps> = ({
  role,
  label,
  fontStyle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fontFamilies, setFontFamilies] = useState<string[]>([]);
  const { setTypography } = useLayoutStore();
  const { markDirty } = useUIStore();

  useEffect(() => {
    setFontFamilies(getAllFontFamilies());
  }, []);

  const handleChange = (field: keyof FontStyle, value: any) => {
    setTypography(role, { [field]: value });
    markDirty();
  };

  const textAlignButtons: Array<{ value: 'left' | 'center' | 'right'; label: string }> = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ];

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-4 flex-1">
          <span className="text-sm font-medium text-neutral-700">{label}</span>
          <span className="text-xs text-neutral-500">
            {fontStyle.fontFamily} • {fontStyle.fontSize}pt
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-neutral-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Font Family */}
          <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm font-medium text-neutral-700">Font Family</label>
            <select
              value={fontStyle.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {fontFamilies.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm font-medium text-neutral-700">Font Size</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="6"
                max="72"
                step="1"
                value={fontStyle.fontSize}
                onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-sm text-neutral-500 min-w-[24px]">pt</span>
            </div>
          </div>

          {/* Font Weight */}
          <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm font-medium text-neutral-700">Font Weight</label>
            <select
              value={fontStyle.fontWeight}
              onChange={(e) => handleChange('fontWeight', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="300">Light</option>
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="600">Semibold</option>
              <option value="700">Bold</option>
            </select>
          </div>

          {/* Text Align */}
          <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm font-medium text-neutral-700">Text Align</label>
            <div className="flex gap-2">
              {textAlignButtons.map((btn) => (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => handleChange('textAlign', btn.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    fontStyle.textAlign === btn.value
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Transform */}
          <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm font-medium text-neutral-700">Text Transform</label>
            <select
              value={fontStyle.textTransform}
              onChange={(e) =>
                handleChange(
                  'textTransform',
                  e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize'
                )
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="none">None</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>

          {/* Letter Spacing */}
          <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm font-medium text-neutral-700">Letter Spacing</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="-0.1"
                max="0.5"
                step="0.01"
                value={fontStyle.letterSpacing}
                onChange={(e) => handleChange('letterSpacing', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-sm text-neutral-500 min-w-[24px]">em</span>
            </div>
          </div>

          {/* Line Height */}
          <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
            <label className="text-sm font-medium text-neutral-700">Line Height</label>
            <input
              type="number"
              min="0.8"
              max="3"
              step="0.1"
              value={fontStyle.lineHeight}
              onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Color */}
          <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
            <ColorInput
              label="Color"
              value={fontStyle.color}
              onChange={(color) => handleChange('color', color)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
