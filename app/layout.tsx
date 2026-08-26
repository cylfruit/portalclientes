import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteName = "Portal Clientes C&L Fruit";
const clarityProjectId = "xv5tc3kxbg";
const themeInitScript = `
(function () {
  try {
    if (localStorage.getItem('cyl-theme') === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.dataset.theme = 'dark';
    }
  } catch (_) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: getPublicSiteUrl() ?? undefined,
  applicationName: siteName,
  title: {
    default: "Portal Clientes | C&L Fruit",
    template: "%s | C&L Fruit",
  },
  description:
    "Portal privado de clientes C&L Fruit para revisar embarques, tracking maritimo, documentos y gestion de accesos.",
  keywords: [
    "C&L Fruit",
    "portal clientes",
    "embarques de fruta",
    "tracking maritimo",
    "documentos de exportacion",
  ],
  openGraph: {
    type: "website",
    siteName,
    title: "Portal Clientes | C&L Fruit",
    description:
      "Acceso privado para seguimiento de embarques, documentos y trazabilidad operativa de C&L Fruit.",
    images: [
      {
        url: "/brand/logocyl.png",
        width: 851,
        height: 542,
        alt: "Portal Clientes C&L Fruit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal Clientes | C&L Fruit",
    description:
      "Acceso privado para seguimiento de embarques, documentos y trazabilidad operativa de C&L Fruit.",
    images: ["/brand/logocyl.png"],
  },
  icons: {
    icon: [
      {
        url: "/brand/favicon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="es"
      className="h-full scroll-smooth antialiased"
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          data-cfasync="false"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {process.env.NODE_ENV === "production" ? (
          <Script
            id="microsoft-clarity"
            src={`https://www.clarity.ms/tag/${clarityProjectId}`}
            strategy="afterInteractive"
            nonce={nonce}
          />
        ) : null}
      </head>
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
