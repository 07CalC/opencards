export type Pagination = {
  limit: number;
  cursor?: string;
};

export function parsePagination(url: string, defaultLimit = 50, maxLimit = 100): Pagination {
  const params = new URL(url).searchParams;
  const raw = Number(params.get("limit") ?? defaultLimit);
  const limit = Number.isFinite(raw)
    ? Math.min(Math.max(Math.floor(raw), 1), maxLimit)
    : defaultLimit;
  const cursor = params.get("cursor") || undefined;
  return { limit, cursor };
}
