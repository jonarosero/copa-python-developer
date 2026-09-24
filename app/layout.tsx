import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Copa Python Developer | El campeonato",
  description: "Ocho semanas de retos de Python, copas por equipo y una clasificación general.",
  icons: { icon: "/python-cup.png", shortcut: "/python-cup.png" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className="dark"><body>{children}</body></html>;
}
