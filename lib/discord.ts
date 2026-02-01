/**
 * Utility functions for Discord role checking and messaging
 */

/**
 * Check if a user has any of the admin roles
 * @param userRoleIds Array of Discord role IDs that the user has
 * @returns true if user has any admin role
 */
export function isAdmin(userRoleIds: string[]): boolean {
  const adminRoleIds = process.env.DISCORD_ADMIN_ROLE_IDS?.split(',').map(id => id.trim()) || []
  
  if (adminRoleIds.length === 0) {
    return false
  }
  
  return adminRoleIds.some(adminRoleId => userRoleIds.includes(adminRoleId))
}

/**
 * Fetch user's Discord roles from a guild
 * @param userId Discord user ID
 * @param guildId Discord guild/server ID
 * @returns Array of role IDs that the user has
 */
export async function fetchUserRoles(userId: string, guildId: string): Promise<string[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  
  if (!botToken) {
    console.warn('DISCORD_BOT_TOKEN is not set - skipping role fetch')
    return []
  }
  
  if (!guildId || !userId) {
    console.warn('Missing guildId or userId - skipping role fetch')
    return []
  }
  
  try {
    // Fetch guild member to get their roles
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        // User is not in the guild
        console.warn(`User ${userId} not found in guild ${guildId}`)
        return []
      }
      if (response.status === 403) {
        console.error('Bot does not have permission to access guild members')
        return []
      }
      console.warn(`Discord API error: ${response.status} - ${response.statusText}`)
      return []
    }
    
    const member = await response.json()
    return member.roles || []
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('Discord API request timed out')
    } else {
      console.error('Error fetching user roles:', error.message || error)
    }
    return []
  }
}

/**
 * Fetch all roles in a guild (id + name)
 */
export async function fetchGuildRoles(guildId: string): Promise<{ id: string; name: string }[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken || !guildId) return []

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { 'Authorization': `Bot ${botToken}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return []
    const roles = await response.json()
    return (roles || []).map((r: any) => ({ id: r.id, name: r.name || r.id }))
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('Discord API request timed out')
    } else {
      console.error('Error fetching guild roles:', error.message || error)
    }
    return []
  }
}

/**
 * Fetch user's roles with names
 */
export async function fetchUserRolesWithNames(
  userId: string,
  guildId: string
): Promise<{ id: string; name: string }[]> {
  const [userRoleIds, guildRoles] = await Promise.all([
    fetchUserRoles(userId, guildId),
    fetchGuildRoles(guildId),
  ])
  const roleMap = new Map(guildRoles.map((r) => [r.id, r.name]))
  return userRoleIds
    .filter((id) => id !== guildId) // @everyone
    .map((id) => ({ id, name: roleMap.get(id) || `Rolle ${id.slice(-6)}` }))
}

/**
 * Send a message to a Discord channel
 * @param channelId Discord channel ID
 * @param message Message content to send
 * @returns true if successful, false otherwise
 */
export async function sendChannelMessage(channelId: string, message: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  
  if (!botToken) {
    console.warn('DISCORD_BOT_TOKEN is not set - cannot send message')
    return false
  }
  
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to send Discord message: ${response.status} - ${errorText}`)
      return false
    }
    
    return true
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('Discord message request timed out')
    } else {
      console.error('Error sending Discord message:', error.message || error)
    }
    return false
  }
}

/**
 * Send a direct message (DM) to a Discord user
 * @param userId Discord user ID
 * @param message Message content to send
 * @returns true if successful, false otherwise
 */
export async function sendDirectMessage(userId: string, message: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  
  if (!botToken) {
    console.warn('DISCORD_BOT_TOKEN is not set - cannot send DM')
    return false
  }
  
  try {
    // First, create a DM channel with the user
    const dmResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: userId,
      }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!dmResponse.ok) {
      const errorText = await dmResponse.text()
      console.error(`Failed to create DM channel: ${dmResponse.status} - ${errorText}`)
      return false
    }
    
    const dmChannel = await dmResponse.json()
    const channelId = dmChannel.id
    
    // Then send the message to the DM channel
    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error(`Failed to send DM: ${messageResponse.status} - ${errorText}`)
      return false
    }
    
    return true
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('Discord DM request timed out')
    } else {
      console.error('Error sending Discord DM:', error.message || error)
    }
    return false
  }
}

