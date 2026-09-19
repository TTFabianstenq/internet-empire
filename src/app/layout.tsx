import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internet Empire",
  description: "Build a server-authoritative internet tycoon from one visitor to a global network."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
