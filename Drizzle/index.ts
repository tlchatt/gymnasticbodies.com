import { drizzle } from 'drizzle-orm/neon-http';

let dbURL = process.env.DATABASE_URL ? process.env.DATABASE_URL : 'postgresql://neondb_owner:npg_9BuXoyZCg8zh@ep-empty-rain-adj5ssc5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
export const db = drizzle(dbURL);