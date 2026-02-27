// 목적: 식재료 생성/수정에서 공통으로 사용하는 모바일 우선 폼 컴포넌트를 제공합니다.
import { FormEvent, useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { INGREDIENT_CATEGORIES, INGREDIENT_STORAGE_TYPES } from "@/types";

export type IngredientFormMode = "create" | "edit";

export interface IngredientFormValues {
  name: string;
  category: string;
  storage_type: string;
  quantity: string;
  expiry_date: string;
  memo: string;
}

export interface AddIngredientFormProps {
  mode?: IngredientFormMode;
  initialValues?: Partial<IngredientFormValues>;
  categoryOptions?: readonly string[];
  storageTypeOptions?: readonly string[];
  isSubmitting?: boolean;
  onSubmit: (values: IngredientFormValues) => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
}

const DEFAULT_VALUES: IngredientFormValues = {
  name: "",
  category: "",
  storage_type: "냉장",
  quantity: "",
  expiry_date: "",
  memo: "",
};

const getMergedValues = (initialValues?: Partial<IngredientFormValues>): IngredientFormValues => ({
  ...DEFAULT_VALUES,
  ...initialValues,
});

export function AddIngredientForm({
  mode = "create",
  initialValues,
  categoryOptions = INGREDIENT_CATEGORIES,
  storageTypeOptions = INGREDIENT_STORAGE_TYPES,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className = "",
}: AddIngredientFormProps) {
  const mergedValues = useMemo(() => getMergedValues(initialValues), [initialValues]);
  const formResetKey = useMemo(
    () =>
      [
        mode,
        mergedValues.name,
        mergedValues.category,
        mergedValues.storage_type,
        mergedValues.quantity,
        mergedValues.expiry_date,
        mergedValues.memo,
      ].join("|"),
    [mode, mergedValues]
  );

  const submitLabel = useMemo(() => (mode === "edit" ? "수정하기" : "추가하기"), [mode]);
  const titleText = mode === "edit" ? "식재료 수정" : "식재료 추가";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await onSubmit({
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? ""),
      storage_type: String(formData.get("storage_type") ?? ""),
      quantity: String(formData.get("quantity") ?? ""),
      expiry_date: String(formData.get("expiry_date") ?? ""),
      memo: String(formData.get("memo") ?? ""),
    });
  };

  return (
    <Card className={["rounded-2xl p-4", className].filter(Boolean).join(" ")}>
      <form key={formResetKey} className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-base font-semibold text-slate-900">{titleText}</h2>

        <div className="space-y-1.5">
          <label htmlFor="ingredient-name" className="text-sm font-medium text-slate-700">
            이름
          </label>
          <Input
            id="ingredient-name"
            name="name"
            defaultValue={mergedValues.name}
            placeholder="식재료 이름"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ingredient-category" className="text-sm font-medium text-slate-700">
            카테고리
          </label>
          <div className="relative">
            <select
              id="ingredient-category"
              name="category"
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
              defaultValue={mergedValues.category || ""}
              required
            >
              <option value="" disabled>
                카테고리 선택
              </option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ingredient-storage" className="text-sm font-medium text-slate-700">
            보관 방식
          </label>
          <div className="relative">
            <select
              id="ingredient-storage"
              name="storage_type"
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
              defaultValue={mergedValues.storage_type}
              required
            >
              {storageTypeOptions.map((storageType) => (
                <option key={storageType} value={storageType}>
                  {storageType}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ingredient-quantity" className="text-sm font-medium text-slate-700">
            수량
          </label>
          <Input
            id="ingredient-quantity"
            name="quantity"
            type="text"
            placeholder="예: 500g, 2개"
            defaultValue={mergedValues.quantity}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ingredient-expiry" className="text-sm font-medium text-slate-700">
            유통기한
          </label>
          <Input
            id="ingredient-expiry"
            name="expiry_date"
            type="date"
            defaultValue={mergedValues.expiry_date}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ingredient-memo" className="text-sm font-medium text-slate-700">
            메모
          </label>
          <textarea
            id="ingredient-memo"
            name="memo"
            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            defaultValue={mergedValues.memo}
            placeholder="필요한 메모를 입력하세요"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default AddIngredientForm;
