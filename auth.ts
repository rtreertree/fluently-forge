import NextAuth from "next-auth"
import authConfig from "@/auth.config"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"

import { getUserById } from "@/data/user"
import { EnglishLevel, UserRole } from "@prisma/client"




export const { handlers: {GET, POST} , signIn, signOut,  auth } = NextAuth({
    ...authConfig,
    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
    events: {
        async linkAccount({ user }) {
            await db.user.update({
                where: { id: user.id },
                data: { emailVerified: new Date() }
            });
        },
    }, 
    callbacks: {
        async session({token, session}) {
            
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            
            if (session.user && token.role) {
                session.user.role = token.role as UserRole;
            }
            
            if (session.user && token.englishLevel) {
                session.user.englishLevel = token.englishLevel as EnglishLevel;
            }
            console.log("Session (session)", session);
            console.log("Token (session)", token);
            return session;
        },
        async jwt({ token, trigger, session }) {
            if (!token.sub) {
                return token;
            }

            if (trigger === "update" && session) {
                token.name = session.user?.name;
                token.englishLevel = session.user?.englishLevel;
                console.log("token (JWT)", token);
                return token;
            }

            
            const existingUser = await getUserById(token.sub);
            if (!existingUser)
                return token;

            token.role = existingUser.role;
            token.englishLevel = existingUser.englishLevel;
            return token;
        }
    },
    adapter: PrismaAdapter(db),
    session: {strategy: "jwt"}
})
