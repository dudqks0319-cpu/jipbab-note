// 목적: 상태 라벨 표현을 위한 재사용 가능한 배지 컴포넌트를 제공합니다.
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "muted";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-emerald-100 text-emerald-700",
  success: "bg-lime-100 text-lime-700",
  warning: "bg-amber-100 text-amber-700",
  muted: "bg-slate-100 text-slate-600",
};

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export default Badge;
