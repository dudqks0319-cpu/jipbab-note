// 목적: 모바일 입력 UX에 맞춘 기본 인풋 컴포넌트를 제공합니다.
import { forwardRef, InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={[
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900",
        "placeholder:text-slate-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70",
        "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

export default Input;
