import type { Metadata } from "next";
import { headers } from "next/headers";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteName = "Portal Clientes C&L Fruit";
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
        url: "/brand/bg_login.jpg",
        width: 1200,
        height: 630,
        alt: "Portal Clientes C&L Fruit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal Clientes | C&L Fruit",
    description:
      "Acceso privado para seguimiento de embarques, documentos y trazabilidad operativa de C&L Fruit.",
    images: ["/brand/bg_login.jpg"],
  },
  icons: {
    icon: "/brand/logocyl.png",
    apple: "/brand/logocyl.png",
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
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
