// RETIRED (2026-10-12): the one-time Authorize.net/WooCommerce user import this drove is finished,
// and the route it posted to, /api/migration, was deleted in 87c4e2c. Kept for reference only.
console.error('migration.js is retired: /api/migration no longer exists (removed in 87c4e2c).')
process.exit(1)


import csv from 'csv-parser';
import path from 'path';
import fs from 'fs' // not 'fs'
import { writeQueue } from './lib/writeFile.js';
import { readFile } from 'fs/promises'

// let csvData = await getCSVData()
// await storeInFile(csvData)

const authorizeUserData = JSON.parse(
  await readFile('./data/AuthorizeData/19thApril2026.json', 'utf8')
)
const allUsers = JSON.parse(
  await readFile('./data/Migration/userData.json', 'utf8')
)
let count = 0
for (const user of authorizeUserData) {
  console.log(user.email)
  count++
  let email = user?.result?.profile?.email?.toLowerCase()
  let userFound = allUsers.find(obj => obj.email?.toLowerCase() === email);
  console.log("userFound:",userFound)
  const config = {
    headers: {
      "Content-Type": "application/json"
    }
  }
  let data = {
    email: email,
    first_name: userFound?.first_name,
    last_name: userFound?.last_name,
  }
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
  }
}









