import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

export const metadata: Metadata = {
  title: "Viva la Vida | Passeios de Barco e Lancha em Florianópolis",
  description: "Viva experiências inesquecíveis! Passeios de barco e lancha em Florianópolis. Ilha do Campeche, Costa da Lagoa, Porto Belo e muito mais. Reserve agora pelo WhatsApp!",
  keywords: "passeio de lancha florianópolis, aluguel de lancha, ilha do campeche, costa da lagoa, passeio de barco, florianópolis turismo",
  openGraph: {
    title: "Viva la Vida | Passeios de Barco e Lancha em Florianópolis",
    description: "Viva experiências inesquecíveis! Passeios de barco e lancha em Florianópolis.",
    type: "website",
    locale: "pt_BR",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <Script id="gtm" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KXP6D25N');
          `}
        </Script>

        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !(function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)})(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1327622045037528');
            fbq('track', 'PageView');
          `}
        </Script>

        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KXP6D25N"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1327622045037528&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

