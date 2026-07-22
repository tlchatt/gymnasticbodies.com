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
    return [
      { source: '/gymfit/wp-content/:path*', destination: `${BLOB}/legacy/gymfit/wp-content/:path*` },
      { source: '/media/:path*', destination: `${BLOB}/legacy/media/:path*` },
    ];
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
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
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
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
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
