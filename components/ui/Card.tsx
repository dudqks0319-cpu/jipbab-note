// 목적: 모바일 화면에 맞춘 단순한 카드 래퍼를 제공합니다.
import { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        "sm:p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export default Card;
