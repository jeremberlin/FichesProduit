'use client'

const steps = [
  { num: 1, label: 'Identite' },
  { num: 2, label: 'RNCP' },
  { num: 3, label: 'Programme' },
  { num: 4, label: 'Contenu' },
  { num: 5, label: 'Apercu' },
]

interface WizardNavigationProps {
  currentStep: number
  onStepClick: (step: number) => void
  canAdvance: boolean
  onNext: () => void
  onPrev: () => void
}

export default function WizardNavigation({ currentStep, onStepClick, canAdvance, onNext, onPrev }: WizardNavigationProps) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, idx) => (
          <div key={step.num} className="flex items-center flex-1">
            <button
              onClick={() => onStepClick(step.num)}
              className={`flex items-center gap-2 ${
                currentStep === step.num
                  ? 'text-galileo-blue'
                  : currentStep > step.num
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium border-2 ${
                currentStep === step.num
                  ? 'border-galileo-blue bg-galileo-light text-galileo-blue'
                  : currentStep > step.num
                  ? 'border-green-500 bg-green-50 text-green-600'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {currentStep > step.num ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : step.num}
              </span>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${currentStep > step.num ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Nav buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          disabled={currentStep === 1}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Precedent
        </button>
        {currentStep < 5 ? (
          <button
            onClick={onNext}
            disabled={!canAdvance}
            className="px-4 py-2 text-sm font-medium text-white bg-galileo-blue rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        ) : null}
      </div>
    </div>
  )
}
