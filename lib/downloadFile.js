import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { spawn } from 'child_process';
import http from 'http';
import https from 'https';
// import mediaIdsJwPlayerData from '../data/mediaIdsJwplayer.json'
// const execAsync = promisify(exec);

export async function downloadMedia(url, id) {
  try {
    // const outputDir = `public/media2/`;

    //thrive_media - 35 videos (70) - done
    //workouts_media - 20 videos (40) - done
    //supportTesting_media - 6 videos (12) - downloaded uploading on google drive
    //onlineClasses_media - 61 videos
    //testMovingData_media - 75 videos
    //GBProOld_medias - 128 videos
    //customClients_medias - 250 videos
    //lessons_medias - 200 videos
    //gbProPlusReFilm - 376 videos
    //marketing_medias - 585 videos
    //gbProPlus_medias - 983 videos

    const outputDir = `public/Video/`; //for download
    const outputFile = !url.includes(".mp4") ? id + '.jpeg' : id + '.mp4'

    const outputPath = path.join(outputDir, outputFile);
    console.log("outputPath:", outputPath)

    const command = `yt-dlp --verbose ${url} -o ${outputPath}`;
    console.log("command:", command)
    try {
      // const { stdout, stderr } = await execAsync(command);
      const child = spawn('yt-dlp', ['--verbose', url, '-o', outputPath]);


      child.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      child.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });
      child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
      });

    } catch (error) {
      console.error("Error:", error);
      // Handle the error
    }
    return { success: true, message: 'Video downloaded successfully' };


  } catch (error) {
    console.log("erro ris:", error)
    return { success: false, message: 'Failed to download video' };
  }
}
export async function downloadImageToUrl(url, title, id) {

  console.log(' UseServer imageUrl', `${url}`)
  console.log(' UseServer id', `${id}`)

  // let imageUrl1 = url.split('/').slice(-1)
  // let imageUrl2 = imageUrl1[0].split('?')
  // let imageUrl3 = imageUrl2[0]
  // let imageUrl4 = imageUrl3.trim()
  // let imageURlFS = imageUrl4

  const outputFile = !url.includes(".mp4") ? id + '.jpeg' : id + '.mp4'
  console.log("outputFile:", outputFile)
  let client = http;
  if (url.toString().indexOf("https") === 0) {
    client = https;
  }
  return new Promise(async (resolve, reject) => {
    client.get(url, (res) => {
      const writer = fs.createWriteStream(`./public/media2/${outputFile}`);
      res.pipe(writer)
        .on('error', (err) => {
          console.error('Pipe error:', err);
          reject(err);
        })
        .on('finish', async () => {
          console.log("done")
          await updateFile(id, `./public/media2/${outputFile}`)
          resolve(true); // <-- Add this
        });
    }).on('error', (err) => {
      console.error('Client get error:', err);
      reject(err);
    });
  });
}
async function updateFile(id, location) {
  // console.log("mediaIdsJwPlayerData:",mediaIdsJwPlayerData)
  console.log("__dirname:", __dirname)
  const filePath = path.join(process.cwd(), 'data', 'left.json');
  try {
    // const data = await fs.readFile(filePath, 'utf8');
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    // Update your JSON data here
    // const idToFind = 'Kn6ka1Ub';
    // const location = 'path/to/location';
    console.log("id to find is:", id)
    const objIndex = jsonData.findIndex((obj) => obj.id === id);
    if (objIndex !== -1) {
      if (location.includes('.mp4')) {
        jsonData[objIndex].videoLocation = location;
      } else {
        jsonData[objIndex].imageLocation = location;
      }


      //await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
      // await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

      console.log('File updated successfully!');
    } else {
      console.log('Object not found!', id);
    }
  } catch (err) {
    console.error(err);
  }
}