/**
 * Remove all roles from a Discord user in a guild
 * @param userId Discord user ID
 * @param guildId Discord guild/server ID
 * @returns true if successful, false otherwise
 */
export async function removeAllRoles(userId: string, guildId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  
  if (!botToken) {
    console.warn('DISCORD_BOT_TOKEN is not set - cannot remove roles')
    return false
  }
  
  try {
    // First, get current member roles
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!memberResponse.ok) {
      const errorText = await memberResponse.text()
      console.error(`Failed to fetch member: ${memberResponse.status} - ${errorText}`)
      return false
    }
    
    const member = await memberResponse.json()
    const currentRoles = member.roles || []
    
    // Remove all roles except @everyone (which is the guildId and cannot be removed)
    // We need to keep @everyone role, so we set roles to only contain the guildId
    const rolesToKeep = [guildId] // @everyone role
    
    // If user only has @everyone role, nothing to do
    if (currentRoles.length === 0 || (currentRoles.length === 1 && currentRoles[0] === guildId)) {
      return true
    }
    
    // Remove all roles except @everyone by setting roles to only contain @everyone
    const removeResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: rolesToKeep,
      }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!removeResponse.ok) {
      const errorText = await removeResponse.text()
      console.error(`Failed to remove roles: ${removeResponse.status} - ${errorText}`)
      return false
    }
    
    return true
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('Discord role removal request timed out')
    } else {
      console.error('Error removing roles:', error.message || error)
    }
    return false
  }
}

/**
 * Add a role to a Discord user in a guild
 * @param userId Discord user ID
 * @param guildId Discord guild/server ID
 * @param roleId Role ID to add
 * @returns true if successful, false otherwise
 */
export async function addRole(userId: string, guildId: string, roleId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  
  if (!botToken) {
    console.warn('DISCORD_BOT_TOKEN is not set - cannot add role')
    return false
  }
  
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to add role: ${response.status} - ${errorText}`)
      return false
    }
    
    return true
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('Discord role addition request timed out')
    } else {
      console.error('Error adding role:', error.message || error)
    }
    return false
  }
}

/**
 * Remove a role from a Discord user in a guild
 * @param userId Discord user ID
 * @param guildId Discord guild/server ID
 * @param roleId Role ID to remove
 * @returns true if successful, false otherwise
 */
export async function removeRole(userId: string, guildId: string, roleId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  
  if (!botToken) {
    console.warn('DISCORD_BOT_TOKEN is not set - cannot remove role')
    return false
  }
  
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) {
      // 404 means the user doesn't have the role, which is fine
      if (response.status === 404) {
        return true
      }
      const errorText = await response.text()
      console.error(`Failed to remove role: ${response.status} - ${errorText}`)
      return false
    }
    
    return true
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('Discord role removal request timed out')
    } else {
      console.error('Error removing role:', error.message || error)
    }
    return false
  }
}

/**
 * Ban a user from Discord guild (remove all roles and add ban role)
 * @param userId Discord user ID
 * @param guildId Discord guild/server ID
 * @param banRoleId Role ID to assign after removing all roles
 * @returns true if successful, false otherwise
 */
export async function banUser(userId: string, guildId: string, banRoleId: string): Promise<boolean> {
  // First remove all roles
  const rolesRemoved = await removeAllRoles(userId, guildId)
  if (!rolesRemoved) {
    console.error('Failed to remove all roles')
    return false
  }
  
  // Then add the ban role
  const roleAdded = await addRole(userId, guildId, banRoleId)
  if (!roleAdded) {
    console.error('Failed to add ban role')
    return false
  }
  
  return true
}