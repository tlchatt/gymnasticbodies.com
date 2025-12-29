import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_setting, user } from "@/Drizzle/db/schema"
import { eq } from 'drizzle-orm';


export async function queryUserSetting(userId, type) {
    console.log("POST /lib/userSettings/queryUserSetting, userId, type", userId," ", type)
    let queryExisting = await db.select().from(user_setting).where(eq(user_setting.userId, userId));
    console.log(" queryExisting:",queryExisting)
    let matching = queryExisting ? queryExisting?.filter(item => item.type === type) : null
    console.log(" matching:",matching)

    if(matching.length > 1){
        console.warn(" multiple match in lib/userSettings/queryUserSetting found",matching)
    }

    return matching ? matching[0] : null
}

export async function getUserWithEmail(email){
    let returnUser = await db.select().from(user).where(eq(user.email, email));
    if (returnUser.length > 1) {
        console.warn("warning multiple users in lib/userSettings/getUserWithEmail:", returnUser)
    }
    return returnUser ? returnUser[0] : null
}