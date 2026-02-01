import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/authOptions'
import { fetchUserRoles, fetchUserRolesWithNames } from '@/lib/discord'

/**
 * Henter friske Discord-roller for den indloggede bruger.
 * Bruges af ansøgningssiden og dashboard.
 * Query: ?withNames=true returnerer roller med navne til visning.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const guildId = process.env.DISCORD_GUILD_ID

    if (!userId || !guildId) {
      return NextResponse.json({ success: true, roleIds: [], roles: [] })
    }

    const { searchParams } = new URL(request.url)
    const withNames = searchParams.get('withNames') === 'true'

    if (withNames) {
      const roles = await fetchUserRolesWithNames(userId, guildId)
      return NextResponse.json({ success: true, roleIds: roles.map((r) => r.id), roles })
    }

    const roleIds = await fetchUserRoles(userId, guildId)
    return NextResponse.json({ success: true, roleIds })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ success: false, roleIds: [], roles: [] })
  }
}
