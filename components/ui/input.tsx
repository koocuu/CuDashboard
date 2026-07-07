import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
