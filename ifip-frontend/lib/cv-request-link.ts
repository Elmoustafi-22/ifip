export function isCvRequestPath(path: string | null): path is string {
  return path !== null && /^\/dashboard\/cv-requests\/[a-f0-9]{24}$/i.test(path);
}

export function expiredSessionLoginPath(path: string) {
  const params = new URLSearchParams({ session: "expired" });
  if (isCvRequestPath(path)) params.set("next", path);
  return `/login?${params}`;
}
