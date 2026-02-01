import { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { fetchUserRoles, isAdmin } from '@/lib/discord'

// NEXTAUTH_URL: ingen trailing slash – Discord OAuth2 redirect skal matche præcist
const rawUrl = process.env.NEXTAUTH_URL || ''
const baseUrl = rawUrl.replace(/\/+$/, '')
if (baseUrl) process.env.NEXTAUTH_URL = baseUrl
if (process.env.NODE_ENV === 'production' && !baseUrl) {
  console.error('[NextAuth] NEXTAUTH_URL mangler i produktion – sæt den på Render Environment.')
}

export const authOptions: NextAuthOptions = {
  trustHost: true,
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
        const guildId = process.env.DISCORD_GUILD_ID
        if (guildId && account.providerAccountId) {
          try {
            const roleIds = await Promise.race([
              fetchUserRoles(account.providerAccountId, guildId),
              new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 3000))
            ])
            token.roleIds = roleIds
            token.isAdmin = isAdmin(roleIds)
          } catch (error) {
            console.error('Error fetching user roles:', error)
            token.roleIds = []
            token.isAdmin = false
          }
        } else {
          token.roleIds = []
          token.isAdmin = false
        }
      }
      if (!token.roleIds) token.roleIds = []
      if (token.isAdmin === undefined) token.isAdmin = false
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
