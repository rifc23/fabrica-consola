import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import SelectorProyectos from "@/components/SelectorProyectos";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fábrica — Consola",
  description: "Crea y da seguimiento a proyectos de la Fábrica de agentes sin usar terminal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className={styles.header}>
          <div className={`container ${styles.headerInterior}`}>
            <Link href="/" className={styles.marca}>
              🏭 Fábrica
            </Link>
            <SelectorProyectos />
          </div>
        </header>
        <main className={styles.contenido}>{children}</main>
      </body>
    </html>
  );
}
