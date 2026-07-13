// 이 파일은 반복 성능 측정 사이에 사용자 상태만 초기화하고 네트워크 캐시는 보존합니다.
export const routeStateStorageTypes = Object.freeze([
  "local_storage",
  "indexeddb",
  "websql",
]);

export function buildRouteStateResetParams(origin) {
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.origin !== origin) {
    throw new Error("route state reset requires an exact origin");
  }

  return {
    origin,
    storageTypes: routeStateStorageTypes.join(","),
  };
}
