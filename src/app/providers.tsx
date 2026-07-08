"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useColorPalette } from "@amazecontinuityprojects/amazeui";

function ColorPaletteInitializer() {
  useColorPalette();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ColorPaletteInitializer />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
