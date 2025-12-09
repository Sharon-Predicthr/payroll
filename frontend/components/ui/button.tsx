import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const variantStyles = {
      default: "bg-primary hover:bg-primary/90 text-white",
      primary: "bg-primary hover:bg-primary/90 text-white",
      secondary: "bg-secondary hover:bg-secondary/90 text-white",
      outline: "bg-white border border-gray-300 text-text-main hover:bg-gray-50",
      ghost: "hover:bg-gray-100 text-text-main",
    };
    
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors " +
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
            "disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2",
          variantStyles[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
