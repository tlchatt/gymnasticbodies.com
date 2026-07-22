import https from 'https';

// Reverse-proxy for the legacy Invision Community forum.
//
// After the WordPress cutover, www.gymnasticbodies.com points at Vercel, so every
// /forum/* request lands here. The forum still lives on the old EC2 box, whose Apache
// serves it ONLY when the request Host is www.gymnasticbodies.com. We connect to the
// origin by IP (www now resolves to Vercel) but set SNI + Host = www so TLS validates
// against the origin's cert AND IPS serves the forum with a matching base_url (no
// canonical-redirect loop). The browser is already on www, so we simply forward it.
//
// Interim measure — the proper fix is relocating the forum (needs forum/server admin).

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORIGIN_IP = '34.205.92.109';
const ORIGIN_HOST = 'www.gymnasticbodies.com';

// Hop-by-hop / encoding headers we must not forward in either direction.
const STRIP_REQ = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'x-forwarded-host']);
const STRIP_RES = new Set(['transfer-encoding', 'connection', 'content-encoding', 'content-length']);

async function proxy(request, ctx) {
    const params = await ctx.params;
    const sub = (params?.path || []).join('/');
    const search = new URL(request.url).search || '';
    const originPath = '/forum' + (sub ? '/' + sub : '/') + search;

    const headers = {};
    for (const [k, v] of request.headers) {
        if (STRIP_REQ.has(k.toLowerCase())) continue;
        headers[k] = v;
    }
    headers['host'] = ORIGIN_HOST;
    headers['x-forwarded-host'] = ORIGIN_HOST;
    headers['x-forwarded-proto'] = 'https';

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const body = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

    return new Promise((resolve) => {
        const upstream = https.request(
            {
                host: ORIGIN_IP,
                servername: ORIGIN_HOST, // SNI → origin presents its www cert
                port: 443,
                method: request.method,
                path: originPath,
                headers,
                timeout: 20000,
            },
            (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    const out = new Headers();
                    for (const [k, v] of Object.entries(res.headers)) {
                        if (STRIP_RES.has(k.toLowerCase())) continue;
                        if (Array.isArray(v)) v.forEach((vv) => out.append(k, vv));
                        else if (v != null) out.set(k, v);
                    }
                    resolve(new Response(Buffer.concat(chunks), { status: res.statusCode || 502, headers: out }));
                });
            }
        );
        upstream.on('timeout', () => { upstream.destroy(); resolve(new Response('Forum origin timeout', { status: 504 })); });
        upstream.on('error', (e) => resolve(new Response('Forum proxy error: ' + e.message, { status: 502 })));
        if (body) upstream.write(body);
        upstream.end();
    });
}

export {
    proxy as GET,
    proxy as POST,
    proxy as PUT,
    proxy as DELETE,
    proxy as PATCH,
    proxy as HEAD,
    proxy as OPTIONS,
};
