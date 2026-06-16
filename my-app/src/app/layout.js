// src/app/layout.js
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Faith Frames",
  description: "Your spiritual media space",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
