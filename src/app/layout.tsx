import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linguo",
  description: "A simple Next.js app for language exploration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
