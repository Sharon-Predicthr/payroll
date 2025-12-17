import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex min-h-10 h-auto w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm",
          "text-text-main", // Same text color as Input component
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-100 disabled:text-text-main",
          "text-right", // RTL support
          "leading-normal", // Better line height for text display
          "whitespace-normal", // Allow text to wrap if needed
          "overflow-visible", // Ensure text is not clipped
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };

