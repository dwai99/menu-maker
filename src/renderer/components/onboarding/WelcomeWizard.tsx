import { useState } from 'react'
import { stylePresets, type StylePreset } from '@/templates/style-presets'

export interface WelcomeWizardResult {
  restaurantName: string
  presetId: string | null
  startType: 'blank' | 'template' | 'import'
}

interface WelcomeWizardProps {
  onComplete: (result: WelcomeWizardResult) => void
  onOpenTemplates: () => void
  onImportFile: () => void
  onSkip: () => void
}

type StartType = 'blank' | 'template' | 'import'

// ── Step Indicator ───────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep

        return (
          <div key={stepNum} className="flex items-center">
            {isCompleted ? (
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : isCurrent ? (
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-sm ring-4 ring-amber-100">
                <span className="text-xs font-bold text-white">{stepNum}</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full border-2 border-neutral-200 flex items-center justify-center">
                <span className="text-xs font-medium text-neutral-400">{stepNum}</span>
              </div>
            )}
            {stepNum < totalSteps && (
              <div
                className={`w-12 h-0.5 mx-1 ${
                  stepNum < currentStep ? 'bg-amber-400' : 'bg-neutral-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Choose Start Type ─────────────────────────────────

interface StartOptionCard {
  type: StartType
  icon: string
  title: string
  description: string
}

const startOptions: StartOptionCard[] = [
  {
    type: 'template',
    icon: '🎨',
    title: 'Pick a Template',
    description: 'Choose from professionally designed templates to get started quickly.',
  },
  {
    type: 'blank',
    icon: '✏️',
    title: 'Start Blank',
    description: 'Build your menu from scratch with a clean canvas.',
  },
  {
    type: 'import',
    icon: '📂',
    title: 'Import Existing Menu',
    description: 'Open a previously saved .menu file to continue your work.',
  },
]

interface Step1Props {
  onSelect: (type: StartType) => void
  onOpenTemplates: () => void
  onImportFile: () => void
  onSkip: () => void
}

function Step1({ onSelect, onOpenTemplates, onImportFile, onSkip }: Step1Props) {
  const [hovered, setHovered] = useState<StartType | null>(null)

  function handleCardClick(type: StartType) {
    if (type === 'template') {
      onSelect('template')
      onOpenTemplates()
    } else if (type === 'import') {
      onSelect('import')
      onImportFile()
    } else {
      onSelect('blank')
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Welcome to Menu Maker</h1>
        <p className="text-neutral-500 text-sm">How would you like to get started?</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {startOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => handleCardClick(option.type)}
            onMouseEnter={() => setHovered(option.type)}
            onMouseLeave={() => setHovered(null)}
            className={`
              relative flex flex-col items-center text-center p-6 rounded-xl border-2 transition-all duration-150
              cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
              ${
                hovered === option.type
                  ? 'border-amber-400 bg-amber-50 shadow-md -translate-y-0.5'
                  : 'border-neutral-200 bg-white hover:border-amber-300 hover:shadow-sm'
              }
            `}
          >
            <span className="text-4xl mb-3 select-none">{option.icon}</span>
            <h3 className="font-semibold text-neutral-900 text-sm mb-1.5">{option.title}</h3>
            <p className="text-neutral-500 text-xs leading-relaxed">{option.description}</p>
            <div
              className={`
                absolute inset-0 rounded-xl ring-2 ring-amber-400 pointer-events-none transition-opacity duration-150
                ${hovered === option.type ? 'opacity-100' : 'opacity-0'}
              `}
            />
          </button>
        ))}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={onSkip}
          className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Quick Customize ──────────────────────────────────

interface PresetColorDotsProps {
  preset: StylePreset
}

function PresetColorDots({ preset }: PresetColorDotsProps) {
  const colors = [
    { color: preset.colorScheme.background, label: 'background' },
    { color: preset.colorScheme.text, label: 'text' },
    { color: preset.colorScheme.accent, label: 'accent' },
    { color: preset.colorScheme.border, label: 'border' },
  ]

  return (
    <div className="flex gap-1.5 items-center">
      {colors.map(({ color, label }) => (
        <div
          key={label}
          className="w-4 h-4 rounded-full border border-black/10 shadow-sm flex-shrink-0"
          style={{ backgroundColor: color }}
          title={label}
        />
      ))}
    </div>
  )
}

interface Step2Props {
  restaurantName: string
  selectedPresetId: string | null
  onNameChange: (name: string) => void
  onPresetSelect: (id: string) => void
  onNext: () => void
}

function Step2({ restaurantName, selectedPresetId, onNameChange, onPresetSelect, onNext }: Step2Props) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Quick Customize</h2>
        <p className="text-neutral-500 text-sm">Set your restaurant name and choose a color style. You can change these anytime.</p>
      </div>

      {/* Restaurant Name Input */}
      <div className="mb-6">
        <label htmlFor="restaurant-name" className="block text-sm font-medium text-neutral-700 mb-1.5">
          Restaurant Name
        </label>
        <input
          id="restaurant-name"
          type="text"
          value={restaurantName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. The Golden Fork"
          className="
            w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900
            placeholder:text-neutral-400 bg-white
            focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
            transition-shadow
          "
          autoFocus
        />
      </div>

      {/* Style Presets Grid */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Color Style
          <span className="ml-1.5 text-neutral-400 font-normal">(optional)</span>
        </label>
        <div className="grid grid-cols-3 gap-3 max-h-52 overflow-y-auto pr-0.5">
          {stylePresets.map((preset) => {
            const isSelected = selectedPresetId === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => onPresetSelect(preset.id)}
                className={`
                  flex flex-col gap-2 p-3 rounded-lg border-2 text-left transition-all duration-100
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                  ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-amber-300 hover:shadow-sm'
                  }
                `}
              >
                <div
                  className="w-full h-10 rounded-md border border-black/5 shadow-inner"
                  style={{ backgroundColor: preset.colorScheme.background }}
                >
                  <div
                    className="h-full rounded-md flex items-center justify-center"
                    style={{ color: preset.colorScheme.text }}
                  >
                    <span
                      className="text-xs font-semibold truncate px-2"
                      style={{ color: preset.colorScheme.accent }}
                    >
                      {preset.name}
                    </span>
                  </div>
                </div>
                <PresetColorDots preset={preset} />
                <span className="text-xs text-neutral-600 font-medium leading-tight">{preset.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={onNext}
        className="
          w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700
          text-white font-semibold text-sm
          transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2
          shadow-sm
        "
      >
        Next
      </button>
    </div>
  )
}

// ── Step 3: Done ──────────────────────────────────────────────

interface Step3Props {
  restaurantName: string
  selectedPresetId: string | null
  onStartEditing: () => void
}

function Step3({ restaurantName, selectedPresetId, onStartEditing }: Step3Props) {
  const selectedPreset = selectedPresetId
    ? stylePresets.find((p) => p.id === selectedPresetId) ?? null
    : null

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Your menu is ready!</h2>
        <p className="text-neutral-500 text-sm">Here is a summary of your setup. Start editing to bring your menu to life.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 divide-y divide-neutral-200 mb-8">
        <div className="flex items-center px-5 py-4 gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Restaurant Name</p>
            <p className="text-sm font-semibold text-neutral-900 truncate">
              {restaurantName.trim() ? restaurantName : 'Not set'}
            </p>
          </div>
        </div>

        <div className="flex items-center px-5 py-4 gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Style</p>
            {selectedPreset ? (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-semibold text-neutral-900">{selectedPreset.name}</p>
                <div className="flex gap-1">
                  {[
                    selectedPreset.colorScheme.background,
                    selectedPreset.colorScheme.text,
                    selectedPreset.colorScheme.accent,
                    selectedPreset.colorScheme.border,
                  ].map((color, idx) => (
                    <div
                      key={idx}
                      className="w-3.5 h-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm font-semibold text-neutral-900">Default</p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onStartEditing}
        className="
          w-full py-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700
          text-white font-bold text-base
          transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2
          shadow-md
        "
      >
        Start Editing
      </button>
    </div>
  )
}

// ── Main Wizard ──────────────────────────────────────────────

export default function WelcomeWizard({ onComplete, onOpenTemplates, onImportFile, onSkip }: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [startType, setStartType] = useState<StartType>('blank')
  const [restaurantName, setRestaurantName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)

  function handleStartTypeSelect(type: StartType) {
    setStartType(type)
    setCurrentStep(2)
  }

  function handleNext() {
    setCurrentStep(3)
  }

  function handleStartEditing() {
    onComplete({
      restaurantName: restaurantName.trim(),
      presetId: selectedPresetId,
      startType,
    })
  }

  // Determine total visible steps
  const totalSteps = 3

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header gradient accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />

        <div className="px-8 py-8">
          {/* Step Indicator — only shown after step 1 */}
          {currentStep > 1 && (
            <StepIndicator currentStep={currentStep - 1} totalSteps={totalSteps - 1} />
          )}

          {/* Step content */}
          {currentStep === 1 && (
            <Step1
              onSelect={handleStartTypeSelect}
              onOpenTemplates={onOpenTemplates}
              onImportFile={onImportFile}
              onSkip={onSkip}
            />
          )}

          {currentStep === 2 && (
            <Step2
              restaurantName={restaurantName}
              selectedPresetId={selectedPresetId}
              onNameChange={setRestaurantName}
              onPresetSelect={(id) =>
                setSelectedPresetId((prev) => (prev === id ? null : id))
              }
              onNext={handleNext}
            />
          )}

          {currentStep === 3 && (
            <Step3
              restaurantName={restaurantName}
              selectedPresetId={selectedPresetId}
              onStartEditing={handleStartEditing}
            />
          )}
        </div>
      </div>
    </div>
  )
}
