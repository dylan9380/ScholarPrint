import { Space_Grotesk, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import NavBar from "./nav-bar";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata = {
  title: "Scholar Print Studio",
  description: "Conference and academic poster printing, ordered online.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${serif.variable}`}>
      <body className="font-serif">
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
