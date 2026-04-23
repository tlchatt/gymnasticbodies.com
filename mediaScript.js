import jwpPlatform from '@api/jwp-platform';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import jwt from 'jsonwebtoken';

let site_id = ["S41JwTap", "ct3h32mJ", "lMcJkJek", "NPYshimq", "a7WRo0m6", "hmPC8aAh", "rrdZdc0i", "V0dMg1j2", "wnXNgRL7", "gabeKBmV", "DbaGgv2V", "3Ca2GzOj"]
let signing_secret = {
    'S41JwTap': 'SA1YfNkBti9hGG8PxftAZgYI', 'ct3h32mJ': 'c0jU8OS2C1RUspgIJRRKwyvY', 'lMcJkJek': 'KlQT5l4A5cX5DOp8UkHijwSQ', 'NPYshimq': 'V28WdsR7nJjyGZSj6lTmYO5I', 'a7WRo0m6': 'lxhhy7t8K2v7bkcx19mUE5ef', 'hmPC8aAh': '3AEcnwii0Q9WAW6mToazaMVK', 'rrdZdc0i': 'cEqjZ5gadtYe3NvXi87HENoA', 'V0dMg1j2': 'vtHOanjw7TzHgIfDh90LvJBO',
    'wnXNgRL7': 'BBN0xE0uflDwxhmwJKFJvcHg', 'gabeKBmV': 'sUfs4ogPclN0H1zHnPoUsIOI',
    'DbaGgv2V': 'DQlZhs358RY3MmAkNLvKsDrz', '3Ca2GzOj': 'XaDxFempvLMA01YWJR08eFSQ'
}

// for (let siteId of site_id) {
//     // let allMediaData = await getAllMedia(siteId)
//     let writingFilePath = './data/Media/allMedia.json';
//     await writeData({ [siteId]: allMediaData }, writingFilePath)
// }

// await countFileObject()
let mediaUrls = []
let writingFilePath
let readingFilePath = "./data/Media/eachMediaData.json"
let data = await readData(readingFilePath)
let mediaData = []

for (let item of data) {
    // console.log("item is:",item)
    for (let [siteId, allMedia] of Object.entries(item)) {
        console.log("siteId is:", siteId);

        // console.log("playlist is:", allMedia['media']);
        // let medias = allMedia['media']
        // for (let media of medias) {
        //     let mediaIs = await getAndCheckMedia(media.id, siteId);
        //     let eachMediaData = await getMediaData(media.id, siteId);
        //     if (mediaIs) {
        //         mediaUrls.push(...mediaIs);
        //     }
        // }
        // let writingFilePath = './data/Media/eachMediaData.json';
        // await writeData({ [siteId]: mediaData }, writingFilePath)

        for (let media of allMedia) {
            console.log("media is:media", media)
            // for(let playlist of media.playlist){
                if(media?.playlist[0]?.tracks){
                    for(let track of media?.playlist[0]?.tracks){
                        if(track.file && track.file.includes(".vtt")){
                            console.log("track.file is:", track.file)
                            console.log("playlist.mediaid is:", media?.playlist[0].mediaid)
                            let vttDownloadResponse = await downloadVTT(track.file, media?.playlist[0].mediaid)
                            console.log("vttDownloadResponse is:", vttDownloadResponse) 
                        }
                    }
                }
            // }
        }

    }
}
// console.log("mediaUrls is:", JSON.stringify(mediaUrls))
// writingFilePath = './data/Media/notFoundMediaIdsWithUrlNew.json';
// await writeData(mediaUrls, writingFilePath)


/** download media */
// let readingFilePath = "./data/Media/notFoundMediaIdsWithUrl2.json"
// let mediaUrlsToDownload = await readData(readingFilePath)
// for (let item of mediaUrlsToDownload) {
//     console.log("download id:", item.id)
//     let url = item?.videoUrl ? item?.videoUrl : item?.imageUrl
//     await downloadMedia(url, item.id)
// }

