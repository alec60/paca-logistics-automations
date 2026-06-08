import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        // Light "usable box" on the dark canvas — crisp moderate radius + hairline edge.
        "flex h-10 w-full rounded-lg border border-border-subtle bg-input-bg px-4 py-1 text-sm text-input-text placeholder:text-input-placeholder",
        // Smooth color + ring settle (inherits global 120ms). ring-offset-2 on
        // the card surface gives the focus ring breathing room in both themes.
        "transition-[background-color,box-shadow] duration-[120ms] ease-out hover:bg-input-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-menu-bg",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
