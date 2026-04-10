'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FicheData } from '@/lib/types'
import { createEmptyFiche } from '@/lib/types'
import WizardNavigation from '@/components/wizard/WizardNavigation'
import StepIdentite from '@/components/wizard/StepIdentite'
import StepRNCP from '@/components/wizard/StepRNCP'
import StepMatrice from '@/components/wizard/StepMatrice'
import StepContenu from '@/components/wizard/StepContenu'
import StepPreview from '@/components/wizard/StepPreview'

export default function NouvelleFichePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<FicheData>>(createEmptyFiche())
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = (updates: Partial<FicheData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const canAdvance = () => {
    if (step === 1) return !!(data.intitule && data.ecole)
    return true
  }

  const saveFiche = async (): Promise<string | null> => {
    const res = await fetch('/api/fiches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const fiche = await res.json()
      return fiche.id
    }
    return null
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    const id = await saveFiche()
    setSaving(false)
    if (id) router.push(`/fiche/${id}`)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    const id = await saveFiche()
    if (!id) { setGenerating(false); return }

    try {
      const res = await fetch(`/api/fiches/${id}/generate`, { method: 'POST' })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const disposition = res.headers.get('Content-Disposition') || ''
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
        a.download = filenameMatch ? filenameMatch[1] : 'fiche.docx'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        // Laisser le temps au navigateur de démarrer le téléchargement
        setTimeout(() => {
          URL.revokeObjectURL(url)
          router.push(`/fiche/${id}`)
        }, 1000)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Erreur lors de la generation')
      }
    } catch {
      alert('Erreur lors de la generation du document')
    }
    setGenerating(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <WizardNavigation
        currentStep={step}
        onStepClick={setStep}
        canAdvance={canAdvance()}
        onNext={() => setStep(s => Math.min(s + 1, 5))}
        onPrev={() => setStep(s => Math.max(s - 1, 1))}
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {step === 1 && <StepIdentite data={data} onChange={handleChange} />}
        {step === 2 && <StepRNCP data={data} onChange={handleChange} />}
        {step === 3 && <StepMatrice data={data} onChange={handleChange} />}
        {step === 4 && <StepContenu data={data} onChange={handleChange} />}
        {step === 5 && (
          <StepPreview
            data={data}
            onGenerate={handleGenerate}
            onSaveDraft={handleSaveDraft}
            generating={generating}
            saving={saving}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  )
}
