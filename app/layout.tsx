import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Clientes | C&L Fruit",
  description:
    "Portal de clientes C&L Fruit para recibidores con embarques, pallets, documentos y gestion de accesos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full scroll-smooth antialiased">
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
