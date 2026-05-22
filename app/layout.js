import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "./context/stateContext";
import ResponsiveAppBar from "@/components/Nav";
import { Suspense } from 'react';
import Script from "next/script";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: 'GymFit by Gymnastic Bodies',
    template: '%s | GymFit',
  },
  description: 'Train like a gymnast. Restore mobility, build real strength with 700+ guided exercises and programs for every level.',
  metadataBase: new URL('https://app.gymnasticbodies.com'),
  openGraph: {
    siteName: 'GymFit by Gymnastic Bodies',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@gymnasticbodies',
  },
};

export default function RootLayout({ children }) {
  let analytics_tag = process.env.NEXT_PUBLIC_ANALYTICS_TAG
  let hot_jar = process.env.NEXT_PUBLIC_HOTJAR_ID
  return (
    <html lang="en">
      {analytics_tag &&
        <>
          <Script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${analytics_tag}`}
            id="Google-Analytics-gymnasticbodies"
          />
          <Script id="google-analytics-init">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${analytics_tag}');
            `}
          </Script>
        </>
      }
      {hot_jar &&
        <>
          <Script
            async
            id="Hotjar Tag"
          >
            {`
             (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${hot_jar},hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `}
          </Script>
        </>
      }

      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ minHeight: "100vh" }}>
        <UserProvider>

          <ResponsiveAppBar />
          {children}

        </UserProvider>
      </body>
    </html >
  );
}
