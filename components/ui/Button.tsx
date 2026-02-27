// 목적: 모바일 우선 크기의 재사용 가능한 버튼 컴포넌트를 제공합니다.
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700",
  secondary: "bg-orange-400 text-white hover:bg-orange-500 active:bg-orange-600",
  outline: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 active:bg-slate-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", variant = "primary", size = "md", fullWidth = false, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={[
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

export default Button;
