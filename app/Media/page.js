// 'use client';

import { Box, Typography } from '@mui/material';
import { downloadImageToUrl, downloadMedia } from '@/lib/downloadFile';
import { getMatchInMediaData, mapMediaData } from '@/lib/commonFunctions';
import mediaIdsJwplayer from '@/data/mediaIdsJwplayerWithLocation.json'
import mediaData from '@/data/mediaData.json'
import howTos from '@/data/howTosJwPlayer.json'
import data from '@/data/test.json'
// import leftMediaUrl from '@/data/leftMediaUrls.json'
// import remainingData from '@/data/left.json'
import path from 'path';
import completeData from '@/data/done.json'
import whiteBoardCategoryData from '@/data/test.json'
import jwt from 'jsonwebtoken';
import { sendMediaToVercel, uploadToVercelBlob } from '@/lib/commonServerFunction';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { put } from '@vercel/blob'
import { spawn } from 'child_process';
import thriveData from '@/data/mediaData_Thrive.json'
import thriveDataUrls from '@/data/mediaData_Thrive_mediaUrls.json'
import workoutData2 from '@/data/mediaData_Workout.json'
import workoutData2DataUrls from '@/data/mediaData_Workout_mediaUrls.json'
import testMovingData from '@/data/mediaData_TestMovingData.json'
import testMovingDataDataUrls from '@/data/mediaData_TestMovingData_mediaUrls.json'

import supportTesting from '@/data/mediaData_SupportTesting.json'
import supportTestingDataUrls from '@/data/mediaData_SupportTesting_mediaUrls.json'

import onlineClasses from '@/data/mediaData_OnlineClasses.json'
import onlineClassesDataUrls from '@/data/mediaData_OnlineClasses_mediaUrls.json'

import gbProRefilm from '@/data/mediaData_GB_Pro_ReFlim.json'
import gbProRefilmDataUrls from '@/data/mediaData_GB_Pro_ReFlim_mediaUrls.json'


import gbProOld from '@/data/mediaData_GB_Pro+(OLD).json'
import gbProOldDataUrls from '@/data/mediaData_GB_Pro+(OLD)_mediaUrls.json'

import lessons from '@/data/mediaData_Lessons.json'
import lessonsDataUrls from '@/data/mediaData_Lessons_mediaUrls.json'


import gbPro from '@/data/mediaData_GB_Pro+.json'
import gbProDataUrls from '@/data/mediaData_GB_Pro+_mediaUrls.json'

import customClients from '@/data/mediaData_CustomClients.json'
import customClientsDataUrls from '@/data/mediaData_CustomClients_mediaUrls.json'

import { convertProcessSignalToExitCode } from 'util';
import marketing from '@/data/mediaData_Marketing.json'
import marketingDataUrls from '@/data/mediaData_Marketing_mediaUrls.json'

import restoreHamstringPlaylistData from '@/data/restoreHamstringPlaylistData.json'
import restoreHamstringPlaylistDataUrls from '@/data/restoreHamstringPlaylistData_mediaUrls.json'

import thoracicBridgePlaylistData from '@/data/thoracicBridgePlaylistData.json'
import thoracicBridgePlaylistDataUrls from '@/data/thoracicBridgePlaylistData_mediaUrls.json'


import quadRestorePlaylistData from '@/data/quadRestorePlaylistData.json'
import quadRestorePlaylistDataDataUrls from '@/data/quadRestorePlaylistData_mediaUrls.json'

import hipRestorePlaylistData from '@/data/hipRestorePlaylistData.json'
import hipRestorePlaylistDataDataUrls from '@/data/hipRestorePlaylistData_mediaUrls.json'

import scapulaRestorePlaylistData from '@/data/scapulaRestorePlaylistData.json'
import scapulaRestorePlaylistData_mediaUrls from '@/data/scapulaRestorePlaylistData_mediaUrls.json'

import thoracicRestorePlaylistData from '@/data/thoracicRestorePlaylistData.json'
import thoracicRestorePlaylistData_mediaUrls from '@/data/thoracicRestorePlaylistData_mediaUrls.json'

