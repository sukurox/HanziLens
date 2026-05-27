import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HanziLens",
  description: "Eine minimale Reading-App fuer chinesische Texte mit integrierter Sprachhilfe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
