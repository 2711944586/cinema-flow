export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const normalizedPageSize = normalizePositiveInteger(pageSize, 12);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const normalizedPage = Math.min(
    totalPages,
    Math.max(1, normalizePositiveInteger(page, 1))
  );
  const startIndex = totalItems === 0 ? 0 : (normalizedPage - 1) * normalizedPageSize;
  const endIndex = Math.min(startIndex + normalizedPageSize, totalItems);

  return {
    items: items.slice(startIndex, endIndex),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalItems,
    totalPages,
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: totalItems === 0 ? 0 : endIndex,
    hasPreviousPage: normalizedPage > 1,
    hasNextPage: normalizedPage < totalPages
  };
}

export function getVisiblePageNumbers(page: number, totalPages: number, radius = 2): number[] {
  const normalizedTotalPages = Math.max(1, normalizePositiveInteger(totalPages, 1));
  const normalizedPage = Math.min(normalizedTotalPages, Math.max(1, normalizePositiveInteger(page, 1)));
  const normalizedRadius = Math.max(1, normalizePositiveInteger(radius, 2));
  const startPage = Math.max(1, normalizedPage - normalizedRadius);
  const endPage = Math.min(normalizedTotalPages, normalizedPage + normalizedRadius);

  const pages: number[] = [];
  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    pages.push(currentPage);
  }

  return pages;
}

export function normalizePageSize(value: unknown, fallback: number, options: number[] = []): number {
  const normalizedValue = normalizePositiveInteger(value, fallback);
  if (options.length === 0) {
    return normalizedValue;
  }

  return options.includes(normalizedValue) ? normalizedValue : fallback;
}
