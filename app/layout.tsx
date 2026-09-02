import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Axiom Trade",
  description: "A safety-first, exchange-neutral trading dashboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
