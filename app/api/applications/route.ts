import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'
import { addRole, sendChannelMessage, sendDirectMessage } from '@/lib/discord'
import fs from 'fs'
import path from 'path'

// File-based storage for applications
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
  requires_interview?: boolean // For whitelist applications
  [key: string]: any // For additional form data
}

// File path for storing applications
const DATA_DIR = path.join(process.cwd(), 'data')
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json')

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// Load applications from file
function loadApplications(): Application[] {
  try {
    ensureDataDir()
    if (fs.existsSync(APPLICATIONS_FILE)) {
      const fileContent = fs.readFileSync(APPLICATIONS_FILE, 'utf-8')
      return JSON.parse(fileContent)
    }
    return []
  } catch (error) {
    console.error('Error loading applications:', error)
    return []
  }
}

// Save applications to file
function saveApplications(applications: Application[]): void {
  try {
    ensureDataDir()
    fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(applications, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error saving applications:', error)
  }
}

// Helper function to create log entries
function createLog(action: string, userId: string, userName: string, details: string) {
  try {
    ensureDataDir()
    const LOGS_FILE = path.join(DATA_DIR, 'logs.json')
    let logs: any[] = []
    
    if (fs.existsSync(LOGS_FILE)) {
      const fileContent = fs.readFileSync(LOGS_FILE, 'utf-8')
      logs = JSON.parse(fileContent)
    }

    const newLog = {
      id: Date.now().toString(),
      action,
      userId,
      userName,
      details,
      timestamp: new Date().toISOString(),
    }

    logs.push(newLog)
    const logsToSave = logs.slice(-10000)
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logsToSave, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error creating log entry:', error)
  }
}

// GET - Get applications for a user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any)?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const requestedUserId = searchParams.get('userId')

    // Check if user is admin
    const isAdmin = (session.user as any)?.isAdmin || false

    // Non-admins can only see their own applications
    if (!isAdmin && requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const applications = loadApplications()

    // Get applications for the requested user (or all if admin)
    if (isAdmin && !requestedUserId) {
      return NextResponse.json({
        success: true,
        applications,
      })
    }

    const targetUserId = requestedUserId || userId
    const filteredApplications = applications.filter(
      (app) => app.user_id === targetUserId
    )

    return NextResponse.json({
      success: true,
      applications: filteredApplications,
    })
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new application
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any)?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { id, userId: requestUserId, userName, type, status, submittedAt, ...formData } = body

    // Ensure user can only create applications for themselves
    if (requestUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (!type || !status) {
      return NextResponse.json(
        { success: false, error: 'Type and status are required' },
        { status: 400 }
      )
    }

    const applications = loadApplications()

    const newApplication: Application = {
      id: id || Date.now().toString(),
      user_id: userId,
      user_name: userName || session.user?.name || 'Unknown',
      type,
      status: status || 'pending',
      submitted_at: submittedAt || new Date().toISOString(),
      ...formData,
    }

    applications.push(newApplication)
    saveApplications(applications)

    return NextResponse.json({
      success: true,
      application: newApplication,
    })
  } catch (error) {
    console.error('Error creating application:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update application status (accept/reject)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const isAdmin = (session.user as any)?.isAdmin || false
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, status, reviewNote, requiresInterview } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Application ID and status are required' },
        { status: 400 }
      )
    }

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    const applications = loadApplications()
    const application = applications.find((app) => app.id === id)

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    const oldStatus = application.status
    application.status = status
    application.reviewed_at = new Date().toISOString()
    application.reviewed_by = session.user?.name || 'Admin'
    if (reviewNote) {
      application.review_note = reviewNote
    }
    // Store interview requirement for whitelist applications
    if (application.type === 'whitelist' && status === 'accepted' && requiresInterview !== undefined) {
      application.requires_interview = requiresInterview
    }

    saveApplications(applications)

    // Log the action
    createLog(
      `application_${status}`,
      application.user_id,
      session.user?.name || 'Admin',
      `Ansøgning ${id} (${application.type}) ${status === 'accepted' ? 'accepteret' : 'afvist'} af ${session.user?.name || 'Admin'}${reviewNote ? `. Note: ${reviewNote}` : ''}`
    )

    // Send Discord notifications for whitelist applications
    if (application.type === 'whitelist') {
      const channelId = '1459894797119787088' // Whitelist notification channel
      let channelMessage = ''
      
      if (status === 'accepted') {
        if (requiresInterview === true) {
          // Indkaldt til samtale – giv brugeren samtale-rollen
          const INTERVIEW_ROLE_ID = '1459894683038912522'
          const guildId = process.env.DISCORD_GUILD_ID
          if (guildId) {
            addRole(application.user_id, guildId, INTERVIEW_ROLE_ID).catch((error) => {
              console.error('Error adding interview role:', error)
            })
          }
          channelMessage = `<@${application.user_id}> - Du er blevet indkaldt til samtale omkring din whitelist ansøgning`
        } else {
          // Godkendt uden samtale
          channelMessage = `<@${application.user_id}> - Din whitelist ansøgning er blevet godkendt`
        }
        
        // Send DM to user
        let dmMessage = ''
        
        if (requiresInterview === true) {
          dmMessage = `Hej ${application.user_name},\n\n` +
            `Din ansøgning er blevet godkendt!\n` +
            `Du skal nu gøre dig klar til en samtale med en staff eller whitelist modtager.\n\n` +
            `Husk at læse op på reglerne!\n` +
            `https://averarp.dk/rules\n\n` +
            `vh. Avera RP Staff`
        } else {
          dmMessage = `Hej ${application.user_name},\n\n` +
            `Din ansøgning er blevet godkendt!\n\n` +
            `Husk at læse op på reglerne!\n` +
            `https://averarp.dk/rules\n\n` +
            `vh. Avera RP Staff`
        }
        
        sendDirectMessage(application.user_id, dmMessage).catch((error) => {
          console.error('Error sending DM:', error)
        })
      } else if (status === 'rejected') {
        // Afvist
        channelMessage = `<@${application.user_id}> - Din whitelist ansøgning er blevet afvist`
        
        // Send DM to user
        const dmMessage = `Hej ${application.user_name},\n\n` +
          `Din whitelist ansøgning er blevet afvist.\n\n` +
          `vh. Avera RP Staff`
        
        sendDirectMessage(application.user_id, dmMessage).catch((error) => {
          console.error('Error sending DM:', error)
        })
      }
      
      // Send message to channel if we have a message
      if (channelMessage) {
        sendChannelMessage(channelId, channelMessage).catch((error) => {
          console.error('Error sending channel message:', error)
        })
      }
    }

    return NextResponse.json({
      success: true,
      application,
    })
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
