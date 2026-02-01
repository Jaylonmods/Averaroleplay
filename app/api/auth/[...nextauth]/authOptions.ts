import { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { fetchUserRoles, isAdmin } from '@/lib/discord'

// Fjern evt. trailing slash så Discord OAuth2 redirect matcher præcist
if (process.env.NEXTAUTH_URL?.endsWith('/')) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL.slice(0, -1)
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.id = account.providerAccountId
        
        // Only fetch roles on initial sign in (when account is present)
        if (account) {
          // Fetch user roles from Discord guild
          const guildId = process.env.DISCORD_GUILD_ID
          if (guildId && account.providerAccountId) {
            try {
              // Use Promise.race to add timeout protection
              const roleIds = await Promise.race([
                fetchUserRoles(account.providerAccountId, guildId),
                new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 3000))
              ])
              token.roleIds = roleIds
              token.isAdmin = isAdmin(roleIds)
            } catch (error) {
              console.error('Error fetching user roles:', error)
              // Set defaults on error to prevent crashes
              token.roleIds = []
              token.isAdmin = false
            }
          } else {
            // If no guild ID or user ID, set defaults
            token.roleIds = []
            token.isAdmin = false
          }
        }
      }
      // Preserve existing roleIds and isAdmin if they exist
      if (!token.roleIds) {
        token.roleIds = []
      }
      if (token.isAdmin === undefined) {
        token.isAdmin = false
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        (session.user as any).id = token.id
      }
      if (token.roleIds) {
        (session.user as any).roleIds = token.roleIds
      }
      if (token.isAdmin !== undefined) {
        (session.user as any).isAdmin = token.isAdmin
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/',
  },
}
