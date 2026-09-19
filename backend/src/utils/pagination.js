/**
 * src/utils/pagination.js
 * Shared, bounded pagination parsing so no list endpoint can be
 * asked for an unbounded page size (a cheap denial-of-service vector).
 */
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 24;

function parsePagination(query) {
  let page = parseInt(query.page, 10);
  let perPage = parseInt(query.perPage, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(perPage) || perPage < 1) perPage = DEFAULT_PAGE_SIZE;
  if (perPage > MAX_PAGE_SIZE) perPage = MAX_PAGE_SIZE;

  const offset = (page - 1) * perPage;
  return { page, perPage, offset, limit: perPage };
}

function buildMeta({ page, perPage, total }) {
  return {
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

module.exports = {
  parsePagination,
  buildMeta,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
};
