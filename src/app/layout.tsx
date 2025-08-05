import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Failsafe System",
  description: "Security failsafe check-in system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}