"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

export function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, systemTheme, setTheme } = useTheme();

  // If user chose "system", reflect the current OS mode for deciding what to flip to.
  const effective = theme === "system" ? systemTheme : theme;

  function toggle() {
    // Flip between light and dark (ignores "system" for the click action)
    setTheme(effective === "dark" ? "light" : "dark");
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggle}
            className={className}
          >
            {/* Sun icon (visible in light) */}
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            {/* Moon icon (visible in dark) */}
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Toggle theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
