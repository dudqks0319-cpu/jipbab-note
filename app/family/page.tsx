// 이 파일은 최대 4명 가족 냉장고 공유 MVP 화면을 제공합니다.
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, ChevronLeft, CloudOff, Copy, Home, LoaderCircle, RefreshCw, Users } from "lucide-react";

import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useFamilyShare } from "@/hooks/useFamilyShare";
import { useIngredients } from "@/hooks/useIngredients";
import { filterBeginnerHomeRecipes } from "@/lib/beginner-recipe-contract";
import { CURATED_RECIPE_RECORDS } from "@/lib/curated-recipes";
import { buildRecipeRecommendationReason, rankRecipeRecommendations } from "@/lib/matching";
import { filterPublicationApprovedRecipes } from "@/lib/recipe-publication";
import { getDday } from "@/lib/utils";

export default function FamilyPage() {
  const {
    group,
    activities,
    syncState,
    realtimeState,
    maxMembers,
    statusMessage,
    error,
    createGroup,
    joinGroup,
    refreshGroup,
    leaveGroup,
  } = useFamilyShare();
  const { requestConfirmation, confirmationDialog } = useConfirmDialog();
  const familyGroupId = syncState === "synced" ? group?.id ?? null : null;
  const { ingredients } = useIngredients({
    scope: familyGroupId ? "family" : "personal",
    familyGroupId,
  });
  const [groupName, setGroupName] = useState("우리집 냉장고");
  const [ownerName, setOwnerName] = useState("나");
  const [inviteCode, setInviteCode] = useState("");
  const [memberName, setMemberName] = useState("");

  const expiringItems = useMemo(
    () => ingredients.filter((item) => getDday(item.expiryDate) <= 3).slice(0, 5),
    [ingredients],
  );
  const familyRecommendations = useMemo(
    () =>
      rankRecipeRecommendations(
        filterBeginnerHomeRecipes(filterPublicationApprovedRecipes(CURATED_RECIPE_RECORDS)),
        ingredients,
      )
        .slice(0, 8)
        .map(({ recipe, match }) => ({
          ...recipe,
          ...match,
          recommendationReason: buildRecipeRecommendationReason({
            recipeName: recipe.name,
            matchedIngredients: match.matchedIngredients,
            missingIngredients: match.missingIngredients,
            expiringIngredients: [],
          }),
        })),
    [ingredients],
  );
  const todayRecipe = familyRecommendations[0] ?? null;
  const syncIndicator = syncState === "synced"
    ? { label: "가족과 동기화됨", className: "bg-[#eef8e9] text-[#315f2d]", icon: CheckCircle2 }
    : syncState === "syncing"
      ? { label: "동기화 중", className: "bg-[#fff6df] text-[#8a6214]", icon: LoaderCircle }
      : syncState === "failed"
        ? { label: "동기화 실패 · 이 기기에만 저장", className: "bg-[#fff0ed] text-[#b42318]", icon: AlertTriangle }
        : { label: "이 기기에만 저장됨", className: "bg-[#f1eee9] text-[#6f655b]", icon: CloudOff };
  const SyncIcon = syncIndicator.icon;
  const realtimeLabel = realtimeState === "connected"
    ? "실시간 연결됨"
    : realtimeState === "connecting"
      ? "실시간 연결 중"
      : realtimeState === "degraded"
        ? "실시간 지연 · 수동 새로고침 가능"
        : "실시간 대기";
  const activityLabel = (eventType: (typeof activities)[number]["eventType"]) => {
    if (eventType === "group_created") return "가족 냉장고를 만들었습니다.";
    if (eventType === "member_joined") return "가족 냉장고에 참여했습니다.";
    if (eventType === "member_updated") return "표시 이름을 변경했습니다.";
    return "가족 냉장고에서 나갔습니다.";
  };

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      {confirmationDialog}
      <section className="mobile-safe-top px-5">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/mypage" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]" aria-label="마이페이지로 돌아가기">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-center text-[16px] font-black text-[#2f2117]">가족 냉장고</h1>
          <span />
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel rounded-[20px] px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#fff0e4] text-[#d94d19]">
              <Users size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-black text-[#2f2117]">
                {group ? group.name : "가족과 오늘 뭐 먹을지 공유"}
              </h2>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7d6d5f]">
                최대 {maxMembers}명까지 같은 냉장고 보드를 보고, 오늘 추천 메뉴와 소진임박 재료를 확인합니다.
              </p>
              {group ? (
                <span data-testid="family-sync-state" className={`mt-2 inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-[11px] font-black ${syncIndicator.className}`}>
                  <SyncIcon size={13} className={syncState === "syncing" ? "animate-spin" : ""} /> {syncIndicator.label}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {!group ? (
        <section className="px-5 pt-4">
          <div className="jipbab-panel space-y-3 rounded-[18px] px-4 py-4">
            <h2 className="text-[15px] font-black text-[#2f2117]">가족 냉장고 만들기</h2>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="w-full rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-bold text-[#4b3929] outline-none"
              placeholder="공유 냉장고 이름"
            />
            <input
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className="w-full rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-bold text-[#4b3929] outline-none"
              placeholder="내 이름"
            />
            <button
              type="button"
              onClick={() => {
                void createGroup(groupName, ownerName);
              }}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] text-sm font-black text-white"
            >
              <Home size={16} />
              공유 냉장고 만들기
            </button>
          </div>

          <div className="jipbab-panel mt-3 space-y-3 rounded-[18px] px-4 py-4">
            <h2 className="text-[15px] font-black text-[#2f2117]">초대코드로 참여</h2>
            <div className="grid grid-cols-[1fr_96px] gap-2">
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                className="rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-bold uppercase text-[#4b3929] outline-none"
                placeholder="초대코드"
              />
              <input
                value={memberName}
                onChange={(event) => setMemberName(event.target.value)}
                className="rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-bold text-[#4b3929] outline-none"
                placeholder="이름"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                void joinGroup(inviteCode, memberName);
              }}
              className="min-h-11 w-full rounded-[13px] border border-[#ea5a1f] bg-[#fffaf3] text-sm font-black text-[#d94d19]"
            >
              참여하기
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="px-5 pt-4">
            <div className="jipbab-panel rounded-[18px] px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black text-[#8f7f70]">초대코드</p>
                  <p className="mt-1 text-[24px] font-black tracking-[0.18em] text-[#2f2117]">{group.inviteCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(group.inviteCode);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0e4] text-[#d94d19]"
                  aria-label="초대코드 복사"
                  disabled={syncState !== "synced"}
                >
                  <Copy size={17} />
                </button>
              </div>
              {syncState !== "synced" ? (
                <p className="mt-3 rounded-xl bg-[#fff0ed] px-3 py-2 text-[11px] font-bold leading-5 text-[#b42318]">
                  동기화되지 않은 초대코드는 다른 기기에서 사용할 수 없습니다.
                </p>
              ) : null}
            </div>
          </section>

          <section className="px-5 pt-4">
            <div className="jipbab-panel rounded-[18px] px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-black text-[#2f2117]">가족 구성원</h2>
                <span className="text-[12px] font-black text-[#8f7f70]">{group.members.length}/{maxMembers}</span>
              </div>
              <div className="mt-3 space-y-2">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-[13px] bg-[#fffaf3] px-3 py-3">
                    <div>
                      <p className="text-sm font-black text-[#4b3929]">{member.name}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-[#9f8d7a]">{member.role === "owner" ? "대표" : "가족"}</p>
                    </div>
                  </div>
                ))}
              </div>
              {group.members.length < maxMembers ? (
                <p className="mt-3 rounded-[13px] bg-[#fffaf3] px-3 py-3 text-[11px] font-bold leading-5 text-[#7d6d5f]">
                  가족 구성원은 각자 로그인한 뒤 동기화된 초대코드로 참여해야 합니다. 이 기기에서 이름만 추가하지 않습니다.
                </p>
              ) : null}
            </div>
          </section>

          <section className="px-5 pt-4">
            <div className="jipbab-panel rounded-[18px] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-[15px] font-black text-[#2f2117]">
                    <Activity size={16} /> 가족 활동
                  </h2>
                  <p className="mt-1 text-[11px] font-bold text-[#8f7f70]">{realtimeLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { void refreshGroup(); }}
                  disabled={syncState !== "synced"}
                  className="flex min-h-11 items-center gap-1 rounded-full bg-[#fff0e4] px-3 text-[11px] font-black text-[#d94d19] disabled:opacity-50"
                >
                  <RefreshCw size={13} /> 새로고침
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {activities.length === 0 ? (
                  <p className="rounded-[13px] bg-[#fffaf3] px-3 py-3 text-[11px] font-bold text-[#8f7f70]">
                    기록된 가족 활동이 없습니다.
                  </p>
                ) : activities.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="rounded-[13px] bg-[#fffaf3] px-3 py-3">
                    <p className="text-[12px] font-black text-[#4b3929]">
                      {activity.actorName}님이 {activityLabel(activity.eventType)}
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-[#9f8d7a]">
                      {new Date(activity.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 px-5 pt-4">
            <div className="jipbab-panel rounded-[16px] px-3 py-3">
              <p className="text-[12px] font-bold text-[#8f7f70]">오늘 뭐먹지</p>
              <p className="mt-1 truncate text-[15px] font-black text-[#2f2117]">{todayRecipe?.name ?? "재료 등록 필요"}</p>
            </div>
            <div className="jipbab-panel rounded-[16px] px-3 py-3">
              <p className="text-[12px] font-bold text-[#8f7f70]">소진임박</p>
              <p className="mt-1 text-[15px] font-black text-[#d94d19]">{expiringItems.length}개</p>
            </div>
          </section>

          <section className="px-5 pt-4">
            <div className="jipbab-panel rounded-[18px] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-black text-[#2f2117]">가족 냉장고 추천</h2>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7d6d5f]">
                    현재 공유된 재료 기준으로 {group.members.length}명이 먹기 쉬운 메뉴를 먼저 보여줍니다.
                  </p>
                </div>
                <Link href="/recipe" className="shrink-0 text-[12px] font-black text-[#d94d19]">
                  더보기
                </Link>
              </div>
              {familyRecommendations.length === 0 ? (
                <div className="mt-3 rounded-[14px] bg-[#fff7ed] px-3 py-3">
                  <p className="text-[12px] font-black text-[#4b3929]">추천할 가족 메뉴가 아직 없어요.</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#8f7f70]">냉장고 재료를 추가하면 초보자용 메뉴가 먼저 정렬됩니다.</p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {familyRecommendations.slice(0, 4).map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={syncState === "synced" ? `/recipe/${recipe.id}?scope=family#shopping-assistant` : `/recipe/${recipe.id}#shopping-assistant`}
                      className="flex items-center justify-between gap-3 rounded-[14px] bg-[#fffaf3] px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#4b3929]">{recipe.name}</p>
                        <p className="mt-0.5 truncate text-[11px] font-bold text-[#8f7f70]">
                          부족 {recipe.missingIngredients.length}개 · {recipe.recommendationReason} · {group.members.length}인 가족 기준
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#fff0e4] px-2 py-1 text-[10px] font-black text-[#d94d19]">
                        만들기
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="px-5 pt-4">
            <button
              type="button"
              onClick={() => {
                void requestConfirmation({
                  title: "가족 냉장고에서 나갈까요?",
                  message: "일반 구성원은 그룹에서 탈퇴합니다. 대표가 혼자 남은 그룹이면 공유 재료와 장보기 데이터가 함께 삭제될 수 있습니다.",
                  confirmLabel: "탈퇴하기",
                  destructive: true,
                }).then((confirmed) => {
                  if (confirmed) void leaveGroup();
                });
              }}
              className="w-full rounded-[14px] border border-[#ea5a1f] bg-[#fffaf3] py-3 text-sm font-black text-[#d94d19]"
            >
              가족 냉장고 탈퇴
            </button>
          </section>
        </>
      )}

      {statusMessage || error ? (
        <p className="mx-5 mt-3 rounded-[14px] bg-[#fff0e4] px-3 py-2 text-[12px] font-bold text-[#d94d19]">
          {statusMessage || error}
        </p>
      ) : null}
    </div>
  );
}
