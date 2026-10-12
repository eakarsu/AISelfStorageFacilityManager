// Record endpoints return either a plain array or a paginated { data, pagination } response.
export function recordRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}
