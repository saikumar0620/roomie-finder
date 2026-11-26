/**
 * Parse and clamp pagination query params (?page=1&limit=20).
 */
export function parsePagination(
  query,
  { defaultLimit = 20, maxLimit = 50 } = {}
) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const rawLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build consistent pagination metadata for list responses.
 */
export function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const hasNextPage = page < totalPages;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage: page > 1,
    nextPage: hasNextPage ? page + 1 : undefined,
  };
}
