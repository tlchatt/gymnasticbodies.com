import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../Drizzle/index.ts"; // your drizzle instance
import { user, session,account,verification } from '../Drizzle/db/schema';
import { admin } from "better-auth/plugins"
import { hashPassword, verifyPassword } from "./password.js";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: {
            user,
            session,
            account,
            verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
        password: {
            hash: hashPassword,
            verify: verifyPassword,
          },
    },
    plugins: [
        admin({adminUserIds:["TufkirhwrYmEEDUfnxDtTGVpIhdgUzQv"]}) 
    ],
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 7 * 24 * 60 * 60, // 7 days cache duration
            strategy: "jwe", // can be "jwt" or "compact"
            refreshCache: true, // Enable stateless refresh
        },
    },
    account: {
        storeStateStrategy: "cookie",
        storeAccountCookie: true, // Store account data after OAuth flow in a cookie (useful for database-less flows)
    }
});

