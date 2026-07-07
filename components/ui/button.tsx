import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default:
    "border border-border bg-card text-foreground hover:border-primary active:bg-muted",
  outline:
    "border border-border bg-transparent hover:border-primary active:bg-muted/70",
  ghost: "bg-transparent hover:text-foreground active:bg-muted/70",
  danger: "border border-border bg-transparent text-muted-foreground hover:border-primary hover:text-foreground",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9",
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          variants[variant],
          sizes[size],
          props.disabled ? "cursor-not-allowed" : "cursor-pointer",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
