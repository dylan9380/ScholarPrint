import { Space_Grotesk, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import NavBar from "./nav-bar";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://scholarprint.ca"),
  title: {
    default: "Academic Poster Printing | Scholar Print Studio",
    template: "%s | Scholar Print Studio",
  },
  description:
    "Order 36 × 48 in matte academic and conference posters online. Upload a PDF or PPTX, preview your print, and choose local or tracked Canadian delivery.",
  applicationName: "Scholar Print Studio",
  icons: {
    icon: [{ url: "/scholar-print-mark.svg", type: "image/svg+xml" }],
  },
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
