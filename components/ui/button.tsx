import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-surface-2 text-foreground hover:bg-border",
  outline: "border border-border bg-surface text-foreground hover:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
  success: "bg-success text-white hover:opacity-90 dark:text-background",
};

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-9 w-9",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
});
