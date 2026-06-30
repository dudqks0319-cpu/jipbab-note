// 이 파일은 냉장고 이미지 안에 보유 재료를 선반별로 배치해 보여주는 공용 UI입니다.
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";

import { getIngredientDisplayName } from "@/lib/ingredient-display";
import { withNormalizedIngredientStorage } from "@/lib/ingredient-storage";
import { getDday, getIngredientPhotoUrl } from "@/lib/utils";
import type { IngredientRecord, IngredientStorageType } from "@/types";

type FridgeZone = {
  storageType: IngredientStorageType;
  title: string;
  subtitle: string;
  labelClassName: string;
  overlayClassName: string;
  emptyClassName: string;
  chipToneClassName: string;
  layout: "shelf" | "drawer" | "pantry";
  compactLimit: number;
  fullLimit: number;
};

type ZoneWithItems = FridgeZone & {
  items: IngredientRecord[];
};

type FridgeIllustrationProps = {
  ingredients: IngredientRecord[];
  compact?: boolean;
  maxItemsPerZone?: number;
  selectedStorage?: IngredientStorageType | "전체";
  onSelectStorage?: (storageType: IngredientStorageType | "전체") => void;
  onEmptyAction?: () => void;
  emptyActionHref?: string;
  showEmptyIntro?: boolean;
};

const FRIDGE_IMAGE_SRC = "/images/fridge-freezer-board-animated.png";

const FRIDGE_ZONES: FridgeZone[] = [
  {
    storageType: "냉장",
    title: "냉장 재료",
    subtitle: "먼저 먹을 신선 재료",
    labelClassName: "left-[11%] top-[7.5%]",
    overlayClassName: "left-[10%] top-[13%] h-[48%] w-[80%] content-start",
    emptyClassName: "left-[23%] top-[33%] w-[54%]",
    chipToneClassName: "border-[#cce6d9] bg-white/92 text-[#244236]",
    layout: "shelf",
    compactLimit: 6,
    fullLimit: 10,
  },
  {
    storageType: "냉동",
    title: "냉동 재료",
    subtitle: "냉동 보관 재료",
    labelClassName: "left-[11%] top-[66%]",
    overlayClassName: "left-[18%] top-[73%] h-[14%] w-[64%] content-start",
    emptyClassName: "left-[23%] top-[77%] w-[54%]",
    chipToneClassName: "border-[#bfdced] bg-white/94 text-[#24405f]",
    layout: "drawer",
    compactLimit: 4,
    fullLimit: 4,
  },
];

const ROOM_TEMP_ZONE: FridgeZone = {
  storageType: "실온",
  title: "실온 보관함",
  subtitle: "양념과 상온 재료",
  labelClassName: "",
  overlayClassName: "",
  emptyClassName: "",
  chipToneClassName: "border-[#efd8b5] bg-white text-[#5a351d]",
  layout: "pantry",
  compactLimit: 4,
  fullLimit: 8,
};

const STORAGE_SELECTOR_ITEMS = ["전체", "냉장", "냉동", "실온"] as const;

function getRoomTempGridClassName(itemCount: number): string {
  if (itemCount >= 5) {
    return "grid-cols-3";
  }
  return "grid-cols-2";
}

