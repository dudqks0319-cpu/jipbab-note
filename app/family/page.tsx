// 이 파일은 최대 4명 가족 냉장고 공유 MVP 화면을 제공합니다.
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, Copy, Home, Plus, Trash2, Users } from "lucide-react";

import { useFamilyShare } from "@/hooks/useFamilyShare";
import { useIngredients } from "@/hooks/useIngredients";
import { useRecipes } from "@/hooks/useRecipes";
import { getDday } from "@/lib/utils";

export default function FamilyPage() {
  const {
    group,
    maxMembers,
    statusMessage,
    error,
    createGroup,
    joinGroup,
    addLocalMember,
    removeMember,
    leaveGroup,
  } = useFamilyShare();
  const { ingredients } = useIngredients();
  const { recipes } = useRecipes(8);
  const [groupName, setGroupName] = useState("우리집 냉장고");
  const [ownerName, setOwnerName] = useState("나");
  const [inviteCode, setInviteCode] = useState("");
  const [memberName, setMemberName] = useState("");

  const expiringItems = useMemo(
    () => ingredients.filter((item) => getDday(item.expiryDate) <= 3).slice(0, 5),
    [ingredients],
  );
  const todayRecipe = recipes[0] ?? null;

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/mypage" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]" aria-label="마이페이지로 돌아가기">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0e4] text-[#d94d19]"
                  aria-label="초대코드 복사"
                >
                  <Copy size={17} />
                </button>
              </div>
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
                    {member.role === "member" ? (
                      <button type="button" onClick={() => removeMember(member.id)} className="p-2 text-[#b5a493]" aria-label={`${member.name} 제거`}>
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {group.members.length < maxMembers ? (
                <div className="mt-3 grid grid-cols-[1fr_92px] gap-2">
                  <input
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    placeholder="가족 이름"
                    className="rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-bold text-[#4b3929] outline-none"
                  />
                  <button type="button" onClick={() => { addLocalMember(memberName); setMemberName(""); }} className="inline-flex items-center justify-center gap-1 rounded-[13px] bg-[#2f2117] text-sm font-black text-white">
                    <Plus size={15} />
                    추가
                  </button>
                </div>
              ) : null}
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
            <button
              type="button"
              onClick={leaveGroup}
              className="w-full rounded-[14px] border border-[#ea5a1f] bg-[#fffaf3] py-3 text-sm font-black text-[#d94d19]"
            >
              가족 공유 해제
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
