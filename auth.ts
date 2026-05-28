import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const ALLOWED_DOMAIN = 'vammo.com'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    signIn({ user }) {
      return user.email?.endsWith(`@${ALLOWED_DOMAIN}`) ?? false
    },

    authorized({ auth }) {
      return !!auth?.user
    },
  },
})
