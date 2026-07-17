import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock & Recall Portal",
  description: "Track Amazon & Flipkart recall stock, manage inventory, and view reports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
