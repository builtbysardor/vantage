import type { Metadata } from "next";
import "./globals.css";
import { VProvider } from "@/lib/vcontext";
import { ThemeApplier } from "@/components/layout/ThemeApplier";

export const metadata: Metadata = {
  title: "Vantage",
  description: "Observability Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <VProvider>
          <ThemeApplier>{children}</ThemeApplier>
        </VProvider>
      </body>
    </html>
  );
}
