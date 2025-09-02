import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GMAH Platform",
  description: "Plateforme de gestion des prêts sans intérêts",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({
  children
}: RootLayoutProps) {
  return children;
}