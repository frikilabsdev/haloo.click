import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            tenantUsers: {
              include: { tenant: { select: { id: true, slug: true, status: true } } },
            },
          },
        });

        if (!user || !user.isActive) return null;

        const valid = await compare(password, user.password);
        if (!valid) return null;

        const tenantUser = user.tenantUsers[0] ?? null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          tenantId: tenantUser?.tenantId ?? null,
          tenantSlug: tenantUser?.tenant?.slug ?? null,
          tenantStatus: tenantUser?.tenant?.status ?? null,
          role: tenantUser?.role ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.tenantStatus = user.tenantStatus;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.isAdmin = token.isAdmin as boolean;
      session.user.tenantId = token.tenantId as string | null;
      session.user.tenantSlug = token.tenantSlug as string | null;
      session.user.tenantStatus = token.tenantStatus as string | null;
      session.user.role = token.role as string | null;
      return session;
    },
  },
});