import shoulderRestorePlaylistData from '@/data/shoulderRestorePlaylistData.json'
import shoulderRestorePlaylistData_mediaUrls from '@/data/shoulderRestorePlaylistData_mediaUrls.json'

import ankleAndKneeRestorePlaylistData from '@/data/ankleAndKneeRestorePlaylistData.json'
import ankleAndKneeRestorePlaylistData_mediaUrls from '@/data/ankleAndKneeRestorePlaylistData_mediaUrls.json'

import otherPlaylistData from '@/data/other.json'
import otherPlaylistData_mediaUrls from '@/data/other_mediaUrls.json'


export default async function Media() {

    let titleStyle = {
        color: "#656464",
        padding: "24px 0 0",
    }

    // console.log("onlineClassesDataUrls", onlineClassesDataUrls.length)
    // console.log("gbProDataUrls", gbProDataUrls.length)


    /*map program / class Data /jw ,media data*/
    // await mapMediaData();


    /*for hotTo videos*/
    // if (howTos) {
    //     console.log("howTos:", howTos)
    //     for (const how of howTos) {
    //         if (how.playlist) {
    //             await downloadMediaWorkflowForHowTos(how)
    //         }
    //     }

    // }

    /*for workout and program category videos after mapping*/
    // for (const item of mediaIdsJwplayer) {
    //     let name = item?.videoName ?? item.mediaId
    //     console.log("url:", name)
    //     await downloadMediaWorkflow(name)
    // await downloadMediaWorkflow()
    // }

    /*for whiteboard category videos*/
    // for (let whiteboard of whiteBoardCategoryData) {
    //     let name = whiteboard?.videoName ?? whiteboard.mediaId
    //     console.log("url:", name)
    //     await downloadMediaWorkflow(name)
    // }

    // await getMatchInMediaData(mediaIdsJwplayer,mediaData)
    // Configuration (edit these values)

    /*download media*/
    // for (let item of leftMediaUrl) {
    //     let url = item?.imageUrl ? item?.imageUrl : item?.videoUrl
    //     console.log("url on page is:", url)
    //     let vercelUpload = await uploadToVercelBlob(item.id, url)
    //     console.log("vercelupload is:", vercelUpload)
    // }


    let signing_secret = 'SA1YfNkBti9hGG8PxftAZgYI'
    let Thrive_signing_secret = 'c0jU8OS2C1RUspgIJRRKwyvY';
    let GB_Pro_OLD_signing_secret = 'KlQT5l4A5cX5DOp8UkHijwSQ';
    let Online_Classes_signing_secret = 'V28WdsR7nJjyGZSj6lTmYO5I';
    let GB_Pro_signing_secret = 'lxhhy7t8K2v7bkcx19mUE5ef';
    let Marketing_signing_secret = '3AEcnwii0Q9WAW6mToazaMVK';
    let GB_Pro_Refilm_signing_secret = 'cEqjZ5gadtYe3NvXi87HENoA';
    let Lessons_signing_secret = 'vtHOanjw7TzHgIfDh90LvJBO';
    let Custom_Clients_signing_secret = 'BBN0xE0uflDwxhmwJKFJvcHg';
    let Workouts_signing_secret = 'sUfs4ogPclN0H1zHnPoUsIOI';
    let supportTesting_signing_secret = 'DQlZhs358RY3MmAkNLvKsDrz';
    let testing_Moving_Data_signing_secret = 'XaDxFempvLMA01YWJR08eFSQ';

    let site_id = 'S41JwTap';
    let thrive_site_Id = 'ct3h32mJ'
    let GB_Pro_OLD_site_Id = 'lMcJkJek';
    let Online_Classes_site_Id = 'NPYshimq';
    let GB_Pro_site_Id = 'a7WRo0m6';
    let Marketing_site_Id = 'hmPC8aAh';
    let GB_Pro_Refilm_site_Id = 'rrdZdc0i';
    let Lessons_site_Id = 'V0dMg1j2';
    let Custom_Clients_site_Id = 'wnXNgRL7';
    let Workouts_site_Id = 'gabeKBmV';
    let supportTesting_site_Id = 'DbaGgv2V';
    let testing_Moving_Data_site_Id = '3Ca2GzOj';
    let url, sitepath
    let mediaUrls = []
    let count = 0;
    let fileWritten = false;
    // const directory = './public/media2/';//for upload
    // let files = await fs.readdir(directory);

    //download media of remaining data:
    await Promise.all([

        /*downloading media using url*/

        otherPlaylistData_mediaUrls.map(async (item) => {
            if (!item?.done) {
                console.log("item is:", item)
                let url = item?.imageUrl ? item?.imageUrl : item?.videoUrl;
                console.log("url on page is:", url);
                let download = await downloadMedia(url, item.id);
                console.log("download is:", download);
                item.done = true;
                const filePath = path.join(process.cwd(), './data/other_mediaUrls.json');
                await fs.writeFile(filePath, JSON.stringify(other_mediaUrls.json, null, 2));
            }
        })

        /*writing media url to the file start*/

        // (async () => {
        //     for (const media of thriveData) {
        //         console.log("media id:", media.id)
        //         sitepath = `/v2/sites/${site_id}/media/${media.id}/playback.json`;
        //         url = await jwtSignedUrl(sitepath,signing_secret);

        //         await downloadMediaWorkflowForLeftOverIds(url);
        //         count++;
        //         console.log(`Processed ${count} of ${thriveData.length} media items`);
        //     }
        // })(),

        (async () => {
            for (const media of otherPlaylistData) {
                console.log("media id:", media.id)
                sitepath = `/v2/sites/${site_id}/media/${media.id}/playback.json`;//UPDATE
                url = await jwtSignedUrl(sitepath, signing_secret);//UPDATE
                console.log("url:", url)
                await downloadMediaWorkflowForLeftOverIds(url);
                count++;
                console.log(`Processed ${count} of ${otherPlaylistData.length} media items`);
            }
        })(),

    ]);

    if (!fileWritten) {
        console.log("mediaUrls:", mediaUrls)
        const filePath = './data/other_mediaUrls.json';//UPDATE

        let existingData = [];
        if (existsSync(filePath)) {
            existingData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        } else {
            console.error('Error reading file:');
        }
        const updatedData = [...existingData, ...mediaUrls];
        await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2));
        fileWritten = true;
    }

    /*writing media url to the file end*/

    /*tried multiple process for vercel put*/
    /*files.forEach((file) => {
        const filePath = path.join(directory, file);
        const command = 'npx';
        const args = [
            'vercel',
            'blob',
            'put',
            filePath,
            '--allow-overwrite',
            '--rw-token',
            'vercel_blob_rw_6Z1GtynqFXCJJwIX_kcRQL3bL6TOzXKBxEyQj4faamoNzxE',
        ];
        const child = spawn(command, args);
        child.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        child.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        child.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    })*/
    return (

        <Typography variant='h3' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>Videos
        </Typography>

    );
    async function downloadMediaWorkflowForLeftOverIds(url) {
        //gives you video file detail like name 
        // let baseUrl = 'https://content.jwplatform.com/feeds/'
        // let filePartInUrl = 'ZS4ZGD4l.json?exp=1773243115345&sig=baba8f44d5f2963d7d582cde1c2c3491'
        // let url = `${baseUrl}${videoName}`
        // let url = `${baseUrl}${filePartInUrl}`


        try {
            const res = await fetch(url); // Fetch data from an API route or external API
            if (!res.ok) {
                throw new Error('Failed to fetch data');
            }
            const json = await res.json();
            // console.log("json is:", json)
            let exampleJson = {
                "title": "HBPPE1-Tech.mp4",
                "kind": "single item",
                "playlist": [
                    {
                        "title": "HBPPE1-Tech.mp4",
                        "mediaid": "IP1MFSPF",
                        "link": "https://content.jwplatform.com/previews/IP1MFSPF?exp=1773239849205&sig=9e7050196b6cc62ce3f37fc92de17e9e",
                        "image": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=720",
                        "images": [
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=320",
                                "width": 320,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=480",
                                "width": 480,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=640",
                                "width": 640,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=720",
                                "width": 720,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=1280",
                                "width": 1280,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=1920",
                                "width": 1920,
                                "type": "image/jpeg"
                            }
                        ],
                        "duration": 95,
                        "pubdate": 1471888606,
                        "description": "",
                        "tags": "Upper Not Follow Along",
                        "custom": {

                        },
                        "sources": [
                            {
                                "file": "https://content.jwplatform.com/manifests/IP1MFSPF.m3u8?exp=1773239849205&sig=b96d291d2b023435aa5829dfbda8e873",
                                "duration": 95,
                                "type": "application/vnd.apple.mpegurl"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-Kto0Jxz1.mp4?exp=1773239849205&sig=cc9d3eb729150e9c6ec64ee7c8c9bb23",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 180,
                                "width": 320,
                                "label": "H.264 320px"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-NTNd90lS.mp4?exp=1773239849205&sig=c23c8fa3e286be508c53198f0366209f",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 270,
                                "width": 480,
                                "label": "H.264 480px"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-UCZo3Xfs.mp4?exp=1773239849205&sig=c78e7897048477db03dfd1230ea52287",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 406,
                                "width": 720,
                                "label": "H.264 720px"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-r7GgoZS9.mp4?exp=1773239849205&sig=b6f92bf16983965a6489eda6f0152656",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 720,
                                "width": 1280,
                                "label": "H.264 1280px"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-qqj8j44S.m4a?exp=1773239849205&sig=6f93576d2d9c39db8a2ff4b5a6d7c6c6",
                                "duration": 95,
                                "type": "audio/mp4",
                                "height": -1,
                                "width": -1,
                                "label": "AAC Audio"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-plcfVP8W.mp4?exp=1773239849205&sig=bff2995bbf2df9d4d18357ce89a9240c",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 1080,
                                "width": 1920,
                                "label": "H.264 1920px"
                            }
                        ],
                        "tracks": [
                            {
                                "file": "https://content.jwplatform.com/strips/IP1MFSPF-120.vtt",
                                "kind": "thumbnails"
                            }
                        ],
                        "variations": {

                        }
                    }
                ],
                "feed_instance_id": "0aee105e-9e78-4eec-be56-485b385f4d07"
            }
            let id = json?.playlist[0]?.mediaid
            // console.log("id is:", id)

            let title = json?.playlist[0]?.title ?? "No title found"
            let manifests = json?.playlist[0]?.sources //is an array

            manifests = manifests.reverse();
            // console.log("manifests:", manifests)
            let images = json?.playlist[0]?.images
            const lastImage = images.at(-1);
            // console.log("lastImage is:", lastImage)

            const manifest1920 = manifests.find(m => m.width === 1920);
            const manifest1280 = manifests.find(m => m.width === 1280);
            const manifest720 = manifests.find(m => m.width === 720);
            const manifest640 = manifests.find(m => m.width === 640);
            const manifest480 = manifests.find(m => m.width === 480);
            const manifest320 = manifests.find(m => m.width === 320);
            const manifest_1 = manifests.find(m => m.width === -1);
            let videoUrl, manifestFile
            if (manifest1920) {

                manifestFile = manifest1920.file
                // try {

                //     const res = await fetch(manifest1920.file);
                //     videoUrl = res.url
                //     console.log("videoUrl .......... 1:", videoUrl);

                //     await downloadMedia(videoUrl, title, id)

                // } catch (error) {
                //     console.log("err is:", error)
                // }
            }
            else if (manifest1280) {
                manifestFile = manifest1280.file
                // try {

                //     const res = await fetch(manifest1280.file);
                //     videoUrl = res.url
                //     console.log("videoUrl .......... 2:", videoUrl);
                //     await downloadMedia(videoUrl, title, id)

                // } catch (error) {
                //     console.log("err is:", error)
                // }
            }
            else if (manifest720) {
                manifestFile = manifest720.file
                // try {

                //     const res = await fetch(manifest720.file);
                //     videoUrl = res.url
                //     console.log("videoUrl .......... 3:", videoUrl);
                //     await downloadMedia(videoUrl, title, id)

                // } catch (error) {
                //     console.log("err is:", error)
                // }
            }
            else if (manifest640) {
                manifestFile = manifest640.file
                // try {

                //     const res = await fetch(manifest640.file);
                //     videoUrl = res.url
                //     console.log("videoUrl .......... 4:", videoUrl);
                //     await downloadMedia(videoUrl, title, id)

                // } catch (error) {
                //     console.log("err is:", error)
                // }
            }
            else if (manifest480) {
                manifestFile = manifest480.file
                // try {

                //     const res = await fetch(manifest480.file);
                //     videoUrl = res.url
                //     console.log("videoUrl .......... 5:", videoUrl);
                //     await downloadMedia(videoUrl, title, id)

                // } catch (error) {
                //     console.log("err is:", error)
                // }
            }
            else if (manifest320) {
                manifestFile = manifest320.file
                // try {

                //     const res = await fetch(manifest320.file);
                //     videoUrl = res.url
                //     console.log("videoUrl .......... 6:", videoUrl);
                //     await downloadMedia(videoUrl, title, id)

                // } catch (error) {
                //     console.log("err is:", error)
                // }
            } else {
                manifestFile = manifest_1.file
                // try {

                //     const res = await fetch(manifest_1.file);
                //     videoUrl = res.url
                //     console.log("videoUrl .......... 7:", videoUrl);
                //     await downloadMedia(videoUrl, title, id)

                // } catch (error) {
                //     console.log("err is:", error)
                // }
            }

            if (manifestFile) {
                try {
                    const res = await fetch(manifestFile);
                    videoUrl = res.url
                    console.log("videoUrl::", videoUrl);
                    // console.log("id::", id);
                    mediaUrls.push({ id: id, videoUrl: videoUrl })
                    // let test = await downloadImageToUrl(videoUrl, title, id)
                    // console.log("test is:",test)
                    // const response = await fetch(videoUrl);
                    // console.log("response body:", response.body)
                    // try {
                    // let blobUrl = await sendMediaToVercel(id,response)
                    // console.log("blobUrl video outside:",blobUrl)
                    // let blob = await put(`${id}.mp4`, response.body, {
                    //     access: 'public',
                    //     token: process.env.BLOB_READ_WRITE_TOKEN
                    // });
                    // console.log('Uploaded:', blob.url);
                    // } catch (e) {
                    //     console.error('Upload error:', e);
                    // }
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
                    // console.log("id::", id);
                    // const response = await fetch(imageUrl);
                    // let blobUrl = await sendMediaToVercel(id,response)
                    // console.log("blobUrl image outside:",blobUrl)
                    // let test = await downloadImageToUrl(imageUrl, title, id)
                    // console.log("test is:",test)

                } catch (error) {
                    console.log("err is:", error)
                }
            }

        } catch (err) {
            console.log("err is:", err)
        }
    }
    async function downloadMediaWorkflow(videoName) {
        //gives you video file detail like name 
        let baseUrl = 'https://content.jwplatform.com/feeds/'
        // let filePartInUrl = 'ZS4ZGD4l.json?exp=1773243115345&sig=baba8f44d5f2963d7d582cde1c2c3491'
        let url = `${baseUrl}${videoName}`
        // let url = `${baseUrl}${filePartInUrl}`

        let id = videoName?.split(".")[0]
        console.log("id is:", id)
        try {
            const res = await fetch(url); // Fetch data from an API route or external API
            if (!res.ok) {
                throw new Error('Failed to fetch data');
            }
            const json = await res.json();
            let exampleJson = {
                "title": "HBPPE1-Tech.mp4",
                "kind": "single item",
                "playlist": [
                    {
                        "title": "HBPPE1-Tech.mp4",
                        "mediaid": "IP1MFSPF",
                        "link": "https://content.jwplatform.com/previews/IP1MFSPF?exp=1773239849205&sig=9e7050196b6cc62ce3f37fc92de17e9e",
                        "image": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=720",
                        "images": [
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=320",
                                "width": 320,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=480",
                                "width": 480,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=640",
                                "width": 640,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=720",
                                "width": 720,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=1280",
                                "width": 1280,
                                "type": "image/jpeg"
                            },
                            {
                                "src": "https://content.jwplatform.com/v2/media/IP1MFSPF/poster.jpg?width=1920",
                                "width": 1920,
                                "type": "image/jpeg"
                            }
                        ],
                        "duration": 95,
                        "pubdate": 1471888606,
                        "description": "",
                        "tags": "Upper Not Follow Along",
                        "custom": {

                        },
                        "sources": [
                            {
                                "file": "https://content.jwplatform.com/manifests/IP1MFSPF.m3u8?exp=1773239849205&sig=b96d291d2b023435aa5829dfbda8e873",
                                "duration": 95,
                                "type": "application/vnd.apple.mpegurl"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-Kto0Jxz1.mp4?exp=1773239849205&sig=cc9d3eb729150e9c6ec64ee7c8c9bb23",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 180,
                                "width": 320,
                                "label": "H.264 320px"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-NTNd90lS.mp4?exp=1773239849205&sig=c23c8fa3e286be508c53198f0366209f",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 270,
                                "width": 480,
                                "label": "H.264 480px"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-UCZo3Xfs.mp4?exp=1773239849205&sig=c78e7897048477db03dfd1230ea52287",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 406,
                                "width": 720,
                                "label": "H.264 720px"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-r7GgoZS9.mp4?exp=1773239849205&sig=b6f92bf16983965a6489eda6f0152656",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 720,
                                "width": 1280,
                                "label": "H.264 1280px"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-qqj8j44S.m4a?exp=1773239849205&sig=6f93576d2d9c39db8a2ff4b5a6d7c6c6",
                                "duration": 95,
                                "type": "audio/mp4",
                                "height": -1,
                                "width": -1,
                                "label": "AAC Audio"
                            },
                            {
                                "file": "https://content.jwplatform.com/videos/IP1MFSPF-plcfVP8W.mp4?exp=1773239849205&sig=bff2995bbf2df9d4d18357ce89a9240c",
                                "duration": 95,
                                "type": "video/mp4",
                                "height": 1080,
                                "width": 1920,
                                "label": "H.264 1920px"
                            }
                        ],
                        "tracks": [
                            {
                                "file": "https://content.jwplatform.com/strips/IP1MFSPF-120.vtt",
                                "kind": "thumbnails"
                            }
                        ],
                        "variations": {

                        }
                    }
                ],
                "feed_instance_id": "0aee105e-9e78-4eec-be56-485b385f4d07"
            }
            // console.log("json is:", json.playlist[0].images)
            let title = json?.title ?? "No title found"
            // console.log("title is:", title)

            let manifests = json?.playlist[0]?.sources //is an array
            manifests = manifests.reverse();
            console.log("manifests:", manifests)
            // const manifest = manifests.at(-1);
            // console.log("manifest is:", manifest)
            let images = json?.playlist[0]?.images
            const lastImage = images.at(-1);
            console.log("lastImage is:", lastImage)

            // if (manifest) {


            //     try {

            //         const res = await fetch(manifest.file);
            //         let videoUrl = res.url
            //         let videoLabel = manifest.label + "_" + json?.playlist[0]?.mediaid
            //         console.log("videoUrl ..........:", videoUrl);
            //         await downloadMedia(videoUrl, title, id)
            //     } catch (error) {
            //         console.log("err is:", error)
            //     }
            // }
            const manifest1920 = manifests.find(m => m.width === 1920);
            const manifest1280 = manifests.find(m => m.width === 1280);
            const manifest720 = manifests.find(m => m.width === 720);
            const manifest640 = manifests.find(m => m.width === 640);
            const manifest480 = manifests.find(m => m.width === 480);
            const manifest320 = manifests.find(m => m.width === 320);
            const manifest_1 = manifests.find(m => m.width === -1);
            if (manifest1920) {
                try {

                    const res = await fetch(manifest1920.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest1280) {
                try {

                    const res = await fetch(manifest1280.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest720) {
                try {

                    const res = await fetch(manifest720.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest640) {
                try {

                    const res = await fetch(manifest640.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest480) {
                try {

                    const res = await fetch(manifest480.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest320) {
                try {

                    const res = await fetch(manifest320.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            } else {
                try {

                    const res = await fetch(manifest_1.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }



            if (lastImage) {
                try {
                    const res = await fetch(lastImage.src);
                    let imageUrl = res.url
                    console.log("imageUrl ..........:", imageUrl);

                    await downloadMedia(imageUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            // for (let image of images) {
            //     let imageLabel = `poster_${image?.width}` + "_" + json?.playlist[0]?.mediaid
            //     if (image?.width == 1920 || image?.width == 1280 || image?.width == 720 || image?.width == 640 || image?.width == 480 || image?.width == 320 || image?.width == -1) {
            //         try {
            //             const res = await fetch(image.src);
            //             let imageUrl = res.url
            //             console.log("imageUrl ..........:", imageUrl);

            //             // await downloadMedia(imageUrl, title, id)

            //         } catch (error) {
            //             console.log("err is:", error)
            //         }
            //     }


            // }

        } catch (err) {
            console.log("err is:", err)
        }
    }
    async function downloadMediaWorkflowForHowTos(json) {
        try {
            // console.log("json is:", json.playlist[0].images)

            let title = json?.title ?? "No title found"
            let id = json?.playlist[0]?.mediaid
            console.log("id is:", id)

            let manifests = json?.playlist[0]?.sources //is an array
            manifests = manifests.reverse();
            console.log("manifests:", manifests)
            // const manifest = manifests.at(-1);
            // console.log("manifest is:", manifest)
            let images = json?.playlist[0]?.images
            const lastImage = images.at(-1);
            console.log("lastImage is:", lastImage)

            // if (manifest) {


            //     try {

            //         const res = await fetch(manifest.file);
            //         let videoUrl = res.url
            //         let videoLabel = manifest.label + "_" + json?.playlist[0]?.mediaid
            //         console.log("videoUrl ..........:", videoUrl);
            //         await downloadMedia(videoUrl, title, id)
            //     } catch (error) {
            //         console.log("err is:", error)
            //     }
            // }
            const manifest1920 = manifests.find(m => m.width === 1920);
            const manifest1280 = manifests.find(m => m.width === 1280);
            const manifest720 = manifests.find(m => m.width === 720);
            const manifest640 = manifests.find(m => m.width === 640);
            const manifest480 = manifests.find(m => m.width === 480);
            const manifest320 = manifests.find(m => m.width === 320);
            const manifest_1 = manifests.find(m => m.width === -1);
            if (manifest1920) {
                try {

                    const res = await fetch(manifest1920.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest1280) {
                try {

                    const res = await fetch(manifest1280.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest720) {
                try {

                    const res = await fetch(manifest720.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest640) {
                try {

                    const res = await fetch(manifest640.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest480) {
                try {

                    const res = await fetch(manifest480.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            else if (manifest320) {
                try {

                    const res = await fetch(manifest320.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            } else {
                try {

                    const res = await fetch(manifest_1.file);
                    let videoUrl = res.url
                    console.log("videoUrl ..........:", videoUrl);
                    await downloadMedia(videoUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }



            if (lastImage) {
                try {
                    const res = await fetch(lastImage.src);
                    let imageUrl = res.url
                    console.log("imageUrl ..........:", imageUrl);

                    await downloadMedia(imageUrl, title, id)

                } catch (error) {
                    console.log("err is:", error)
                }
            }
            // for (let image of images) {
            //     let imageLabel = `poster_${image?.width}` + "_" + json?.playlist[0]?.mediaid
            //     if (image?.width == 1920 || image?.width == 1280 || image?.width == 720 || image?.width == 640 || image?.width == 480 || image?.width == 320 || image?.width == -1) {
            //         try {
            //             const res = await fetch(image.src);
            //             let imageUrl = res.url
            //             console.log("imageUrl ..........:", imageUrl);

            //             // await downloadMedia(imageUrl, title, id)

            //         } catch (error) {
            //             console.log("err is:", error)
            //         }
            //     }


            // }

        } catch (err) {
            console.log("err is:", err)
        }
    }
    async function jwtSignedUrl(path, signing_secret) {
        console.log("signing_secret:", signing_secret)
        const host = 'https://cdn.jwplayer.com';
        const now = Math.floor(Date.now() / 1000);

        const payload = {
            resource: path,
            // Put any accepted query params here, not in the URL, for example:
            // related_media_id: 'RltV8MtT',
            exp: Math.ceil((now + 3600) / 300) * 300, // valid for 1h
        };

        const token = jwt.sign(payload, signing_secret, {
            algorithm: 'HS256',
            noTimestamp: true, // omit "iat" to maximize cacheability
        });

        return `${host}${path}?token=${token}`;
    }
}
