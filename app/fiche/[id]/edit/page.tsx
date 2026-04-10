'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { FicheData } from '@/lib/types'
import WizardNavigation from '@/components/wizard/WizardNavigation'
import StepIdentite from '@/components/wizard/StepIdentite'
import StepRNCP from '@/components/wizard/StepRNCP'
import StepMatrice from '@/components/wizard/StepMatrice'
import StepContenu from '@/components/wizard/StepContenu'
import StepPreview from '@/components/wizard/StepPreview'

export default function EditFichePage() {
  const params = useParams()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<FicheData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/fiches/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(fiche => { setData(fiche); setLoading(false) })
  }, [params.id])

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>
  if (!data) return <div className="text-center py-12 text-gray-500">Fiche non trouvee.</div>

  const handleChange = (updates: Partial<FicheData>) => {
    setData(prev => prev ? { ...prev, ...updates } : prev)
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/fiches/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    router.push(`/fiche/${params.id}`)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    // Save first
    await fetch(`/api/fiches/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const res = await fetch(`/api/fiches/${params.id}/generate`, { method: 'POST' })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'fiche.docx'
      a.click()
      URL.revokeObjectURL(url)
      router.push(`/fiche/${params.id}`)
    }
    setGenerating(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <WizardNavigation
        currentStep={step}
        onStepClick={setStep}
        canAdvance={true}
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
            onSaveDraft={handleSave}
            generating={generating}
            saving={saving}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  )
}
