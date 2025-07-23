import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bulk - E-commerce Product Merchandising Platform",
  description: "AI-powered multi-tenant SaaS for e-commerce product merchandising and categorization",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <ConvexClientProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ConvexClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
