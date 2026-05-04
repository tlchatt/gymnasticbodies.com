
import path from 'path';
import { promises as fs } from 'fs';
import fsp from 'fs/promises' // not 'fs'
//get the email from userData
let authorizeDataFolder = 'AuthorizeData'
let allUserDataFolder = 'Migration'

let authorizeDataFile = '16thApril2026.json'
let allUserDataFile = 'userData.json'



let allData = await getAllDataFromFile(allUserDataFolder, allUserDataFile)//customerData is AuthorizeCustomerData
console.log("allData:", allData.length)//50000

// const dedupEmailsAllData = new Set(
//     allData
//         .map(obj => obj?.email?.toLowerCase()) // use optional chaining in case path missing
//         .filter(email => email) // remove undefined/null
// );
// console.log("dedupEmailsAllData:", dedupEmailsAllData.size) //12466

let authorizeData = await getAllDataFromFile(authorizeDataFolder, authorizeDataFile)//customerData is AuthorizeCustomerData

console.log("authorizeData:", authorizeData.length)//6466


const authorizedEmails = new Set(
    authorizeData
        .map(obj => obj?.result?.profile?.email?.toLowerCase()) // use optional chaining in case path missing
        .filter(email => email) // remove undefined/null
);

// console.log("authorizedEmails:", authorizedEmails.size) //6449
// Check how many allData rows have no email
const noEmail = allData.filter(obj => !obj.email).length;
console.log('No email:', noEmail);//16

// Check unique emails in allData
// const uniqueAll = new Set(allData.map(obj => obj.email?.toLowerCase()).filter(e => e)).size;
// console.log('Unique emails in allData:', uniqueAll);

let newallData = allData.filter(obj => !authorizedEmails.has(obj.email?.toLowerCase()));//all the non authorized users email
console.log("newallData:", newallData.length)//35534

const emailMap = {};
for (const obj of newallData) {
    const email = obj.email?.toLowerCase();
    if (email) emailMap[email] = obj; // later ones overwrite earlier ones
}
newallData = Object.values(emailMap);
console.log("newallData later:", newallData.length);

let otherSourcesDataFolder = 'Migration'
let otherSourcesDataFile = 'otherSourcesUser.json'

let otherSources = await getAllDataFromFile(otherSourcesDataFolder, otherSourcesDataFile)
console.log("otherSources:", otherSources.length)

const uniqueStatuses = [...new Set(otherSources.map(order => order.status))];
console.log("uniqueStatuses:", uniqueStatuses)


const uniquePrices = [...new Set(otherSources.map(order => order.product_net_revenue))];
console.log("uniquePrices:", uniquePrices)

// await storeInFile(newallData)
let count = 0
for (let sourceToTest of otherSources) {
count++
console.log("count:", count)
console.log("source?.order_id:", sourceToTest?.order_id)
// let orderId = '400914'
// let sourceToTest = otherSources.filter(obj => obj?.order_id == orderId);//all the non authorized users email
// console.log("sourceToTest:", sourceToTest)
let order = await woocommerceData(sourceToTest?.order_id)
console.log("order:", order)

let transactionDate, cost, transactionStatus, method, productName, email,number, date_registered

method = order?.payment_method
transactionDate = sourceToTest?.date_created
cost = sourceToTest?.product_net_revenue
transactionStatus = sourceToTest?.status
productName = order?.line_items?.map(item => item.name).join(', ');
date_registered = sourceToTest?.date_registered !="NULL" ? sourceToTest?.date_registered : sourceToTest?.date_created_gmt
email = sourceToTest?.email
number = order?.number
// console.log("order?.payment_method:", order?.payment_method)
// console.log("transactionDate is:", transactionDate)
// console.log("cost is:", cost)
// console.log("transactionStatus is:", transactionStatus)
// console.log("productName is:", productName)
// console.log("number is:", number)
// console.log("date_registered is:", date_registered)

const config = {
    headers: {
        "Content-Type": "application/json"
    }
}
let data = {
    email: email,
    first_name: sourceToTest?.first_name,
    last_name: sourceToTest?.last_name,
    payment_method:method,
    transactionDate:transactionDate,
    cost:cost,
    transactionStatus:transactionStatus,
    productName:productName,
    invoiceNo: number,
    date_registered:date_registered
}
console.log("data:", data)
console.log("count:", count)
try {
    const res = await fetch('http://localhost:3001/api/migration', {
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

async function storeInFile(data) {
    const filePath = path.join(process.cwd(), 'data', 'Migration', 'otherSourcesUser.json');
    let writeChain = Promise.resolve();
    writeChain = writeChain.then(async () => {
        let jsonData = [];
        try {
            const fileData = await fsp.readFile(filePath, 'utf8');
            jsonData = JSON.parse(fileData);
            if (!Array.isArray(jsonData)) jsonData = [];
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }

        jsonData.push(data);
        await fsp.writeFile(filePath, JSON.stringify(jsonData, null, 2));
        console.log("written");
    }).catch(err => {
        console.error('Write failed:', err);
        // don't break the chain for future writes
    });
    await writeChain; // wait for this specific write to finish
    return new Response(JSON.stringify({ message: 'Data successfully written' }), { status: 200 });
}
async function woocommerceData(order_id) {
    const siteUrl = 'https://www.gymnasticbodies.com';
    const consumerKey = 'ck_6e07448a16314df169aec526d4eba044516fcfc3';
    const consumerSecret = 'cs_64ec26efa5f2fb2af0d63d16c6e39032f70b1fc7';
    const orderId = 398023;
    const url = `${siteUrl}/wp-json/wc/v3/orders/${order_id}`;
    const res = await fetch(url, {
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
        }
    });
    if (!res.ok) {
        console.error(`WooCommerce API error: ${res.status}`);
        return false
    }else{
        const order = await res.json();
        return order
    }
    
    // console.log("order:",order)
    // console.log("price is:",order?.total)
    // console.log(order.email, order.total, order.line_items);
}