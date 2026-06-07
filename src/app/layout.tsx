import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MockPrep — Interview Evaluator",
  description: "Practice coding interviews with real company questions and behavioral analysis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

