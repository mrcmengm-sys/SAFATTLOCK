import type { Metadata } from "next";
import Head from "next/head";
import localFont from "next/font/local";
import "./globals.css";

const customFontAr = localFont({
  src: [
    {
      path: "./fonts/1.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/2.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-custom-ar",
});

const customFontEn = localFont({
  src: "./fonts/3.ttf",
  variable: "--font-custom-en",
});

export const metadata: Metadata = {
  title: "تطبيق TTLock",
  description: "تطبيق لاختبار واجهة برمجة تطبيقات TTLock",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${customFontAr.variable} ${customFontEn.variable} h-full antialiased`}>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      </Head>
      <body className="min-h-full flex flex-col font-custom">{children}</body>
    </html>
  );
}
