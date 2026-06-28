import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Omni-Intellect Nexus",
  description: "Bilingual AI workspace for ethical, build-ready product plans."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