function RoomTempStorageBox({
  items,
  compact,
  maxItemsPerZone,
  selectedStorage,
}: {
  items: IngredientRecord[];
  compact: boolean;
  maxItemsPerZone: number;
  selectedStorage: IngredientStorageType | "전체";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedStorage === "전체" || selectedStorage === "실온";
  const shouldShowItems = isOpen || selectedStorage === "실온";
  const visibleLimit = Math.min(maxItemsPerZone, compact ? ROOM_TEMP_ZONE.compactLimit : ROOM_TEMP_ZONE.fullLimit);
  const visibleItems = isSelected ? items.slice(0, visibleLimit) : [];
  const overflowCount = Math.max(items.length - visibleLimit, 0);
  const dense = visibleItems.length >= 5;

  return (
    <div className={`mx-auto mt-3 rounded-[16px] border border-[#efd8b5] bg-[#fff8ed] p-2.5 ${compact ? "max-w-[280px]" : "max-w-[328px]"}`}>
      <button
        type="button"
        aria-expanded={shouldShowItems}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[13px] bg-white px-3 text-left shadow-[0_6px_14px_rgba(76,51,28,0.08)]"
      >
        <span>
          <span className="block text-[12px] font-black text-[#5a351d]">실온 보관함</span>
          <span className="mt-0.5 block text-[10px] font-black text-[#9d8167]">{items.length}개</span>
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-[#9d8167] transition-transform ${shouldShowItems ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {shouldShowItems ? (
        items.length === 0 ? (
          <p className="mt-2 rounded-[12px] bg-white/75 px-3 py-3 text-center text-[11px] font-black text-[#a69585]">
            실온 재료가 없어요
          </p>
        ) : (
          <div className={`mt-2 grid gap-1.5 ${getRoomTempGridClassName(visibleItems.length)}`}>
            {visibleItems.map((item) => (
              <IngredientChip key={item.id} item={item} zone={ROOM_TEMP_ZONE} dense={dense} />
            ))}
            {overflowCount > 0 ? (
              <Link
                href="/fridge"
                className="flex min-h-[58px] items-center justify-center rounded-[12px] border border-dashed border-[#d7b985] bg-[#5a351d]/86 px-2 text-[10px] font-black text-white"
              >
                +{overflowCount}개
              </Link>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

function getUrgentExpiryBadge(item: IngredientRecord): { label: string; className: string } | null {
  if (!item.expiryDate) {
    return null;
  }

  const dday = getDday(item.expiryDate);
  if (dday < 0) {
    return { label: "만료", className: "bg-rose-100 text-rose-600" };
  }
  if (dday === 0) {
    return { label: "오늘", className: "bg-[#fff0e4] text-[#d94d19]" };
  }
  if (dday <= 3) {
    return { label: `D-${dday}`, className: "bg-[#fff0e4] text-[#d94d19]" };
  }
  return null;
}

function sortZoneItems(items: IngredientRecord[]): IngredientRecord[] {
  return [...items].sort((left, right) => getDday(left.expiryDate) - getDday(right.expiryDate));
}

function getVisibleItemLimit(zone: FridgeZone, compact: boolean, maxItemsPerZone: number): number {
  return Math.min(maxItemsPerZone, compact ? zone.compactLimit : zone.fullLimit);
}

function getZoneGridClassName(zone: FridgeZone, itemCount: number): string {
  if (zone.storageType === "냉장") {
    return itemCount >= 5 ? "grid-cols-3" : "grid-cols-2";
  }
  if (zone.storageType === "냉동") {
    return itemCount >= 3 ? "grid-cols-3" : "grid-cols-2";
  }
  return "grid-cols-1";
}

function shouldUseDenseChip(zone: FridgeZone, itemCount: number): boolean {
  if (zone.storageType === "냉장") {
    return itemCount >= 7;
  }
  return zone.storageType === "냉동";
}

function IngredientChip({
  item,
  zone,
  dense,
}: {
  item: IngredientRecord;
  zone: FridgeZone;
  dense: boolean;
}) {
  const urgentBadge = getUrgentExpiryBadge(item);
  const displayName = getIngredientDisplayName(item.name);
  const imageSrc = getIngredientPhotoUrl(displayName, item.category);
  return (
    <Link
      href="/fridge"
      className={`relative flex min-w-0 flex-col items-center justify-center rounded-[12px] border text-center shadow-[0_7px_12px_rgba(35,51,61,0.09)] backdrop-blur-[2px] ${zone.chipToneClassName} ${
        dense ? "min-h-[58px] px-1 py-1" : "min-h-[74px] px-2 py-2"
      }`}
      aria-label={`${zone.title} ${displayName} 보기`}
    >
      {urgentBadge ? (
        <span
          className={`absolute right-1 top-1 rounded-full px-1.5 py-0.5 font-black leading-none ${
            dense ? "text-[7px]" : "text-[8px]"
          } ${urgentBadge.className}`}
        >
          {urgentBadge.label}
        </span>
      ) : null}
      <span className={`block overflow-hidden rounded-full bg-white/70 ${dense ? "h-6 w-6" : "h-8 w-8"}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt="" className="h-full w-full object-contain p-0.5" />
      </span>
      <span className="block w-full min-w-0 px-0.5">
        <span className={`mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-black leading-tight ${dense ? "text-[10px]" : "text-[11px]"}`}>
          {displayName}
        </span>
      </span>
    </Link>
  );
}

function ZoneLabel({ zone, count }: { zone: FridgeZone; count: number }) {
  return (
    <div
      className={`absolute z-20 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 shadow-[0_6px_14px_rgba(76,51,28,0.10)] ${zone.labelClassName}`}
    >
      <p className="text-[10px] font-black leading-none text-[#2f2117]">{zone.title}</p>
      <p className="mt-0.5 text-[8px] font-black leading-none text-[#8f7f70]">{count}개</p>
    </div>
  );
}

function ZoneOverlay({
  zone,
  compact,
  maxItemsPerZone,
  isSelected,
}: {
  zone: ZoneWithItems;
  compact: boolean;
  maxItemsPerZone: number;
  isSelected: boolean;
}) {
  const visibleLimit = getVisibleItemLimit(zone, compact, maxItemsPerZone);
  const visibleItems = isSelected ? zone.items.slice(0, visibleLimit) : [];
  const overflowCount = Math.max(zone.items.length - visibleLimit, 0);
  const gridClassName = getZoneGridClassName(zone, visibleItems.length);
  const dense = shouldUseDenseChip(zone, visibleItems.length);

  if (!isSelected) {
    return null;
  }

  if (zone.items.length === 0) {
    return (
      <p
        className={`absolute z-20 rounded-full border border-white/80 bg-white/78 px-2 py-1 text-center text-[10px] font-black text-[#a69585] shadow-[0_6px_12px_rgba(76,51,28,0.08)] ${zone.emptyClassName}`}
      >
        비었어요
      </p>
    );
  }

  return (
    <div className={`absolute z-20 grid auto-rows-min items-start gap-1.5 ${gridClassName} ${zone.overlayClassName}`}>
      {visibleItems.map((item) => (
        <IngredientChip key={item.id} item={item} zone={zone} dense={dense} />
      ))}
      {overflowCount > 0 ? (
        <Link
          href="/fridge"
          className="flex min-h-8 items-center justify-center rounded-[12px] border border-dashed border-white/85 bg-[#2f2117]/82 px-2 text-[10px] font-black text-white shadow-[0_7px_14px_rgba(47,33,23,0.16)]"
        >
          +{overflowCount}개
        </Link>
      ) : null}
    </div>
  );
}

export default function FridgeIllustration({
  ingredients,
  compact = false,
  maxItemsPerZone = compact ? 4 : 8,
  selectedStorage = "전체",
  onSelectStorage,
  onEmptyAction,
  emptyActionHref = "/fridge?add=1",
  showEmptyIntro = true,
}: FridgeIllustrationProps) {
  const activeIngredients = ingredients
    .filter((item) => !item.consumedAt && !item.discardedAt)
    .map(withNormalizedIngredientStorage);
  const visibleZones: ZoneWithItems[] = FRIDGE_ZONES.map((zone) => ({
    ...zone,
    items: sortZoneItems(activeIngredients.filter((item) => item.storageType === zone.storageType)),
  }));
  const roomTempItems = sortZoneItems(activeIngredients.filter((item) => item.storageType === "실온"));
  const fridgeCount = visibleZones[0]?.items.length ?? 0;
  const freezerCount = visibleZones[1]?.items.length ?? 0;

  return (
    <div
      data-testid="fridge-illustration"
      className="rounded-[20px] border border-[#e6d6c4] bg-[#fffaf3] p-3 shadow-[0_10px_24px_rgba(76,51,28,0.08)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-black text-[#2f2117]">내 냉장고</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#8f7f70]">
            냉장 {fridgeCount} · 냉동 {freezerCount} · 실온 {roomTempItems.length}
          </p>
        </div>
        {onEmptyAction ? (
          <button
            type="button"
            onClick={onEmptyAction}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#ea5a1f] px-3 text-[12px] font-black text-white"
          >
            <Plus size={14} />
            재료 추가
          </button>
        ) : (
          <Link
            href={emptyActionHref}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#ea5a1f] px-3 text-[12px] font-black text-white"
          >
            <Plus size={14} />
            재료 추가
          </Link>
        )}
      </div>

      {onSelectStorage ? (
        <div className="mb-3 grid grid-cols-4 gap-1.5 rounded-[14px] bg-[#f7eee3] p-1">
          {STORAGE_SELECTOR_ITEMS.map((storageType) => (
            <button
              key={storageType}
              type="button"
              aria-pressed={selectedStorage === storageType}
              onClick={() => onSelectStorage(storageType)}
              className={`min-h-10 rounded-[11px] px-2 text-[11px] font-black ${
                selectedStorage === storageType ? "bg-[#2f2117] text-white" : "text-[#7d6d5f]"
              }`}
            >
              {storageType}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`relative mx-auto aspect-[887/1774] w-full overflow-hidden rounded-[18px] bg-[#fff7df] ${compact ? "max-w-[280px]" : "max-w-[328px]"}`}>
        <Image
          src={FRIDGE_IMAGE_SRC}
          alt=""
          fill
          priority
          sizes="(max-width: 430px) 100vw, 390px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-[#2f2117]/4" />
        {visibleZones.map((zone) => {
          const isSelected = selectedStorage === "전체" || selectedStorage === zone.storageType;
          const shouldRenderZone =
            selectedStorage === "전체"
              ? zone.items.length > 0 || activeIngredients.length === 0
              : selectedStorage === zone.storageType;
          if (!shouldRenderZone) {
            return null;
          }
          return (
            <div key={zone.storageType}>
              <ZoneLabel zone={zone} count={zone.items.length} />
              <ZoneOverlay
                zone={zone}
                compact={compact}
                maxItemsPerZone={maxItemsPerZone}
                isSelected={isSelected}
              />
            </div>
          );
        })}
        {activeIngredients.length === 0 && showEmptyIntro ? (
          onEmptyAction ? (
            <button
              type="button"
              onClick={onEmptyAction}
              className="absolute left-1/2 top-[43%] z-30 w-[68%] -translate-x-1/2 rounded-[18px] border border-[#eadcc9] bg-white/92 px-4 py-4 text-center shadow-[0_12px_28px_rgba(76,51,28,0.16)] backdrop-blur-[2px]"
            >
              <span className="block text-[14px] font-black text-[#2f2117]">냉장고가 비어 있어요</span>
              <span className="mt-1 block break-keep text-[11px] font-semibold leading-5 text-[#8f7f70]">
                눌러서 계란, 두부, 양파부터 담아보세요.
              </span>
            </button>
          ) : (
            <Link
              href={emptyActionHref}
              className="absolute left-1/2 top-[43%] z-30 w-[68%] -translate-x-1/2 rounded-[18px] border border-[#eadcc9] bg-white/92 px-4 py-4 text-center shadow-[0_12px_28px_rgba(76,51,28,0.16)] backdrop-blur-[2px]"
            >
              <span className="block text-[14px] font-black text-[#2f2117]">냉장고가 비어 있어요</span>
              <span className="mt-1 block break-keep text-[11px] font-semibold leading-5 text-[#8f7f70]">
                눌러서 계란, 두부, 양파부터 담아보세요.
              </span>
            </Link>
          )
        ) : null}
      </div>
      <RoomTempStorageBox
        items={roomTempItems}
        compact={compact}
        maxItemsPerZone={maxItemsPerZone}
        selectedStorage={selectedStorage}
      />
    </div>
  );
}
