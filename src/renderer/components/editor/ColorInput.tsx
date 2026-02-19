import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };

    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPickerOpen]);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHexInput(newValue);

    // Validate hex color format
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-neutral-700 min-w-[80px]">
        {label}
      </label>
      <div className="relative flex items-center gap-2 flex-1">
        <button
          type="button"
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          className="w-8 h-8 rounded-md border-2 border-neutral-300 cursor-pointer hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-colors flex-shrink-0"
          style={{ backgroundColor: value }}
          aria-label={`Pick ${label} color`}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexInputChange}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
          placeholder="#000000"
        />
        {isPickerOpen && (
          <div
            ref={pickerRef}
            className="absolute top-full left-0 mt-2 z-50 p-3 bg-white rounded-lg shadow-lg border border-neutral-200"
          >
            <HexColorPicker color={value} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
};
