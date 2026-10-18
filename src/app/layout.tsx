import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import { parseMotionEnabled } from "@/lib/apply-theme";
import { parseColorPalette, parseThemeMode } from "@/lib/theme";
import "./globals.css";

// The root layout reads the theme cookies on every request, so it has to block
// on the server instead of streaming a static shell.
export const instant = false;

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Atrium",
  description: "Self-hosted workspace for native work and synchronized provider tasks.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = parseThemeMode(cookieStore.get("atrium_theme")?.value);
  const palette = parseColorPalette(cookieStore.get("atrium_palette")?.value);
  const motionOn = parseMotionEnabled(cookieStore.get("atrium_motion")?.value);
  return (
    <html
      lang="en"
      data-palette={palette}
      data-motion={motionOn ? "on" : "off"}
      className={`${outfit.variable} ${fraunces.variable} h-full overflow-hidden antialiased${theme === "dark" ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
