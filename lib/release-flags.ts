// 이 파일은 출시 후보에서 숨길 기능 플래그를 한곳에서 판단합니다.
export function isCommunityEnabled(): boolean {
  return process.env.NEXT_PUBLIC_COMMUNITY_ENABLED === "true";
}
