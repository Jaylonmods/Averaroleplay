'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Image from 'next/image'
import Link from 'next/link'

type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
type TabType = 'profil' | 'ansogninger' | 'trustscore'

interface Application {
  id: string
  type: string
  status: ApplicationStatus
  submittedAt: string
  reviewedAt?: string
}

interface Warning {
  id: string
  reason: string
  note?: string
  issuedAt: string
  issuedBy: string
  severity: 'low' | 'medium' | 'high'
  removedAt?: string
  removedBy?: string
  removalReason?: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('profil')
  const [trustScore, setTrustScore] = useState(100)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [isBanned, setIsBanned] = useState(false)
  const [discordRoles, setDiscordRoles] = useState<{ id: string; name: string }[]>([])
  const BAN_ROLE_ID = '1459894685051916448'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  const loadApplications = async () => {
    const userId = (session?.user as any)?.id
    if (!userId) return

    try {
      const response = await fetch(`/api/applications?userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        const userApplications: Application[] = result.applications
          .filter((app: any) => app.user_id === userId)
          .map((app: any) => ({
            id: app.id,
            type: app.type,
            status: app.status,
            submittedAt: app.submitted_at,
            reviewedAt: app.reviewed_at,
          }))
        setApplications(userApplications)
      }
    } catch (error) {
      console.error('Error loading applications:', error)
    }
  }

  useEffect(() => {
    const userId = (session?.user as any)?.id
    if (userId) {
      loadApplications()
      loadTrustData()
    }
  }, [session])

  useEffect(() => {
    if (!session?.user) {
      setDiscordRoles([])
      return
    }
    fetch('/api/auth/roles?withNames=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.roles)) {
          setDiscordRoles(data.roles)
        }
      })
      .catch(() => setDiscordRoles([]))
  }, [session])

  const loadTrustData = async () => {
    const userId = (session?.user as any)?.id
    if (!userId) return

    try {
      // Check session roles first
      const userRoles = (session?.user as any)?.roleIds || []
      const userHasBanRoleFromSession = userRoles.includes(BAN_ROLE_ID)

      const response = await fetch(`/api/trust?userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        const score = result.trustScore || 100
        // User is banned if they have ban role OR if trust score is 0 (was set when banned)
        const banned = userHasBanRoleFromSession || score === 0
        setIsBanned(banned)
        setTrustScore(banned ? 0 : score)
        // Filter out removed warnings
        const activeWarnings = (result.warnings || []).filter((w: Warning) => !w.removedAt)
        setWarnings(activeWarnings)
      } else {
        // Default values if no data exists
        setIsBanned(userHasBanRoleFromSession)
        setTrustScore(userHasBanRoleFromSession ? 0 : 100)
        setWarnings([])
      }
    } catch (error) {
      console.error('Error loading trust data:', error)
      // Default values on error - check session roles as fallback
      const userRoles = (session?.user as any)?.roleIds || []
      const userHasBanRole = userRoles.includes(BAN_ROLE_ID)
      setIsBanned(userHasBanRole)
      setTrustScore(userHasBanRole ? 0 : 100)
      setWarnings([])
    }
  }

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getTrustScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-green-600/20'
    if (score >= 60) return 'from-yellow-500/20 to-yellow-600/20'
    if (score >= 40) return 'from-orange-500/20 to-orange-600/20'
    return 'from-red-500/20 to-red-600/20'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 bg-red-400/10 border-red-400/30'
      case 'medium':
        return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
      case 'low':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      default:
        return 'text-chrome-gray-400 bg-chrome-gray-400/10 border-chrome-gray-400/30'
    }
  }

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Høj'
      case 'medium':
        return 'Medium'
      case 'low':
        return 'Lav'
      default:
        return 'Ukendt'
    }
  }

  const getStatusColor = (status: ApplicationStatus) => {
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

  const getStatusText = (status: ApplicationStatus) => {
    switch (status) {
      case 'accepted':
        return 'Accepteret'
      case 'rejected':
        return 'Afvist'
      case 'pending':
        return 'Under behandling'
      default:
        return 'Ukendt'
    }
  }

  const getTypeText = (type: string) => {
    const types: Record<string, string> = {
      whitelist: 'Whitelist',
      staff: 'Staff',
      firma: 'Firma',
      bande: 'Bande',
      politi: 'Politi',
    }
    return types[type] || type
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
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
                <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-chrome-gray-100 via-white to-chrome-gray-200 bg-clip-text text-transparent">Dashboard</h1>
                <p className="text-lg text-chrome-gray-300">Velkommen tilbage, {session?.user?.name}</p>
              </div>
              <button
                onClick={() => {
                  signOut({ callbackUrl: '/' })
                }}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Log ud
              </button>
            </div>

            {/* User Profile Header */}
            <div className="bg-chrome-gray-800/80 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-chrome-gray-700/50 shadow-lg shadow-chrome-gray-900/50">
              <div className="flex items-center space-x-4">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-20 h-20 rounded-full border-2 border-chrome-gray-600"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-chrome-gray-700 border-2 border-chrome-gray-600 flex items-center justify-center">
                    <svg className="w-10 h-10 text-chrome-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-2xl font-bold text-white">{session?.user?.name || 'Bruger'}</h3>
                    {isBanned && (
                      <span className="inline-block px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm font-semibold">
                        Banned
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-chrome-gray-400">Discord ID: {(session?.user as any)?.id || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-chrome-gray-800/80 backdrop-blur-sm rounded-t-2xl border-t border-x border-chrome-gray-700/50 flex space-x-1 px-6 shadow-lg shadow-chrome-gray-900/50">
              <button
                onClick={() => setActiveTab('profil')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'profil'
                    ? 'text-chrome-gray-200 border-chrome-gray-400'
                    : 'text-chrome-gray-400 border-transparent hover:text-chrome-gray-300'
                }`}
              >
                Profil
              </button>
              <button
                onClick={() => setActiveTab('trustscore')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'trustscore'
                    ? 'text-chrome-gray-200 border-chrome-gray-400'
                    : 'text-chrome-gray-400 border-transparent hover:text-chrome-gray-300'
                }`}
              >
                Trust Score
              </button>
              <button
                onClick={() => setActiveTab('ansogninger')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'ansogninger'
                    ? 'text-chrome-gray-200 border-chrome-gray-400'
                    : 'text-chrome-gray-400 border-transparent hover:text-chrome-gray-300'
                }`}
              >
                Ansøgninger
              </button>
            </div>

            {/* Content Area */}
            <div className="bg-chrome-gray-800/80 backdrop-blur-sm rounded-b-2xl border-b border-x border-chrome-gray-700/50 p-6 shadow-lg shadow-chrome-gray-900/50">
              {activeTab === 'profil' && (
                <div className="bg-chrome-gray-900/50 rounded-xl p-6 border border-chrome-gray-700/50">
                  <h3 className="text-xl font-bold text-white mb-4">Profil Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-chrome-gray-400 mb-1">Brugernavn</p>
                      <p className="text-white font-semibold">{session?.user?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-chrome-gray-400 mb-1">Discord ID</p>
                      <p className="text-white font-semibold">{(session?.user as any)?.id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-chrome-gray-400 mb-1">Email</p>
                      <p className="text-white font-semibold">{session?.user?.email || 'Ikke delt'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-chrome-gray-400 mb-1">Status</p>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-white font-semibold">
                          {(session?.user as any)?.isAdmin ? 'Admin' : 'Bruger'}
                        </p>
                        {isBanned && (
                          <span className="px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-xs font-semibold">
                            Banned
                          </span>
                        )}
                      </div>
                      {discordRoles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-chrome-gray-500 mb-1.5">Discord-roller</p>
                          <div className="flex flex-wrap gap-2">
                            {discordRoles.map((role) => (
                              <span
                                key={role.id}
                                className="px-2 py-1 bg-chrome-gray-700/50 text-chrome-gray-200 rounded text-xs font-medium border border-chrome-gray-600/50"
                              >
                                {role.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trustscore' && (
                <div className="space-y-6">
                  {/* Trust Score Section */}
                  <div className="bg-gradient-to-br from-chrome-gray-900/80 to-chrome-gray-800/80 rounded-xl p-6 border border-chrome-gray-700/50 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6 text-chrome-gray-300"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                        />
                      </svg>
                      <span>Trust Score</span>
                    </h3>
                    
                    <div className="flex items-center justify-center mb-6">
                      <div className="relative w-48 h-48">
                        {/* Background Circle */}
                        <svg className="transform -rotate-90 w-48 h-48">
                          <circle
                            cx="96"
                            cy="96"
                            r="84"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            className="text-chrome-gray-700/50"
                          />
                          {/* Progress Circle */}
                          <circle
                            cx="96"
                            cy="96"
                            r="84"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 84}`}
                            strokeDashoffset={`${2 * Math.PI * 84 * (1 - (isBanned ? 0 : trustScore) / 100)}`}
                            strokeLinecap="round"
                            className={`${isBanned ? 'text-red-400' : getTrustScoreColor(trustScore)} transition-all duration-1000`}
                          />
                        </svg>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-5xl font-bold ${isBanned ? 'text-red-400' : getTrustScoreColor(trustScore)}`}>
                            {isBanned ? '0' : trustScore}%
                          </span>
                          <span className="text-sm text-chrome-gray-400 mt-1">Trust</span>
                        </div>
                      </div>
                    </div>

                    {isBanned ? (
                      <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-lg p-4 border border-red-500/30">
                        <div className="flex items-center space-x-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6 text-red-400"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-red-400">Du er banned</p>
                            <p className="text-xs text-red-300/80 mt-1">
                              Din trust score er sat til 0% på grund af ban. Kontakt administrationen hvis du mener dette er en fejl.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`bg-gradient-to-r ${getTrustScoreBgColor(trustScore)} rounded-lg p-4 border border-chrome-gray-700/50`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-chrome-gray-300">Din nuværende trust score</p>
                            <p className="text-xs text-chrome-gray-400 mt-1">
                              {trustScore >= 80 && 'Fremragende! Du har høj trust.'}
                              {trustScore >= 60 && trustScore < 80 && 'God trust score. Fortsæt det gode arbejde.'}
                              {trustScore >= 40 && trustScore < 60 && 'Moderat trust score. Vær opmærksom på dine handlinger.'}
                              {trustScore < 40 && 'Lav trust score. Vær forsigtig med dine handlinger.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warnings Section */}
                  <div className="bg-chrome-gray-900/50 rounded-xl p-6 border border-chrome-gray-700/50">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6 text-chrome-gray-300"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                      <span>Advarsler</span>
                      {warnings.filter((w) => !w.removedAt).length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                          {warnings.filter((w) => !w.removedAt).length}
                        </span>
                      )}
                    </h3>

                    {warnings.filter((w) => !w.removedAt).length === 0 ? (
                      <div className="text-center py-8">
                        <svg
                          className="w-16 h-16 mx-auto text-chrome-gray-600 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-chrome-gray-400">Ingen advarsler</p>
                        <p className="text-sm text-chrome-gray-500 mt-2">Du har ingen advarsler på din konto.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {warnings.filter((w) => !w.removedAt).map((warning) => (
                          <div
                            key={warning.id}
                            className={`p-4 rounded-lg border ${getSeverityColor(warning.severity)} transition-all hover:scale-[1.02]`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="font-semibold text-white">{warning.reason}</h4>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(warning.severity)}`}>
                                    {getSeverityText(warning.severity)}
                                  </span>
                                </div>
                                {warning.note && (
                                  <p className="text-chrome-gray-300 mb-2 italic text-sm">
                                    <span className="text-chrome-gray-400">Note:</span> {warning.note}
                                  </p>
                                )}
                                <div className="space-y-1 text-sm">
                                  <p className="text-chrome-gray-300">
                                    <span className="text-chrome-gray-400">Udstedt af:</span> {warning.issuedBy}
                                  </p>
                                  <p className="text-chrome-gray-300">
                                    <span className="text-chrome-gray-400">Dato:</span>{' '}
                                    {new Date(warning.issuedAt).toLocaleDateString('da-DK', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ansogninger' && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Mine Ansøgninger</h3>
                  {applications.length === 0 ? (
                    <div className="bg-chrome-gray-900/50 rounded-xl p-8 border border-chrome-gray-700/50 text-center">
                      <p className="text-chrome-gray-400 mb-4">Du har ingen ansøgninger endnu.</p>
                      <Link
                        href="/ansogninger"
                        className="inline-block px-6 py-3 bg-chrome-gray-700 hover:bg-chrome-gray-600 text-white rounded-lg transition-colors font-semibold"
                      >
                        Send ansøgning
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <div
                          key={app.id}
                          className={`p-4 rounded-lg border ${getStatusColor(app.status)}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-white">{getTypeText(app.type)}</h4>
                              <p className="text-xs text-chrome-gray-400 mt-1">
                                Indsendt: {new Date(app.submittedAt).toLocaleDateString('da-DK')}
                              </p>
                              {app.reviewedAt && (
                                <p className="text-xs text-chrome-gray-400">
                                  Gennemgået: {new Date(app.reviewedAt).toLocaleDateString('da-DK')}
                                </p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(app.status)}`}>
                              {getStatusText(app.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
