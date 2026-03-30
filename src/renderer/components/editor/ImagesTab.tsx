import { useState } from 'react'
import { LogoEditor } from './LogoEditor'
import { PageImageList } from './PageImageList'
import { TextFrameList } from './TextFrameList'

type AccordionSection = 'logo' | 'images' | 'text' | null

export function ImagesTab() {
  const [openSection, setOpenSection] = useState<AccordionSection>('logo')

  const toggle = (section: Exclude<AccordionSection, null>) =>
    setOpenSection(openSection === section ? null : section)

  const chevron = (section: Exclude<AccordionSection, null>) => (
    <svg
      className={`w-4 h-4 text-neutral-400 transition-transform ${openSection === section ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      {/* Logo accordion */}
      <div className="border-b border-neutral-200">
        <button
          onClick={() => toggle('logo')}
          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 transition-colors"
        >
          <span className="text-sm font-semibold text-neutral-700">Logo</span>
          {chevron('logo')}
        </button>
        {openSection === 'logo' && <LogoEditor />}
      </div>

      {/* Page Images accordion */}
      <div className="border-b border-neutral-200">
        <button
          onClick={() => toggle('images')}
          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 transition-colors"
        >
          <span className="text-sm font-semibold text-neutral-700">Images</span>
          {chevron('images')}
        </button>
        {openSection === 'images' && <PageImageList />}
      </div>

      {/* Text Frames accordion */}
      <div className="border-b border-neutral-200">
        <button
          onClick={() => toggle('text')}
          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 transition-colors"
        >
          <span className="text-sm font-semibold text-neutral-700">Text Boxes</span>
          {chevron('text')}
        </button>
        {openSection === 'text' && <TextFrameList />}
      </div>
    </div>
  )
}
