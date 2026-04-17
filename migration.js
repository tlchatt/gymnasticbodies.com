
import csv from 'csv-parser';
import path from 'path';
import fs from 'fs' // not 'fs'
import { writeQueue } from './lib/writeFile.js';
import { readFile } from 'fs/promises'
// let csvData = await getCSVData()
// await storeInFile(csvData)

const userData = JSON.parse(
  await readFile('./data/Migration/userData.json', 'utf8')
)

for (const user of userData) {
  console.log(user.email)


  const config = {
    headers: {
      "Content-Type": "application/json"
    }
  }
  let data = {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,

  }
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