async function countFileObject() {
    const eachPlaylistData = JSON.parse(await fs.readFile('./data/Media/notFoundMediaIdsWithUrl2.json', 'utf8'));
    console.log("eachPlaylistData length:", eachPlaylistData.length)
}
async function getAllMedia(siteId) {
    try {
        // let secret = signing_secret[siteId];
        const res = await fetch(`https://api.jwplayer.com/v2/sites/${siteId}/media/?page_length=3000`, {
            method: 'GET', // Optional, GET is default
            headers: {
                'Authorization': 'j2WebogTynhn0sKJBIFP7mInYlhoRlZYaHlXbk5RV210dmFHUldiSE5QZFZrM2VXeFQn',
            }
        })// Fetch data from an API route or external API
        if (!res.ok) {
            throw new Error('Failed to fetch data');
        }
        const json = await res.json();
        console.log("json is:", json)
        return json
    } catch (err) {
        console.log("error in getAllMedia is:", err.message)
    }
}
export async function writeData(data, writingFilePath) {
    // console.log("writingFilePath length:", data)
    data = data ?? []
    let existingData = [];
    let updatedData
    if (existsSync(writingFilePath)) {
        existingData = JSON.parse(await fs.readFile(writingFilePath, 'utf8'));
    } else {
        console.error('Error reading file:');
    }
    if (Array.isArray(data)) {
        updatedData = [...existingData, ...data];
    } else {
        updatedData = [...existingData, data];
    }

    await fs.writeFile(writingFilePath, JSON.stringify(updatedData, null, 2));
}
async function readData(readingFilePath) {
    const data = JSON.parse(await fs.readFile(readingFilePath, 'utf8'));
    // console.log("eachPlaylistData:", eachPlaylistData)
    return data
}
async function getMediaData(id, siteId) {
    let sitepath = `/v2/sites/${siteId}/media/${id}/playback.json`;//UPDATE
    let url = await jwtSignedUrl(sitepath, siteId);//UPDATE
    let mediaUrls = [];
    try {
        const res = await fetch(url); // Fetch data from an API route or external API
        if (!res.ok) {
            console.log("res error in fownloadMedia is:", res.statusText)
            throw new Error('Failed to fetch data');
        }
        const json = await res.json();
        console.log("json is:", JSON.stringify(json))

        return json;
    } catch (err) {
        console.log("err is:", err)
    }
}
export async function getAndCheckMedia(id, siteId) {
    let baseUrl = `https://6z1gtynqfxcjjwix.public.blob.vercel-storage.com`
    if (typeof id != 'undefined') {
        id = id?.includes("json") ? id?.split(".")[0] : id
        let media = await checkForMedia(id, siteId)

        if (media) {
            return media
        }
    }
    async function checkForMedia(id, siteId) {

        let url = `${baseUrl}/${id}.mp4`;
        // console.log("url in checkForMedia:", url)
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                console.log('Media found for:', id, " header: ", response.headers.get('Content-Type'));//video / mp4
                // return url;
            } else {
                //check if its a folder
                // id = id?.includes("json") ? id?.split(".")[0] : `${id}`
                // let urlsFromMediaFolder = await checkForFolder(id)
                // if (urlsFromMediaFolder) {
                //     return urlsFromMediaFolder
                // } else {
                let replyTo = 'error@tlchatt.com'
                if (id) {
                    console.log("Media NOT FOUND FOR ID:", id)
                    let sitepath = `/v2/sites/${siteId}/media/${id}/playback.json`;//UPDATE
                    let url = await jwtSignedUrl(sitepath, siteId);//UPDATE
                    console.log("url:", url)
                    let notFoundMediaUrls = await downloadMediaWorkflowForLeftOverIds(url);

                    return notFoundMediaUrls


                    /*const config = {
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                    let data = {
                        to: replyTo,
                        bcc: 'contact@tlchatt.com',
                        from: 'contact@tlchatt.com',
                        subject: `Gymnasticbodies - Media not found with Id ${id}`,
                        replyTo: replyTo,
                        mediaId: `${id}`
                    }
                    try {
                        const res = await fetch(NEWAPI + '/api/error', {
                            method: 'POST',
                            headers: {
                                ...config.headers,
                            },
                            body: JSON.stringify(data),
                        });
                        if (res.ok) {
                            const responseData = await res.json();
                            // handle response data
                        } else {
                            // handle error
                        }
                    } catch (error) {
                        // handle fetch error
                    }*/
                }
                // }
            }
        } catch (error) {
            console.error('Media NOT FOUND Else Error:', error);
        }
    }

    async function checkForFolder() {
        const config = {
            headers: {
                "Content-Type": "application/json"
            }
        }
        let data = {
            mediaId: `${id}`
        }
        try {
            const res = await fetch('http://localhost:3001/api/mediaBlob', {
                method: 'POST',
                headers: {
                    ...config.headers,
                },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const responseData = await res.json();
                console.log("responseData:", responseData)
                return responseData.url
                // handle response data
            } else {
                // handle error

            }
        } catch (error) {
            // handle fetch error
        }


    }
    async function downloadMediaWorkflowForLeftOverIds(url) {
        let mediaUrls = [];
        try {
            const res = await fetch(url); // Fetch data from an API route or external API
            if (!res.ok) {
                console.log("res error in fownloadMedia is:", res.statusText)
                throw new Error('Failed to fetch data');
            }
            const json = await res.json();


            let id, manifests, images, lastImage, videoUrl, manifestFile
            for (let eachPlaylist of json?.playlist) {
                id = eachPlaylist?.mediaid
                manifests = eachPlaylist?.sources //is an array
                manifests = manifests.reverse();
                images = eachPlaylist?.images
                lastImage = images.at(-1);

                const manifest1920 = manifests.find(m => m.width === 1920);
                const manifest1280 = manifests.find(m => m.width === 1280);
                const manifest720 = manifests.find(m => m.width === 720);
                const manifest640 = manifests.find(m => m.width === 640);
                const manifest480 = manifests.find(m => m.width === 480);
                const manifest320 = manifests.find(m => m.width === 320);
                const manifest_1 = manifests.find(m => m.width === -1);

                if (manifest1920) {
                    manifestFile = manifest1920.file
                }
                else if (manifest1280) {
                    manifestFile = manifest1280.file
                }
                else if (manifest720) {
                    manifestFile = manifest720.file
                }
                else if (manifest640) {
                    manifestFile = manifest640.file
                }
                else if (manifest480) {
                    manifestFile = manifest480.file
                }
                else if (manifest320) {
                    manifestFile = manifest320.file
                } else {
                    manifestFile = manifest_1.file
                }

                if (manifestFile) {
                    try {
                        const res = await fetch(manifestFile);
                        videoUrl = res.url
                        console.log("videoUrl::", videoUrl);
                        mediaUrls.push({ id: id, videoUrl: videoUrl })
                    } catch (error) {
                        console.log("err in manifestFile is:", error.message)
                    }
                }
                if (lastImage) {
                    // console.log("last image is:", lastImage)
                    try {
                        const res = await fetch(lastImage.src);
                        let imageUrl = res.url
                        mediaUrls.push({ id: id, imageUrl: imageUrl })
                        console.log("imageUrl::", imageUrl);

                    } catch (error) {
                        console.log("err in lastImage is:", error)
                    }
                }
            }
            return mediaUrls;
        } catch (err) {
            console.log("err is:", err)
        }
    }


}
export async function downloadVTT(url, id) {
    try {
        const outputDir = `public/Audio/`; //for download
        const outputFile = id + '.vtt'

        const outputPath = path.join(outputDir, outputFile);
        console.log("outputPath:", outputPath)

        const command = `yt-dlp --progress --verbose --timeout 600  ${url} -o ${outputPath}`;
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
export async function downloadMedia(url, id) {
    try {
        const outputDir = `public/Video/`; //for download
        const outputFile = !url.includes(".mp4") ? id + '.jpeg' : id + '.mp4'

        const outputPath = path.join(outputDir, outputFile);
        console.log("outputPath:", outputPath)

        const command = `yt-dlp --progress --verbose --timeout 600  ${url} -o ${outputPath}`;
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
async function jwtSignedUrl(path, siteId) {
    const host = 'https://cdn.jwplayer.com';
    const now = Math.floor(Date.now() / 1000);

    const payload = {
        resource: path,
        // Put any accepted query params here, not in the URL, for example:
        // related_media_id: 'RltV8MtT',
        exp: Math.ceil((now + 3600) / 300) * 300, // valid for 1h
    };
    let secret = signing_secret[siteId];
    const token = jwt.sign(payload, secret, {
        algorithm: 'HS256',
        noTimestamp: true, // omit "iat" to maximize cacheability
    });

    return `${host}${path}?token=${token}`;
}