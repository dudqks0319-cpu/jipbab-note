// 목적: 유통기한 잔여 일수에 따른 긴급도를 진행 바 형태로 표시합니다.
import { HTMLAttributes } from "react";

export interface ExpiryBarProps extends HTMLAttributes<HTMLDivElement> {
  remainingDays: number;
  maxDays?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getUrgencyClasses = (remainingDays: number) => {
  if (remainingDays < 0) return "bg-red-500";
  if (remainingDays <= 2) return "bg-orange-500";
  if (remainingDays <= 5) return "bg-amber-500";
  return "bg-emerald-500";
};

const getWidthClasses = (percentage: number) => {
  if (percentage >= 95) return "w-full";
  if (percentage >= 80) return "w-5/6";
  if (percentage >= 65) return "w-2/3";
  if (percentage >= 50) return "w-1/2";
  if (percentage >= 35) return "w-2/5";
  if (percentage >= 20) return "w-1/3";
  if (percentage > 0) return "w-1/5";
  return "w-0";
};

export function ExpiryBar({ className = "", remainingDays, maxDays = 14, ...props }: ExpiryBarProps) {
  const normalizedMaxDays = Math.max(1, maxDays);
  const ratio = clamp(remainingDays / normalizedMaxDays, 0, 1);
  const percentage = Math.round(ratio * 100);
  const barColorClass = getUrgencyClasses(remainingDays);
  const barWidthClass = getWidthClasses(percentage);

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")} {...props}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={["h-full rounded-full transition-all duration-300", barColorClass, barWidthClass].join(" ")} />
      </div>
    </div>
  );
}

export default ExpiryBar;
