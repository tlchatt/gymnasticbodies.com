import path from 'path';
import { promises as fs } from 'fs';
import fsp from 'fs/promises' // not 'fs'

let authorizeDataFolder = 'AuthorizeData'
let authorizeDataFile = '16thApril2026.json'

let allData = await getAllDataFromFile(authorizeDataFolder, authorizeDataFile)//customerData is AuthorizeCustomerData
console.log("allData:", allData.length)//6466
let customerProfileId
let count = 0
let emailsNotFoundInNeon = [
    "Odhranhickey@gmail.com",
    "Mohd22aus@gmail.com",
    "LisaMJGriffin@gmail.com",
    "Gerhard.Uhl-Stutz@t-online.de",
    "Bryan.dostie@gmail.com",
    "Yc091893@gmail.com",
    "RAUNO.RAUNISTE@gmail.com",
    "Alastairrhodes14@gmail.com",
    "Alexwindover@gmail.com",
    "Johsuarl89@aol.com"
]
for (let data of allData) {
    count++
    let email = data.result?.profile?.email
    if (email) {
        customerProfileId = allData.find(item =>
            item.result?.profile?.email === email
        )?.result?.profile?.customerProfileId;
        console.log("count:", count)
        console.log("customerProfileId:", customerProfileId)
        await updateNeondbAuthroizeData(email, customerProfileId)
    }
    //update the usersetting with customerProfileId in db with that email 
}



export async function getAllDataFromFile(folder, fileName) {
    // console.log("email inside getAllDataFromFile:", email)
    // console.log("process.cwd():", process.cwd())
    const filePath = path.join(process.cwd(), 'data', folder, fileName);
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    return data
    // console.log("allAuthorizeData length:", allAuthorizeData.length)
    // let customerData = allAuthorizeData.find(data => data.result.profile.email === email);
    // console.log("customerData:", customerData)
    // return customerData
}
async function updateNeondbAuthroizeData(email, customerProfileId) {
    const config = {
        headers: {
            "Content-Type": "application/json"
        }
    }
    let data = {
        email: email,
        authorizeCustomerId: customerProfileId
    }
    console.log("data:", data)
    console.log("count:", count)
    try {
        const res = await fetch('http://localhost:3001/api/user/updateUserSettingInNeon', {
            method: 'POST',
            headers: {
                ...config.headers,
            },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            const responseData = await res.json();
            console.log("responseData:", responseData)
            // handle response data
        } else {
            // handle error
        }
    } catch (error) {
        // handle fetch error
        console.log("Error in fetch:", error)
    }
}