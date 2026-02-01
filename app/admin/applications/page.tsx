'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Image from 'next/image'

interface Application {
  id: string
  user_id: string
  user_name: string
  type: string
  status: 'pending' | 'accepted' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  review_note?: string
  [key: string]: any
}

export default function ApplicationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [reviewNote, setReviewNote] = useState('')
  const applicationsPerPage = 10

  // Rolle der begrænser adgang: har man denne rolle, kan man IKKE se/søge whitelist-ansøgninger, men kan se alle andre
  const WHITELIST_RESTRICTED_ROLE_ID = '1459894678336831552'
  const userRoleIds = (session?.user as any)?.roleIds || []
  const cannotSeeWhitelist = userRoleIds.includes(WHITELIST_RESTRICTED_ROLE_ID)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    const isAdmin = (session?.user as any)?.isAdmin || false
    if (!isAdmin) {
      router.push('/')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      loadApplications()
    }
  }, [status, session])

  // Nulstil type-filter hvis brugeren har whitelist-begrænsning og filteret er sat til whitelist
  useEffect(() => {
    if (cannotSeeWhitelist && filterType === 'whitelist') {
      setFilterType('')
    }
  }, [cannotSeeWhitelist, filterType])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/applications')
      const result = await response.json()

      if (result.success) {
        setApplications(result.applications || [])
        setFilteredApplications(result.applications || [])
      } else {
        console.error('Error loading applications:', result.error)
        setApplications([])
        setFilteredApplications([])
      }
    } catch (error) {
      console.error('Error loading applications:', error)
      setApplications([])
      setFilteredApplications([])
    } finally {
      setLoading(false)
    }
  }

  // Filter applications
  useEffect(() => {
    let filtered = applications

    // Hvis brugeren har whitelist-begrænsende rolle: udeluk whitelist-ansøgninger helt
    if (cannotSeeWhitelist) {
      filtered = filtered.filter((app) => app.type !== 'whitelist')
    }

    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter((app) => app.status === filterStatus)
    }

    // Filter by type
    if (filterType) {
      filtered = filtered.filter((app) => app.type === filterType)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((app) => {
        const userName = (app.user_name || '').toLowerCase()
        const userId = (app.user_id || '').toLowerCase()
        const type = (app.type || '').toLowerCase()
        return userName.includes(query) || userId.includes(query) || type.includes(query)
      })
    }

    setFilteredApplications(filtered)
    setCurrentPage(1)
  }, [searchQuery, filterStatus, filterType, applications, cannotSeeWhitelist])

  // Get unique types for filter (udelad whitelist hvis brugeren ikke må se dem)
  const uniqueTypes = Array.from(
    new Set(
      applications
        .filter((app) => !cannotSeeWhitelist || app.type !== 'whitelist')
        .map((app) => app.type)
    )
  ).sort()

  // Calculate pagination
  const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage)
  const startIndex = (currentPage - 1) * applicationsPerPage
  const endIndex = startIndex + applicationsPerPage
  const currentApplications = filteredApplications.slice(startIndex, endIndex)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-400 bg-green-400/10 border-green-400/30'
      case 'rejected':
        return 'text-red-400 bg-red-400/10 border-red-400/30'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      default:
        return 'text-chrome-gray-400 bg-chrome-gray-400/10 border-chrome-gray-400/30'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Accepteret'
      case 'rejected':
        return 'Afvist'
      case 'pending':
        return 'Afventer'
      default:
        return status
    }
  }

  const getTypeText = (type: string) => {
    const types: Record<string, string> = {
      whitelist: 'Whitelist',
      staff: 'Staff',
      politi: 'Politi',
      firma: 'Firma',
      bande: 'Bande',
    }
    return types[type] || type
  }

  // Get relevant fields for each application type
  const getRelevantFields = (type: string): string[] => {
    const commonFields = ['navn', 'alder', 'discord', 'erfaring', 'motivation']
    
    const typeSpecificFields: Record<string, string[]> = {
      whitelist: ['rpErfaring', 'hvorfor'],
      staff: ['tidligereStaff', 'hvorforStaff', 'hvadKanDu', 'tilgængelighed'],
      politi: ['tidligerePoliti', 'hvorforPoliti', 'hvadKanDuPoliti', 'tilgængelighedPoliti'],
      firma: ['firmaNavn', 'firmaType', 'medlemmer', 'firmaKoncept', 'lokation', 'hvorforFirma'],
      bande: ['bandeNavn', 'bandeType', 'medlemmerBande', 'bandeKoncept', 'territorium', 'hvorforBande'],
    }

    return [...commonFields, ...(typeSpecificFields[type] || [])]
  }

  // Format field name for display
  const formatFieldName = (key: string): string => {
    const fieldNames: Record<string, string> = {
      navn: 'Navn',
      alder: 'Alder',
      discord: 'Discord',
      erfaring: 'Erfaring',
      motivation: 'Motivation',
      rpErfaring: 'RP Erfaring',
      hvorfor: 'Hvorfor',
      tidligereStaff: 'Tidligere Staff',
      hvorforStaff: 'Hvorfor Staff',
      hvadKanDu: 'Hvad Kan Du',
      tilgængelighed: 'Tilgængelighed',
      tidligerePoliti: 'Tidligere Politi',
      hvorforPoliti: 'Hvorfor Politi',
      hvadKanDuPoliti: 'Hvad Kan Du (Politi)',
      tilgængelighedPoliti: 'Tilgængelighed (Politi)',
      firmaNavn: 'Firma Navn',
      firmaType: 'Firma Type',
      medlemmer: 'Medlemmer',
      firmaKoncept: 'Firma Koncept',
      lokation: 'Lokation',
      hvorforFirma: 'Hvorfor Firma',
      bandeNavn: 'Bande Navn',
      bandeType: 'Bande Type',
      medlemmerBande: 'Medlemmer',
      bandeKoncept: 'Bande Koncept',
      territorium: 'Territorium',
      hvorforBande: 'Hvorfor Bande',
    }
    return fieldNames[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
  }

  const handleReview = async (applicationId: string, newStatus: 'accepted' | 'rejected', requiresInterview?: boolean) => {
    try {
      const response = await fetch('/api/applications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: applicationId,
          status: newStatus,
          reviewNote: reviewNote || undefined,
          requiresInterview: requiresInterview !== undefined ? requiresInterview : undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await loadApplications()
        setSelectedApplication(null)
        setReviewNote('')
        if (newStatus === 'accepted' && requiresInterview !== undefined) {
          alert(`Ansøgning accepteret ${requiresInterview ? 'med samtale' : 'uden samtale'}`)
        } else {
          alert(`Ansøgning ${newStatus === 'accepted' ? 'accepteret' : 'afvist'}`)
        }
      } else {
        alert('Fejl ved opdatering af ansøgning: ' + result.error)
      }
    } catch (error) {
      console.error('Error reviewing application:', error)
      alert('Der opstod en fejl ved opdatering af ansøgningen')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  const isAdmin = (session?.user as any)?.isAdmin || false
  if (!isAdmin || !session) {
    return null
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
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

        <main className="relative pt-32 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <Link
                  href="/admin"
                  className="text-chrome-gray-400 hover:text-white transition mb-2 inline-block"
                >
                  ← Tilbage til Admin Panel
                </Link>
                <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
                  Ansøgninger
                </h1>
                <p className="text-lg text-chrome-gray-300">
                  Gennemse og administrer alle ansøgninger
                  {cannotSeeWhitelist && (
                    <span className="block mt-1 text-sm text-chrome-gray-400">
                      (Whitelist-ansøgninger er ikke tilgængelige for din rolle)
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={loadApplications}
                className="px-4 py-2 bg-chrome-gray-700 hover:bg-chrome-gray-600 text-white rounded-lg transition-colors font-semibold"
              >
                Opdater
              </button>
            </div>

            {/* Filters */}
            <div className="bg-chrome-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-chrome-gray-700/50 shadow-lg shadow-chrome-gray-900/50 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm text-chrome-gray-400 mb-2">Søg</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Søg efter bruger eller type..."
                    className="w-full px-4 py-2 bg-chrome-gray-900/50 border border-chrome-gray-700/50 rounded-lg text-white placeholder-chrome-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm text-chrome-gray-400 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-chrome-gray-900/50 border border-chrome-gray-700/50 rounded-lg text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                  >
                    <option value="">Alle statusser</option>
                    <option value="pending">Afventer</option>
                    <option value="accepted">Accepteret</option>
                    <option value="rejected">Afvist</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm text-chrome-gray-400 mb-2">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-4 py-2 bg-chrome-gray-900/50 border border-chrome-gray-700/50 rounded-lg text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                  >
                    <option value="">Alle typer</option>
                    {uniqueTypes.map((type) => (
                      <option key={type} value={type}>
                        {getTypeText(type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 flex items-center justify-between text-sm text-chrome-gray-400">
                <div>
                  Viser {startIndex + 1}-{Math.min(endIndex, filteredApplications.length)} af{' '}
                  {filteredApplications.length} ansøgninger
                </div>
                {(filterStatus || filterType || searchQuery) && (
                  <button
                    onClick={() => {
                      setFilterStatus('')
                      setFilterType('')
                      setSearchQuery('')
                    }}
                    className="text-gray-400 hover:text-white transition"
                  >
                    Ryd filtre
                  </button>
                )}
              </div>
            </div>

            {/* Applications List */}
            <div className="bg-chrome-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-chrome-gray-700/50 shadow-lg shadow-chrome-gray-900/50">
              {currentApplications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-chrome-gray-400">
                    {searchQuery || filterStatus || filterType ? 'Ingen ansøgninger fundet' : 'Ingen ansøgninger endnu'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-chrome-gray-900/50 rounded-lg p-4 border border-chrome-gray-700/50 hover:border-yellow-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span
                              className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(
                                app.status
                              )}`}
                            >
                              {getStatusText(app.status)}
                            </span>
                            <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-blue-400/10 border border-blue-400/30 text-blue-400">
                              {getTypeText(app.type)}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-1">{app.user_name}</h3>
                          <p className="text-sm text-chrome-gray-400 mb-2">User ID: {app.user_id}</p>
                          <p className="text-sm text-chrome-gray-300">
                            Indsendt: {new Date(app.submitted_at).toLocaleString('da-DK')}
                          </p>
                          {app.reviewed_at && (
                            <p className="text-sm text-chrome-gray-300">
                              Gennemgået: {new Date(app.reviewed_at).toLocaleString('da-DK')} af {app.reviewed_by}
                            </p>
                          )}
                          {app.review_note && (
                            <p className="text-sm text-chrome-gray-300 mt-1 italic">Note: {app.review_note}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedApplication(app)}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-semibold"
                          >
                            Se Detaljer
                          </button>
                          {app.status === 'pending' && (
                            <>
                              {app.type === 'whitelist' ? (
                                <>
                                  <button
                                    onClick={() => handleReview(app.id, 'accepted', true)}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold"
                                    title="Godkend med samtale"
                                  >
                                    Indkald til samtale
                                  </button>
                                  <button
                                    onClick={() => handleReview(app.id, 'accepted', false)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
                                    title="Godkend uden samtale"
                                  >
                                    Godkend
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleReview(app.id, 'accepted')}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold"
                                >
                                  Accepter
                                </button>
                              )}
                              <button
                                onClick={() => handleReview(app.id, 'rejected')}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold"
                              >
                                Afvis
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-chrome-gray-700 hover:bg-chrome-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Forrige
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-yellow-600 text-white'
                                : 'bg-chrome-gray-700 hover:bg-chrome-gray-600 text-white'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-chrome-gray-400">...</span>
                      }
                      return null
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-chrome-gray-700 hover:bg-chrome-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Næste
                  </button>
                </div>
              )}
            </div>

            {/* Application Details Modal */}
            {selectedApplication && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-chrome-gray-800 rounded-2xl p-6 border border-chrome-gray-700/50 shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Ansøgningsdetaljer</h2>
                    <button
                      onClick={() => {
                        setSelectedApplication(null)
                        setReviewNote('')
                      }}
                      className="text-chrome-gray-400 hover:text-white transition"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Bruger Information</h3>
                      <p className="text-chrome-gray-300">Navn: {selectedApplication.user_name}</p>
                      <p className="text-chrome-gray-300">User ID: {selectedApplication.user_id}</p>
                      <p className="text-chrome-gray-300">Type: {getTypeText(selectedApplication.type)}</p>
                      <p className="text-chrome-gray-300">
                        Status:{' '}
                        <span className={`px-2 py-1 rounded ${getStatusColor(selectedApplication.status)}`}>
                          {getStatusText(selectedApplication.status)}
                        </span>
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Tidsstempler</h3>
                      <p className="text-chrome-gray-300">
                        Indsendt: {new Date(selectedApplication.submitted_at).toLocaleString('da-DK')}
                      </p>
                      {selectedApplication.reviewed_at && (
                        <p className="text-chrome-gray-300">
                          Gennemgået: {new Date(selectedApplication.reviewed_at).toLocaleString('da-DK')} af{' '}
                          {selectedApplication.reviewed_by}
                        </p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Ansøgningsdata</h3>
                      <div className="bg-chrome-gray-900/50 rounded-lg p-4 space-y-2">
                        {getRelevantFields(selectedApplication.type)
                          .filter((key) => selectedApplication[key] !== undefined && selectedApplication[key] !== null && selectedApplication[key] !== '')
                          .map((key) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-chrome-gray-400">{formatFieldName(key)}:</span>
                              <span className="text-white text-right max-w-md break-words">{String(selectedApplication[key])}</span>
                            </div>
                          ))}
                        {getRelevantFields(selectedApplication.type).filter((key) => selectedApplication[key] !== undefined && selectedApplication[key] !== null && selectedApplication[key] !== '').length === 0 && (
                          <p className="text-chrome-gray-400 text-center py-2">Ingen ansøgningsdata tilgængelig</p>
                        )}
                      </div>
                    </div>

                    {selectedApplication.status === 'pending' && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Gennemgåelse</h3>
                        <textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Tilføj en note (valgfrit)..."
                          className="w-full px-3 py-2 bg-chrome-gray-900/50 border border-chrome-gray-700/50 rounded-lg text-white resize-none mb-3"
                          rows={3}
                        />
                        <div className="flex space-x-2">
                          {selectedApplication.type === 'whitelist' ? (
                            <>
                              <button
                                onClick={() => handleReview(selectedApplication.id, 'accepted', true)}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                              >
                                Godkend med Samtale
                              </button>
                              <button
                                onClick={() => handleReview(selectedApplication.id, 'accepted', false)}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                              >
                                Godkend uden Samtale
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleReview(selectedApplication.id, 'accepted')}
                              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                            >
                              Accepter
                            </button>
                          )}
                          <button
                            onClick={() => handleReview(selectedApplication.id, 'rejected')}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                          >
                            Afvis
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedApplication.review_note && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Gennemgangsnote</h3>
                        <p className="text-chrome-gray-300 italic">{selectedApplication.review_note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
