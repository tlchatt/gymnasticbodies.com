import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_setting, user, user_logs, session } from "@/Drizzle/db/schema"
import { eq } from 'drizzle-orm';
import { auth } from "@/lib/auth"; // path to your auth file
import { passwordCreation } from "./commonServerFunction";
import { ConnectingAirportsOutlined } from "@mui/icons-material";

export async function queryUserSetting(userId, type) {
    console.log("inside POST /lib/userSettings/queryUserSetting, userId, type", userId, " ", type)
    let queryExisting = await db.select().from(user_setting).where(eq(user_setting.userId, userId));
    console.log(" queryExisting:", queryExisting)
    let matching = queryExisting ? queryExisting?.filter(item => item.type === type) : null
    console.log(" matching:", matching)

    if (matching.length > 1) {
        console.warn(" multiple match in lib/userSettings/queryUserSetting found", matching)
    }

    return matching ? matching[0] : null
}

export async function getUserWithEmail(email) {
    console.log("email in getUserWithEmail:",email)
    let returnUser = await db.select().from(user).where(eq(user.email, email));
    if (returnUser.length > 1) {
        console.warn("warning multiple users in lib/userSettings/getUserWithEmail:", returnUser)
    }
    return returnUser ? returnUser[0] : null
}
export async function getUserWithId(userId) {
    let returnUser = await db.select().from(user).where(eq(user.id, userId));
    if (returnUser.length > 1) {
        console.warn("warning multiple users in lib/userSettings/getUserWithEmail:", returnUser)
    }
    return returnUser ? returnUser[0] : null
}
export async function getUserSession(userId) {
    let userSession = await db.select().from(session).where(eq(session.userId, userId));
    console.log("userSession:", userSession)//first session
    return userSession ? userSession[0] : null
}
export async function queryUserLogsForDate(userId, userScheduleDate) {
    console.log("POST /lib/userSettings/queryUserLogsForDate, userId, type", userId, " ", userScheduleDate)
    let queryExisting = await db.select().from(user_logs).where(eq(user_logs.userId, userId));
    console.log(" queryExisting:", queryExisting)
    let matching = queryExisting ? queryExisting?.filter(item => item.userScheduleDate === userScheduleDate) : null
    console.log(" matching:", matching)


    return matching ? matching[0] : null
}
export async function createAccountForUser(json) {
    //create account field, which will create the user too.
    console.log("inside createAccountForUser", json)
    let first_name = json.billing ? json.billing.first_name : json.first_name
    let email = json.billing ? json.billing.email : json.email
    let password
    if (json?.password) {
        password = json?.password
    } else {
        password = await passwordCreation()
    }
    console.log("password in !isExistingUser in createAccountForUser:", password)
    let signUpData = null
    try {
        signUpData = await auth.api.signUpEmail({
            body: {
                name: first_name,
                email: email,
                password: password,
            },
        });
        console.log("new user data for subscription:", signUpData);
        return signUpData;
    } catch (error) {
        console.error("Error signing up:", error);
        // Handle the error, e.g., return an error response
        return signUpData;
    }

}
export async function updateUserSetting(matching, settingsRecord) {
    let userSetting = await db.update(user_setting)
        .set({
            data: settingsRecord.data,
            awsCustomerId: settingsRecord?.awsCustomerId
        }).where(eq(user_setting.id, matching.id)).returning();

    return userSetting
}
export async function insertIntoUserSetting(settingsRecord) {
    let userSetting = await db.insert(user_setting).values(settingsRecord).returning();

    return userSetting
}
export async function createAndModifyUserInNeon(incomingData, impInfo, subscriptionForCustomer) {
    let finalData = {
        password: incomingData?.password,
        billing: {
            first_name: impInfo?.firstName,
            last_name: impInfo?.lastName,
            email: incomingData?.email
        }
    }
    let settingsRecord = {
        type: 'subscription',
        status: impInfo?.status,
        postAWS: incomingData?.postAWS,
        data: {
            status: impInfo?.status,
            renewaldate: impInfo?.nextPaymentDate ?? "N/A",
            startdate: impInfo?.oldestTransactionDate ?? "N/A",
            phone: impInfo?.phone ?? "N/A",
            country: impInfo?.country ?? "N/A",
            email: incomingData?.email ?? "N/A",
            term: impInfo?.matchedTerm ?? "N/A",
            first_name: impInfo?.firstName ?? "N/A",
            last_name: impInfo?.lastName ?? "N/A",
            authorizeCustomer: subscriptionForCustomer?.data["profile"] ?? "N/A",
            authorizeSubscription: subscriptionForCustomer?.data["subscriptionId"] ?? "N/A",

        },
        // userId: dbUser.user.id,
        authorizeNextImport: impInfo?.AuthorizeNextImport,
        authorizeCustomerId: impInfo?.authorizenetCustomerId,
        awsCustomerId:incomingData?.awsCustomerId

    }
    let dbUser = await getUserWithEmail(incomingData?.email)
    console.log("dbUser before:", dbUser)
    let isExistingUser = dbUser?.id ? true : false
    console.log("isExistingUser:",isExistingUser)
    if (!isExistingUser) {
        dbUser = await createAccountForUser(finalData)
    }
    console.log("dbUser after:", dbUser)
    settingsRecord.userId = dbUser?.id
    console.log("settingsRecord:",settingsRecord)
    let matching = await queryUserSetting(settingsRecord?.userId, settingsRecord?.type)
    console.log("matching:", matching)
    let userSetting
    if (matching) {
        userSetting = await updateUserSetting(matching, settingsRecord)
    } else {
        userSetting = await insertIntoUserSetting(settingsRecord)
    }
    console.log("userSetting:",userSetting)
    return dbUser
}