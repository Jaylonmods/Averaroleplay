'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Navigation from '@/components/Navigation'
import Image from 'next/image'

type ApplicationType = 'whitelist' | 'staff' | 'firma' | 'bande' | 'politi' | null

export default function Ansogninger() {
  const { data: session } = useSession()
  const [selectedApplication, setSelectedApplication] = useState<ApplicationType>(null)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [formData, setFormData] = useState({
    navn: '',
    alder: '',
    discord: '',
    erfaring: '',
    motivation: '',
    // Staff specifikke felter
    tidligereStaff: '',
    hvorforStaff: '',
    hvadKanDu: '',
    tilgængelighed: '',
    // Whitelist specifikke felter
    rpErfaring: '',
    hvorfor: '',
    // Politi specifikke felter
    tidligerePoliti: '',
    hvorforPoliti: '',
    hvadKanDuPoliti: '',
    tilgængelighedPoliti: '',
    // Firma specifikke felter
    firmaNavn: '',
    firmaType: '',
    medlemmer: '',
    firmaKoncept: '',
    lokation: '',
    hvorforFirma: '',
    // Bande specifikke felter
    bandeNavn: '',
    bandeType: '',
    medlemmerBande: '',
    bandeKoncept: '',
    territorium: '',
    hvorforBande: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [userRoleIds, setUserRoleIds] = useState<string[]>([])

  // Hent friske roller fra Discord (session har kun roller fra login-tidspunkt)
  useEffect(() => {
    if (!session?.user) {
      setUserRoleIds([])
      return
    }
    // Brug session som fallback mens vi henter
    setUserRoleIds((session.user as any)?.roleIds || [])
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/auth/roles')
        const data = await res.json()
        if (data.success && Array.isArray(data.roleIds)) {
          setUserRoleIds(data.roleIds)
        } else {
          setUserRoleIds((session.user as any)?.roleIds || [])
        }
      } catch {
        setUserRoleIds((session.user as any)?.roleIds || [])
      }
    }
    fetchRoles()
  }, [session])

  useEffect(() => {
    if (session?.user) {
      const roles = (session.user as any).roles || []
      setUserRoles(roles)
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user?.id) return
    
    const applicationData = {
      id: Date.now().toString(),
      userId: session.user.id,
      userName: session.user.name || 'Unknown',
      type: selectedApplication,
      status: 'pending' as const,
      submittedAt: new Date().toISOString(),
      ...formData,
    }
    
    try {
      // Gem ansøgning i database via API
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      })

      const result = await response.json()

      if (!result.success) {
        console.error('Error saving application:', result.error)
        alert('Der opstod en fejl ved indsendelse af ansøgningen. Prøv igen.')
        return
      }

      // Opret log entry
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'application_submitted',
          userId: session.user.id,
          userName: session.user.name,
          details: `Ansøgning af type ${selectedApplication} indsendt`,
        }),
      })
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Der opstod en fejl ved indsendelse af ansøgningen. Prøv igen.')
      return
    }
    
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setSelectedApplication(null)
      setFormData({
        navn: '',
        alder: '',
        discord: '',
        erfaring: '',
        motivation: '',
        tidligereStaff: '',
        hvorforStaff: '',
        hvadKanDu: '',
        tilgængelighed: '',
        rpErfaring: '',
        hvorfor: '',
        tidligerePoliti: '',
        hvorforPoliti: '',
        hvadKanDuPoliti: '',
        tilgængelighedPoliti: '',
        firmaNavn: '',
        firmaType: '',
        medlemmer: '',
        firmaKoncept: '',
        lokation: '',
        hvorforFirma: '',
        bandeNavn: '',
        bandeType: '',
        medlemmerBande: '',
        bandeKoncept: '',
        territorium: '',
        hvorforBande: '',
      })
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  // Mapping mellem Discord roller og ansøgningstyper
  const roleToApplicationMap: Record<string, ApplicationType> = {
    'Politi': 'politi',
    'Firma': 'firma',
    'Bande': 'bande',
    'Staff': 'staff',
    'Admin': 'staff',
  }

  const allApplications = [
    {
      id: 'whitelist' as ApplicationType,
      title: 'WHITELIST',
      description: 'Ansøg om whitelist for at få adgang til serveren',
      requiresWhitelist: false,
      available: true,
      requiredRole: null,
      image: '/billed/whitelist.png',
    },
    {
      id: 'staff' as ApplicationType,
      title: 'STAFF',
      description: 'Ansøg om at blive en del af staff-teamet',
      requiresWhitelist: true,
      available: false,
      image: '/billed/staff.png',
    },
    {
      id: 'firma' as ApplicationType,
      title: 'FIRMA',
      description: 'Ansøg om at starte et firma på serveren',
      requiresWhitelist: true,
      available: false,
      image: '/billed/firma.png',
    },
    {
      id: 'bande' as ApplicationType,
      title: 'BANDE',
      description: 'Ansøg om at oprette en bande',
      requiresWhitelist: true,
      available: false,
      image: '/billed/bande.png',
    },
    {
      id: 'politi' as ApplicationType,
      title: 'POLITI',
      description: 'Ansøg om at blive politi',
      requiresWhitelist: true,
      available: false,
      image: '/billed/politi.png',
    },
  ]

  // Whitelist role ID (samme som i admin/unban) – man skal have denne for at ansøge til staff/firma/bande/politi
  const WHITELIST_ROLE_ID = '1459894678336831552'

  const hasWhitelistRole = userRoleIds.includes(WHITELIST_ROLE_ID)
  
  // Vis alle ansøgninger, men tjek om brugeren har whitelist rolle
  const applications = allApplications.map((app) => {
    if (app.id === 'whitelist') {
      return { ...app, available: !hasWhitelistRole, hasWhitelist: hasWhitelistRole }
    }
    return { ...app, available: hasWhitelistRole }
  })

  if (selectedApplication && !submitted) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <Image
            src="/billed/billed1.png"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-chrome-gray-900/60 via-chrome-gray-900/50 to-chrome-gray-900/60"></div>
        </div>

        <div className="relative z-10">
          <Navigation />

          <main className="relative pt-16 pb-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-chrome-gray-800/80 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-chrome-gray-700/50 shadow-lg shadow-chrome-gray-900/50">
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="mb-6 text-chrome-gray-400 hover:text-white transition-colors"
                >
                  ← Tilbage
                </button>
                <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-chrome-gray-100 via-white to-chrome-gray-200 bg-clip-text text-transparent text-center">
                  Ansøg om {applications.find(a => a.id === selectedApplication)?.title}
                </h1>

                {!session && (
                  <div className="mb-8 p-6 bg-chrome-gray-700/50 border border-chrome-gray-600/50 rounded-lg">
                    <p className="text-chrome-gray-300 text-center">
                      Du skal være logget ind med Discord for at indsende en ansøgning.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {selectedApplication === 'staff' ? (
                    <>
                      <div>
                        <label htmlFor="discord" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Discord Navn *
                        </label>
                        <input
                          type="text"
                          id="discord"
                          name="discord"
                          required
                          value={formData.discord}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Dit Discord navn"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="alder" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Alder *
                        </label>
                        <input
                          type="number"
                          id="alder"
                          name="alder"
                          required
                          min="18"
                          value={formData.alder}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Din alder"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="tidligereStaff" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Har du tidligere erfaring med staff? *
                        </label>
                        <textarea
                          id="tidligereStaff"
                          name="tidligereStaff"
                          required
                          rows={4}
                          value={formData.tidligereStaff}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv din tidligere erfaring med staff..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="hvorforStaff" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvorfor vil du være staff? *
                        </label>
                        <textarea
                          id="hvorforStaff"
                          name="hvorforStaff"
                          required
                          rows={6}
                          value={formData.hvorforStaff}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Forklar hvorfor du gerne vil være staff..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="hvadKanDu" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvad kan du bidrage med som staff? *
                        </label>
                        <textarea
                          id="hvadKanDu"
                          name="hvadKanDu"
                          required
                          rows={6}
                          value={formData.hvadKanDu}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv hvad du kan bidrage med som staff..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="tilgængelighed" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvor meget tid kan du bruge på serveren? *
                        </label>
                        <textarea
                          id="tilgængelighed"
                          name="tilgængelighed"
                          required
                          rows={4}
                          value={formData.tilgængelighed}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv hvor meget tid du kan bruge på serveren..."
                          disabled={!session}
                        />
                      </div>
                    </>
                  ) : selectedApplication === 'whitelist' ? (
                    <>
                      <div>
                        <label htmlFor="alder" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Alder *
                        </label>
                        <input
                          type="number"
                          id="alder"
                          name="alder"
                          required
                          min="18"
                          value={formData.alder}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Din alder"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="rpErfaring" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          RP Erfaring *
                        </label>
                        <textarea
                          id="rpErfaring"
                          name="rpErfaring"
                          required
                          rows={4}
                          value={formData.rpErfaring}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv din RP erfaring..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="hvorfor" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvorfor vil du whitelistes? *
                        </label>
                        <textarea
                          id="hvorfor"
                          name="hvorfor"
                          required
                          rows={6}
                          value={formData.hvorfor}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Forklar hvorfor du gerne vil whitelistes..."
                          disabled={!session}
                        />
                      </div>
                    </>
                  ) : selectedApplication === 'politi' ? (
                    <>
                      <div>
                        <label htmlFor="discord" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Discord Navn *
                        </label>
                        <input
                          type="text"
                          id="discord"
                          name="discord"
                          required
                          value={formData.discord}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Dit Discord navn"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="alder" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Alder *
                        </label>
                        <input
                          type="number"
                          id="alder"
                          name="alder"
                          required
                          min="18"
                          value={formData.alder}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Din alder"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="tidligerePoliti" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Har du tidligere erfaring som politi? *
                        </label>
                        <textarea
                          id="tidligerePoliti"
                          name="tidligerePoliti"
                          required
                          rows={4}
                          value={formData.tidligerePoliti}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv din tidligere erfaring som politi..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="hvorforPoliti" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvorfor vil du være politi? *
                        </label>
                        <textarea
                          id="hvorforPoliti"
                          name="hvorforPoliti"
                          required
                          rows={6}
                          value={formData.hvorforPoliti}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Forklar hvorfor du gerne vil være politi..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="hvadKanDuPoliti" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvad kan du bidrage med som politi? *
                        </label>
                        <textarea
                          id="hvadKanDuPoliti"
                          name="hvadKanDuPoliti"
                          required
                          rows={6}
                          value={formData.hvadKanDuPoliti}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv hvad du kan bidrage med som politi..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="tilgængelighedPoliti" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvor meget tid kan du bruge på serveren? *
                        </label>
                        <textarea
                          id="tilgængelighedPoliti"
                          name="tilgængelighedPoliti"
                          required
                          rows={4}
                          value={formData.tilgængelighedPoliti}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv hvor meget tid du kan bruge på serveren..."
                          disabled={!session}
                        />
                      </div>
                    </>
                  ) : selectedApplication === 'firma' ? (
                    <>
                      <div>
                        <label htmlFor="firmaNavn" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Firma Navn *
                        </label>
                        <input
                          type="text"
                          id="firmaNavn"
                          name="firmaNavn"
                          required
                          value={formData.firmaNavn}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Dit firma navn"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="firmaType" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvilken type firma? *
                        </label>
                        <input
                          type="text"
                          id="firmaType"
                          name="firmaType"
                          required
                          value={formData.firmaType}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="fx. Mekaniker, Restaurant, etc."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="medlemmer" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvor mange medlemmer vil firmaet have? *
                        </label>
                        <input
                          type="number"
                          id="medlemmer"
                          name="medlemmer"
                          required
                          min="1"
                          value={formData.medlemmer}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Antal medlemmer"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="firmaKoncept" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Beskriv dit firma koncept *
                        </label>
                        <textarea
                          id="firmaKoncept"
                          name="firmaKoncept"
                          required
                          rows={6}
                          value={formData.firmaKoncept}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv dit firma koncept..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="lokation" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvor vil firmaet ligge? (fx. adresse eller område) *
                        </label>
                        <textarea
                          id="lokation"
                          name="lokation"
                          required
                          rows={3}
                          value={formData.lokation}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv hvor firmaet skal ligge..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="hvorforFirma" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvorfor skal dit firma blive godkendt? *
                        </label>
                        <textarea
                          id="hvorforFirma"
                          name="hvorforFirma"
                          required
                          rows={6}
                          value={formData.hvorforFirma}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Forklar hvorfor dit firma skal blive godkendt..."
                          disabled={!session}
                        />
                      </div>
                    </>
                  ) : selectedApplication === 'bande' ? (
                    <>
                      <div>
                        <label htmlFor="bandeNavn" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Bande Navn *
                        </label>
                        <input
                          type="text"
                          id="bandeNavn"
                          name="bandeNavn"
                          required
                          value={formData.bandeNavn}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Dit bande navn"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="bandeType" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvilken type bande? *
                        </label>
                        <input
                          type="text"
                          id="bandeType"
                          name="bandeType"
                          required
                          value={formData.bandeType}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="fx. Kartel, MC Klub, etc."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="medlemmerBande" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvor mange medlemmer vil banden have? *
                        </label>
                        <input
                          type="number"
                          id="medlemmerBande"
                          name="medlemmerBande"
                          required
                          min="1"
                          value={formData.medlemmerBande}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent"
                          placeholder="Antal medlemmer"
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="bandeKoncept" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Beskriv dit bande koncept og historie *
                        </label>
                        <textarea
                          id="bandeKoncept"
                          name="bandeKoncept"
                          required
                          rows={6}
                          value={formData.bandeKoncept}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv dit bande koncept og historie..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="territorium" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvilket territorium vil banden operere i? *
                        </label>
                        <textarea
                          id="territorium"
                          name="territorium"
                          required
                          rows={3}
                          value={formData.territorium}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Beskriv hvilket territorium banden vil operere i..."
                          disabled={!session}
                        />
                      </div>

                      <div>
                        <label htmlFor="hvorforBande" className="block text-sm font-medium text-chrome-gray-300 mb-2">
                          Hvorfor skal din bande blive godkendt? *
                        </label>
                        <textarea
                          id="hvorforBande"
                          name="hvorforBande"
                          required
                          rows={6}
                          value={formData.hvorforBande}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-chrome-gray-900/80 border border-chrome-gray-700 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:ring-2 focus:ring-chrome-gray-500 focus:border-transparent resize-none"
                          placeholder="Forklar hvorfor din bande skal blive godkendt..."
                          disabled={!session}
                        />
                      </div>
                    </>
                  ) : null}

                <button
                  type="submit"
                  disabled={!session}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-base transition-all ${
                    session
                      ? 'bg-gradient-to-br from-chrome-gray-500 to-chrome-gray-700 hover:from-chrome-gray-400 hover:to-chrome-gray-600 text-white cursor-pointer shadow-lg shadow-chrome-gray-900/50'
                      : 'bg-chrome-gray-700 text-chrome-gray-400 cursor-not-allowed'
                  }`}
                >
                  Indsend ansøgning
                </button>
              </form>
            </div>
          </div>
        </main>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <Image
            src="/billed/billed1.png"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-chrome-gray-900/60 via-chrome-gray-900/50 to-chrome-gray-900/60"></div>
        </div>

        <div className="relative z-10">
          <Navigation />

          <main className="relative pt-16 pb-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-chrome-gray-800/80 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-chrome-gray-700/50 shadow-lg shadow-chrome-gray-900/50 text-center">
                <h2 className="text-3xl font-bold text-green-400 mb-4">Tak for din ansøgning!</h2>
                <p className="text-chrome-gray-300 mb-6">
                  Din ansøgning er blevet indsendt. Vi gennemgår den og vender tilbage til dig så hurtigt som muligt.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setSelectedApplication(null)
                  }}
                  className="px-6 py-3 bg-gradient-to-br from-chrome-gray-500 to-chrome-gray-700 hover:from-chrome-gray-400 hover:to-chrome-gray-600 text-white rounded-lg font-semibold transition-all shadow-lg shadow-chrome-gray-900/50"
                >
                  Tilbage til ansøgninger
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0">
        <Image
          src="/billed/billed1.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-chrome-gray-900/60 via-chrome-gray-900/50 to-chrome-gray-900/60"></div>
      </div>

      <div className="relative z-10">
        <Navigation />

        <main className="relative pt-16 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-chrome-gray-100 via-white to-chrome-gray-200 bg-clip-text text-transparent">ANSØGNINGER</h1>
              <p className="text-lg text-chrome-gray-300 max-w-4xl mx-auto">
                Her på Avera har du mulighed for at blive en del af et levende og ambitiøst roleplay fællesskab. 
                Uanset om du drømmer om at være betjent, EMS, mekaniker, virksomhedsejer – eller noget helt andet – 
                så har du chancen for at forme din egen historie. Vi værdsætter kvalitet, performance og ansvarlig frihed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-gradient-to-br from-chrome-gray-700/90 via-chrome-gray-800/90 to-chrome-gray-700/90 backdrop-blur-sm rounded-xl border border-chrome-gray-500/40 overflow-hidden hover:border-chrome-gray-400/60 transition-all flex flex-col shadow-xl shadow-chrome-gray-900/50 relative before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:via-transparent before:to-transparent before:pointer-events-none"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={app.image}
                      alt={app.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20"></div>
                  </div>
                  <div className="p-4 flex flex-col h-full min-h-[160px]">
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-white mb-1">{app.title}</h3>
                      {app.requiresWhitelist && !hasWhitelistRole && (
                        <p className="text-sm text-orange-400 mb-1">Kræver whitelist</p>
                      )}
                      {(app as any).hasWhitelist && (
                        <p className="text-sm text-green-400 mb-1">Du har allerede whitelist</p>
                      )}
                      <p className="text-sm text-chrome-gray-300 mb-2">{app.description}</p>
                    </div>
                    <div className="mt-2">
                      {app.available ? (
                        <button
                          onClick={() => {
                            if (!session) {
                              window.location.href = '/api/auth/signin/discord'
                            } else {
                              setSelectedApplication(app.id)
                            }
                          }}
                          className="w-full py-2 px-4 bg-gradient-to-br from-chrome-gray-500 to-chrome-gray-700 hover:from-chrome-gray-400 hover:to-chrome-gray-600 text-white rounded-lg font-semibold transition-all text-sm shadow-md shadow-chrome-gray-900/30"
                        >
                          Ansøg Nu
                        </button>
                      ) : app.id === 'whitelist' && (app as any).hasWhitelist ? (
                        <button
                          disabled
                          className="w-full py-2 px-4 bg-chrome-gray-700 text-chrome-gray-500 rounded-lg font-semibold text-sm cursor-not-allowed"
                        >
                          Du har allerede whitelist
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 px-4 bg-chrome-gray-700 text-chrome-gray-500 rounded-lg font-semibold text-sm cursor-not-allowed"
                        >
                          Kræver whitelist
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
