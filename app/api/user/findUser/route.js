import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { eq } from 'drizzle-orm';
import { account } from "@/Drizzle/db/schema"

export async function GET(request) {

    // curl -X POST http://localhost:3001/api/user/findUser -H "Content-Type: application/json" \ -d '{userId:"TufkirhwrYmEEDUfnxDtTGVpIhdgUzQv"}'

    // const json = await request.json()
    // console.log("json is:", json)

    let data = {
        userId: "TufkirhwrYmEEDUfnxDtTGVpIhdgUzQv"
    }
    let queryUser = await db.select().from(account).where(eq(account.userId, data.userId));
    console.log("queryUser in GET:", queryUser)

}
