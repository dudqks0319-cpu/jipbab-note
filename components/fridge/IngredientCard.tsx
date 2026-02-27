// 목적: 식재료 핵심 정보와 D-day 상태, 수정/삭제 액션을 카드 형태로 제공합니다.
import { HTMLAttributes } from "react";

import { getExpiryStatus } from "@/lib/utils";
import type { IngredientRecord } from "@/types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExpiryBar } from "@/components/fridge/ExpiryBar";

export interface IngredientCardProps extends HTMLAttributes<HTMLDivElement> {
  ingredient: IngredientRecord;
  onEdit?: (ingredient: IngredientRecord) => void;
  onDelete?: (ingredient: IngredientRecord) => void;
}

const getStatusVariant = (isExpired: boolean, isExpiringSoon: boolean): "warning" | "muted" | "success" => {
  if (isExpired || isExpiringSoon) return "warning";
  return "success";
};

export function IngredientCard({
  className = "",
  ingredient,
  onEdit,
  onDelete,
  ...props
}: IngredientCardProps) {
  const expiryStatus = getExpiryStatus(ingredient.expiryDate);
  const statusVariant = getStatusVariant(expiryStatus.isExpired, expiryStatus.isExpiringSoon);

  return (
    <Card
      className={["rounded-2xl p-4", className].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{ingredient.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {(ingredient.category ?? "기타")} · {ingredient.storageType}
          </p>
        </div>
        <Badge variant={statusVariant}>{expiryStatus.label}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <p>수량: {ingredient.quantity ?? "-"}</p>
        <p>유통기한: {ingredient.expiryDate ?? "-"}</p>
      </div>

      <div className="mt-3">
        <ExpiryBar remainingDays={expiryStatus.daysLeft ?? 0} />
      </div>

      {ingredient.memo ? (
        <p className="mt-3 line-clamp-2 text-sm text-slate-500">{ingredient.memo}</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit?.(ingredient)}
        >
          수정
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => onDelete?.(ingredient)}
        >
          삭제
        </Button>
      </div>
    </Card>
  );
}

export default IngredientCard;
