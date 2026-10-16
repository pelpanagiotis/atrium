import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Atrium",
  description: "Self-hosted workspace for native work and synchronized provider tasks.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("atrium_theme")?.value;
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} h-full overflow-hidden antialiased${theme === "dark" ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
