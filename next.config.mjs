/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['gymfit-images.s3.amazonaws.com']
  },
  /* config options here */
  reactCompiler: true,
  crossOrigin: 'anonymous',
  async rewrites() {
    // Legacy WordPress asset paths still hardcoded in my.gymnasticbodies.com.
    // Rehosted to Vercel Blob under legacy/ (2026-07) so they keep resolving at
    // their original www.gymnasticbodies.com paths after the domain cutover —
    // no edit to the my. app required.
    const BLOB = 'https://6z1gtynqfxcjjwix.public.blob.vercel-storage.com';
    return {
      beforeFiles: [
        // Legacy AWS API tombstone (2026-08-17): api.gymnasticbodies.com now points
        // at this Vercel deployment. Route EVERY path on that host to the catch-all
        // handler, which logs the hit (legacy_api.hit in app_logs) and returns 410.
        // beforeFiles so it wins over the root [slug] content catch-all. Host-scoped,
        // so app./www./apex are unaffected.
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'api.gymnasticbodies.com' }],
          destination: '/api/_legacy/:path*',
        },
      ],
      afterFiles: [
        { source: '/gymfit/wp-content/:path*', destination: `${BLOB}/legacy/gymfit/wp-content/:path*` },
        { source: '/media/:path*', destination: `${BLOB}/legacy/media/:path*` },
      ],
    };
  },
  async redirects() {
    return [
      // Homepage now lives at the site root — collapse the old aliases into it.
      { source: '/homepage', destination: '/', permanent: true },
      { source: '/home', destination: '/', permanent: true },

      // Free tier / "Free White Board" page discontinued — send old links to /subscribe.
      { source: '/free-members', destination: '/subscribe', permanent: true },

      // Old WordPress storefront / WooCommerce / funnel entries → /subscribe.
      // (/class-finder was itself already a 301 → /subscribe on the old WP box.)
      { source: '/shop', destination: '/subscribe', permanent: true },
      { source: '/product/:path*', destination: '/subscribe', permanent: true },
      { source: '/sign-up', destination: '/subscribe', permanent: true },
      { source: '/sign-up-bottom-float', destination: '/subscribe', permanent: true },
      { source: '/cart', destination: '/subscribe', permanent: true },
      { source: '/checkout/why-now', destination: '/subscribe', permanent: true },
      { source: '/class-finder', destination: '/subscribe', permanent: true },

      // Account / legal pages.
      { source: '/my-account', destination: '/accountDetails', permanent: true },
      { source: '/checkout/terms-of-service', destination: '/terms-of-service', permanent: true },
      { source: '/checkout/privacy-policy', destination: '/privacy-policy', permanent: true },

      // Old WP blog archives + RSS feeds → blog index.
      { source: '/category/:path*', destination: '/blog', permanent: true },
      { source: '/feed', destination: '/blog', permanent: true },
      { source: '/:slug/feed', destination: '/blog', permanent: true },

      // Empty / junk WP pages → home.
      { source: '/gb-gear', destination: '/', permanent: true },
      { source: '/oops', destination: '/', permanent: true },
      { source: '/test-inline-form', destination: '/', permanent: true },

      // NOTE: /testimonial/* and /carousel-seat/* return 410 Gone via route
      // handlers (app/testimonial/[slug]/route.js, app/carousel-seat/[slug]/route.js).
      // NOTE: the /forum/* reverse-proxy rewrite is added + preview-tested separately
      // (needs the EC2 origin hostname settled at DNS-migration time).

      // ---- Host canonicalization (2026-07-23): www = content, app. = application ----
      // Permanent two-front-door model: www.gymnasticbodies.com serves all marketing/
      // content; app.gymnasticbodies.com keeps ALL pre-WP application functionality
      // (api incl. Stripe webhook, admin, renew, accountDetails, subscribe, offer,
      // legacy checkout/allUsers/Media). Content lives under the root [slug] catch-all,
      // so app routes are EXEMPTED by negative lookahead rather than enumerating
      // content paths. These rules sit AFTER the WP path-map above so path-level
      // redirects resolve first (fewer hops: app./shop → app./subscribe, 1 hop).
      // `permanent: false` (307) for the initial rollout — flip to true (308) after
      // live verification so a config mistake can't get cached by browsers.

      // Apex host: serves duplicate content today (no Vercel-level redirect exists) —
      // canonicalize everything to www; www's own rules then bounce app-routes onward.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'gymnasticbodies.com' }],
        destination: 'https://www.gymnasticbodies.com/:path*',
        permanent: false,
      },

      // app. host: everything not exempted 307s to the same path on www.
      {
        source:
          '/:path((?!api/|admin(?:/|$)|renew$|accountDetails$|subscribe$|offer(?:/|$)|checkout$|allUsers$|Media$|_next/|images/|favicon\\.ico$|\\.well-known/).+)',
        has: [{ type: 'host', value: 'app.gymnasticbodies.com' }],
        destination: 'https://www.gymnasticbodies.com/:path',
        permanent: false,
      },
      {
        source: '/',
        has: [{ type: 'host', value: 'app.gymnasticbodies.com' }],
        destination: 'https://www.gymnasticbodies.com/',
        permanent: false,
      },

      // www host: application routes live on app. — send them (query strings carry over).
      {
        source: '/renew',
        has: [{ type: 'host', value: 'www.gymnasticbodies.com' }],
        destination: 'https://app.gymnasticbodies.com/renew',
        permanent: false,
      },
      {
        source: '/accountDetails',
        has: [{ type: 'host', value: 'www.gymnasticbodies.com' }],
        destination: 'https://app.gymnasticbodies.com/accountDetails',
        permanent: false,
      },
      {
        source: '/subscribe',
        has: [{ type: 'host', value: 'www.gymnasticbodies.com' }],
        destination: 'https://app.gymnasticbodies.com/subscribe',
        permanent: false,
      },
      {
        source: '/offer/:path*',
        has: [{ type: 'host', value: 'www.gymnasticbodies.com' }],
        destination: 'https://app.gymnasticbodies.com/offer/:path*',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        has: [{ type: 'host', value: 'www.gymnasticbodies.com' }],
        destination: 'https://app.gymnasticbodies.com/admin/:path*',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/authentication",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/authentication/session",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/user/userStatus",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/user/subscription",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/user/resetPassword",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            // The legacy my. bundle sends a stray "Access-Control-Allow-Origin" REQUEST
            // header, so the preflight must allow it or the browser blocks the POST
            // (the "Network Error" that broke every password reset). Keep this even after
            // the my. bundle stops sending it — old bundles stay cached in browsers/CDN.
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, Access-Control-Allow-Origin",
          },
        ],
      },
      {
        source: "/api/user/resetLink",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            // Same reason as /api/user/resetPassword above: tolerate the legacy bundle's
            // stray Access-Control-Allow-Origin request header on the preflight.
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, Access-Control-Allow-Origin",
          },
        ],
      },
      {
        source: "/api/user/log",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/user/contactUs",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/paymentPortal",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/user/authorizePlatform",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/user/accountInformation",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/error",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/mediaBlob",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/migration",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/user/updateUserInNeon",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/cronJobs",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/stripe/create-subscription",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/user/renewalStatus",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/stripe/renew-subscription",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      }
    ];
  },
};

export default nextConfig;
