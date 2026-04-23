import { sendEmailSG } from "@/lib/sendgrid";
import { list } from '@vercel/blob';
import playlistMap from '../../../data/playlist/map.json'
import { ConnectingAirportsOutlined } from "@mui/icons-material";
export async function POST(request) {//when subscription webhook is triggered -> status : on-hold / active / cancelled
  let json = await request.json()
  let formatUrls
  console.log("POST /api/mediaBlob, JSON:", json)

  try {
    const { blobs } = await list({
      prefix: `${json?.mediaId}/`,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      mode: 'expanded'
    });
    let imageUrls = blobs.map(blob => blob.url);
    console.log("imageUrls:", imageUrls)

    //get the playlist mapping file data
    let map = playlistMap[0]
    let order = []
    for (const key in playlistMap[0]) {
      if (json?.mediaId in map[key]) {
        order.push(...map[key][json?.mediaId])

        break;
      }
    }
    if (imageUrls.length == 0) {
      let baseUrl = `https://6z1gtynqfxcjjwix.public.blob.vercel-storage.com`
      //not a folder, so get the media url directly using the ids present in order mapping file
      imageUrls = order.map(id => `${baseUrl}/${id}.mp4`)
      // console.log("imageUrls before:", imageUrls)
      
    } else {
      //   const formatUrls = imageUrls.filter(url => (url.endsWith('.mp4') || url.endsWith('.jpg')|| url.endsWith('.jpeg'))).map(url => ({ url }));
      
    }
    formatUrls = imageUrls.filter(url => url.endsWith('.mp4')).map(url => ({ url }));




    const sortedUrls = order.map(id => formatUrls.find(url => url.url.includes(id)));
    // console.log("sortedUrls:", sortedUrls);


    // console.log("order is:", order)
    // console.log("formatUrls:", formatUrls)
    return new Response(JSON.stringify({ url: sortedUrls }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error(error);
    return new Response('Error processing request', { status: 200 });//so that webhook doesn't deactivate in wordpress
  }
}