import jwpPlatform from '@api/jwp-platform';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import jwt from 'jsonwebtoken';

let writingFilePath
let readingFilePath
let site_id = ["S41JwTap", "ct3h32mJ", "lMcJkJek", "NPYshimq", "a7WRo0m6", "hmPC8aAh", "rrdZdc0i", "V0dMg1j2", "wnXNgRL7", "gabeKBmV", "DbaGgv2V", "3Ca2GzOj"]
let signing_secret = {'S41JwTap':'SA1YfNkBti9hGG8PxftAZgYI','ct3h32mJ':'c0jU8OS2C1RUspgIJRRKwyvY','lMcJkJek':'KlQT5l4A5cX5DOp8UkHijwSQ','NPYshimq':'V28WdsR7nJjyGZSj6lTmYO5I','a7WRo0m6':'lxhhy7t8K2v7bkcx19mUE5ef','hmPC8aAh':'3AEcnwii0Q9WAW6mToazaMVK','rrdZdc0i':'cEqjZ5gadtYe3NvXi87HENoA','V0dMg1j2':'vtHOanjw7TzHgIfDh90LvJBO',
'wnXNgRL7':'BBN0xE0uflDwxhmwJKFJvcHg','gabeKBmV':'sUfs4ogPclN0H1zHnPoUsIOI',
'DbaGgv2V':'DQlZhs358RY3MmAkNLvKsDrz','3Ca2GzOj':'XaDxFempvLMA01YWJR08eFSQ'}
let mediaUrls = []
let NEWAPI = process.env.REACT_APP_API_NEW
let test = []

/**get all playlist data*/
/*for (let siteId of site_id) {
    console.log("siteId:",siteId)
    let siteData = await fetchPlaylistData(siteId)
    // console.log("siteData:", siteData)
    test.push(siteData)
}

writingFilePath = './data/playlist/allPlaylist.json';
await writeData(test, writingFilePath)*/

await countFileObject()

// readingFilePath = "./data/playlist/eachPlaylistData.json"
// readingFilePath = "./data/playlist/mediaToDownload.json"
// readingFilePath = "./data/playlist/map.json"
readingFilePath = "./data/Media/allMedia.json"
let data = await readData(readingFilePath)

// await mapPlaylist(data)


/**check if media is present in vercel from mapped data*/


for (let [siteId, playlist] of Object.entries(data[0])) {
    console.log("siteId is:", siteId);
    // console.log("playlist is:", playlist);
    // for (let [playlistId, mediaIds] of Object.entries(playlist)) {
    //     for (let mediaId of mediaIds) {
    //         console.log("mediaId:",mediaId)
    //         let media = await getAndCheckMedia(mediaId, siteId);
    //         if (media) {
    //             mediaUrls.push(...media);
    //         }
    //     }
    // }
}

// console.log("mediaUrls is:", mediaUrls)
// writingFilePath = './data/playlist/notFoundMediaIdsWithUrl.json';
// await writeData(mediaUrls, writingFilePath)

/** download media */
/*readingFilePath = "./data/playlist/notFoundMediaIdsWithUrl.json"
let mediaUrlsToDownload = await readData(readingFilePath)
for (let item of mediaUrlsToDownload) {
    console.log("download id:", item.id)
    let url = item?.videoUrl ? item?.videoUrl : item?.imageUrl
    await downloadMedia(url, item.id)
}*/


async function fetchPlaylistData(siteId) {
    jwpPlatform.auth('0DpEld5ihvgyKVfdgAM5emInZVZKQ1ZESTJZV3RYVTJ4b00ybzVWRmg0Ym10QmJVeEgn');
    //get all the playlists from each property, write them (json data) all into one file
    return jwpPlatform.getV2SitesSite_idPlaylists({ page: '1', page_length: '1000', sort: 'created%3Adsc', site_id: siteId })
        .then(async ({ data }) => {
            // console.log("data is:", data)

            for (let playlist of data.playlists) {
                await deliveryAuthGetEachPlaylist(playlist.id, siteId) //get each playlist data and write into a file
            }

        }
        )
        .catch(err => console.error(err));
}
async function deliveryAuthGetEachPlaylist(id, siteId) {//get and write into a file
    const url = `https://cdn.jwplayer.com/v2/playlists/${id}`;
    const options = { method: 'GET', headers: { accept: 'application/json; charset=utf-8' } };

    try {
        const response = await fetch(url, options);
        const json = await response.json();
        // console.log("json is:", json);
        // console.log("sources:",json?.playlist[0]?.sources) 
        // console.log("tracks:",json?.playlist[0]?.tracks) 
        writingFilePath = './data/playlist/eachPlaylistData.json';
        await writeData({ [siteId]: json }, writingFilePath)
        return json;
    } catch (err) {
        console.error("error is:", err);
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
async function countFileObject() {
    const eachPlaylistData = JSON.parse(await fs.readFile('./data/playlist/notFoundMediaIdsWithUrl.json', 'utf8'));
    console.log("eachPlaylistData length:", eachPlaylistData.length)
}
async function readData(readingFilePath) {
    const data = JSON.parse(await fs.readFile(readingFilePath, 'utf8'));
    // console.log("eachPlaylistData:", eachPlaylistData)
    return data
}
async function mapPlaylist(data) {
    let mapData = {};
    for (let eachPlaylist of data) {
        let siteId = Object.keys(eachPlaylist)[0];
        let item = Object.values(eachPlaylist)[0];
        let playlistId = item["feedid"];
        if (item?.playlist) {
            if (!mapData[siteId]) {
                mapData[siteId] = {};
            }
            mapData[siteId][playlistId] = item.playlist.map(media => media.mediaid);
        }
    }
    console.log("mapData:", mapData);
    writingFilePath = './data/playlist/map.json';
    await writeData([mapData], writingFilePath);
}
export async function getAndCheckMedia(id, siteId) {
    let baseUrl = `https://6z1gtynqfxcjjwix.public.blob.vercel-storage.com`
    // for (let [playlistId, value] of Object.entries(data)) {//key is playlist od and value is an array of media id
    //     for (let id of value) {
    // console.log("mediaId:", id)
    if (typeof id != 'undefined') {
        id = id?.includes("json") ? id?.split(".")[0] : id
        let mediaPresent = await checkForMedia(id, siteId)
        //also check for playlist folder
        // console.log("mediaPresent:", mediaPresent)
        if (mediaPresent) {
            return mediaPresent
        }
    }
    // }
    // console.log("key is:", key)
    // console.log("value is:", value)
    // }
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
                    let url = await jwtSignedUrl(sitepath,siteId);//UPDATE
                    console.log("url:", url)
                    let notFoundMediaUrls = await downloadMediaWorkflowForLeftOverIds(url);
                    console.log("notFoundMediaUrls:", notFoundMediaUrls)
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
                        console.log("err is:", error)
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
                        console.log("err is:", error)
                    }
                }
            }
            return mediaUrls;
        } catch (err) {
            console.log("err is:", err)
        }
    }
    async function jwtSignedUrl(path,siteId) {
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

//{playlist id (feed id):[mediaIds]}
/*{
    "XN8Ydocl":["mediaid","mediaid","mediaid"],
    "XN8Ydocl":["mediaid","mediaid","mediaid"],
}*/