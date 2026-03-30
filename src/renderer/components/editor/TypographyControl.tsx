import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLayoutStore } from '@/stores/layout-store';
import { useUIStore } from '@/stores/ui-store';
import { getFontsByCategory } from '@/fonts/registry';
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
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const fontPickerRef = useRef<HTMLDivElement>(null);
  const fontSearchRef = useRef<HTMLInputElement>(null);
  const { setTypography } = useLayoutStore();
  const { markDirty } = useUIStore();

  const fontGroups = useMemo(() => getFontsByCategory(), []);

  const filteredFontGroups = useMemo(() => {
    if (!fontSearch.trim()) return fontGroups;
    const query = fontSearch.toLowerCase();
    const filtered = new Map<string, { family: string; category: string }[]>();
    for (const [category, fonts] of fontGroups.entries()) {
      const matches = fonts.filter(f => f.family.toLowerCase().includes(query));
      if (matches.length > 0) filtered.set(category, matches);
    }
    return filtered;
  }, [fontGroups, fontSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(event.target as Node)) {
        setFontPickerOpen(false);
        setFontSearch('');
      }
    };
    if (fontPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opening
      setTimeout(() => fontSearchRef.current?.focus(), 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fontPickerOpen]);

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
            <div className="relative" ref={fontPickerRef}>
              <button
                type="button"
                onClick={() => setFontPickerOpen(!fontPickerOpen)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-left flex items-center justify-between"
              >
                <span style={{ fontFamily: fontStyle.fontFamily }} className="truncate">
                  {fontStyle.fontFamily}
                </span>
                <svg className={`w-4 h-4 text-neutral-400 transition-transform flex-shrink-0 ${fontPickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {fontPickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-neutral-200 max-h-72 flex flex-col">
                  <div className="p-2 border-b border-neutral-100">
                    <input
                      ref={fontSearchRef}
                      type="text"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      placeholder="Search fonts..."
                      className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {Array.from(filteredFontGroups.entries()).map(([category, fonts]) => (
                      <div key={category}>
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-50 sticky top-0">
                          {category}
                        </div>
                        {fonts.map((font) => (
                          <button
                            key={font.family}
                            type="button"
                            onClick={() => {
                              handleChange('fontFamily', font.family);
                              setFontPickerOpen(false);
                              setFontSearch('');
                            }}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-amber-50 transition-colors ${
                              fontStyle.fontFamily === font.family ? 'bg-amber-50 text-amber-800 font-medium' : 'text-neutral-700'
                            }`}
                            style={{ fontFamily: font.family }}
                          >
                            {font.family}
                          </button>
                        ))}
                      </div>
                    ))}
                    {filteredFontGroups.size === 0 && (
                      <div className="px-3 py-4 text-sm text-neutral-400 text-center">No fonts found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
                min="-2"
                max="10"
                step="0.5"
                value={fontStyle.letterSpacing}
                onChange={(e) => handleChange('letterSpacing', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="text-sm text-neutral-500 min-w-[24px]">px</span>
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
