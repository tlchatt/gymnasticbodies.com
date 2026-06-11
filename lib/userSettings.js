import { db } from "@/Drizzle/index.ts";
import { user_setting, user, user_logs, session } from "@/Drizzle/db/schema"
import { eq } from 'drizzle-orm';
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { passwordCreation } from "./commonServerFunction";

export async function queryUserSetting(userId, type) {
    let queryExisting = await db.select().from(user_setting).where(eq(user_setting.userId, userId));
    let matching = queryExisting ? queryExisting?.filter(item => item.type === type) : null

    if (matching.length > 1) {
        logger.warn('db.multiple_settings', { userId, type, count: matching.length });
    }

    return matching ? matching[0] : null
}

export async function getUserWithEmail(email) {
    let returnUser = await db.select().from(user).where(eq(user.email, email));
    if (returnUser.length > 1) {
        logger.warn('db.multiple_users', { email, count: returnUser.length });
    }
    return returnUser ? returnUser[0] : null
}

export async function getUserWithId(userId) {
    let returnUser = await db.select().from(user).where(eq(user.id, userId));
    if (returnUser.length > 1) {
        logger.warn('db.multiple_users', { userId, count: returnUser.length });
    }
    return returnUser ? returnUser[0] : null
}

export async function getUserSession(userId) {
    let userSession = await db.select().from(session).where(eq(session.userId, userId));
    return userSession ? userSession[0] : null
}

export async function queryUserLogsForDate(userId, userScheduleDate) {
    let queryExisting = await db.select().from(user_logs).where(eq(user_logs.userId, userId));
    let matching = queryExisting ? queryExisting?.filter(item => item.userScheduleDate === userScheduleDate) : null
    return matching ? matching[0] : null
}

export async function createAccountForUser(json) {
    let first_name = json.billing ? json.billing.first_name : json.first_name
    let email = json.billing ? json.billing.email : json.email
    let password
    if (json?.password) {
        password = json?.password
    } else {
        password = await passwordCreation()
    }
    let signUpData = null
    try {
        signUpData = await auth.api.signUpEmail({
            body: {
                name: first_name,
                email: email,
                password: password,
            },
        });
        return signUpData;
    } catch (error) {
        logger.error('db.signup_failed', { email, error });
        return signUpData;
    }
}

export async function updateUserSetting(matching, settingsRecord) {
    let userSetting = await db.update(user_setting)
        .set({
            data: settingsRecord.data,
            awsCustomerId: settingsRecord?.awsCustomerId,
            status: settingsRecord.status,
            stripeCustomerId: settingsRecord?.stripeCustomerId,
            stripeSubscriptionId: settingsRecord?.stripeSubscriptionId,
        }).where(eq(user_setting.id, matching.id)).returning();

    return userSetting
}

export async function updateUserSettingData(matching, updatedData) {
    let userSetting = await db.update(user_setting)
        .set({
            data: updatedData,
        }).where(eq(user_setting.id, matching.id)).returning();

    return userSetting
}

export async function updateUserSettingSubscriptionStatus(matching, subscriptionCreated) {
    let userSetting = await db.update(user_setting)
        .set({
            subscriptionInAuthorize: subscriptionCreated,
        }).where(eq(user_setting.id, matching.id)).returning();

    return userSetting
}

export async function insertIntoUserSetting(settingsRecord) {
    let userSetting = await db.insert(user_setting).values(settingsRecord).returning();
    return userSetting
}

export async function createAndModifyUserInNeon(incomingData, impInfo, subscriptionForCustomer, stripeData = null) {
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
        stripeCustomerId: stripeData?.stripeCustomerId ?? null,
        stripeSubscriptionId: stripeData?.stripeSubscriptionId ?? null,
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
        authorizeNextImport: impInfo?.AuthorizeNextImport,
        authorizeCustomerId: impInfo?.authorizenetCustomerId,
        awsCustomerId: incomingData?.awsCustomerId,
        trial: incomingData?.trial,
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
    let dbUser = await getUserWithEmail(incomingData?.email)
    let isExistingUser = dbUser?.id ? true : false
    if (!isExistingUser) {
        dbUser = await createAccountForUser(finalData)
    }
    settingsRecord.userId = dbUser?.user?.id ?? dbUser?.id
    let matching = await queryUserSetting(settingsRecord?.userId, settingsRecord?.type)
    let userSetting
    if (matching) {
        userSetting = await updateUserSetting(matching, settingsRecord)
    } else {
        userSetting = await insertIntoUserSetting(settingsRecord)
    }
    return dbUser
}

export async function getUserSettingByStripeSubscriptionId(stripeSubscriptionId) {
    const results = await db.select().from(user_setting)
        .where(eq(user_setting.stripeSubscriptionId, stripeSubscriptionId));
    return results[0] ?? null;
}

export async function updateUserSettingStatus(matching, status, updatedData) {
    return db.update(user_setting)
        .set({ status, data: updatedData })
        .where(eq(user_setting.id, matching.id))
        .returning();
}

export async function updateUserSettingRenewal(matching, { stripeCustomerId, stripeSubscriptionId, status, data }) {
    const MAX_RETRIES = 3;
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const result = await db.update(user_setting)
            .set({ stripeCustomerId, stripeSubscriptionId, status, data })
            .where(eq(user_setting.id, matching.id))
            .returning();
        if (result && result.length > 0 && result[0].stripeSubscriptionId === stripeSubscriptionId) {
            return result;
        }
        lastError = new Error(`updateUserSettingRenewal attempt ${attempt} returned no confirmation (settingId: ${matching.id}, sub: ${stripeSubscriptionId})`);
        logger.warn('db.renewal_save_retry', { attempt, settingId: matching.id, stripeSubscriptionId });
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, attempt * 200));
    }
    throw lastError;
}

export async function updateUserMigrationType(userId, migrationType) {
    return db.update(user).set({ migrationType }).where(eq(user.id, userId)).returning();
}

export async function updateUserClassification(userId, migrationType, customerSegment) {
    return db.update(user).set({ migrationType, customerSegment }).where(eq(user.id, userId)).returning();
}

export async function getAllAuthUserSettings() {
    let queryAll = await db
        .select()
        .from(user_setting)
        .where(eq(user_setting.woocommerceAuthorizeImport, true));

    return queryAll
}
