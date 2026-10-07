import { useCallback, useEffect, useRef, useState } from 'react';

const ENDPOINT = '/api/admin/audit-log';

function normalizeResponse(data) {
  const pagination = data?.pagination || {};
  const items = data?.items || data?.entries || data?.logs || [];
  const nextCursor = data?.nextCursor ?? data?.next_cursor
    ?? pagination.nextCursor ?? pagination.next_cursor ?? null;
  const hasMore = data?.hasMore ?? data?.has_more
    ?? pagination.hasMore ?? pagination.has_more ?? Boolean(nextCursor);
  return { items: Array.isArray(items) ? items : [], nextCursor, hasMore: Boolean(hasMore) };
}

function buildQuery(filters, cursor) {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params.set(key, value);
  });
  params.set('limit', '50');
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}

export default function useAdminAuditLog({ token, enabled }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const requestRef = useRef(0);

  const fetchPage = useCallback(async (filters = {}, cursor = null, append = false) => {
    if (!token) return;
    const requestId = ++requestRef.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const response = await fetch(`${ENDPOINT}?${buildQuery(filters, cursor)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Не удалось загрузить журнал');
      }
      if (requestId !== requestRef.current) return;
      const normalized = normalizeResponse(data);
      setEntries(previous => append ? [...previous, ...normalized.items] : normalized.items);
      setNextCursor(normalized.nextCursor);
      setHasMore(normalized.hasMore);
    } catch (err) {
      if (requestId === requestRef.current) setError(err.message || 'Ошибка соединения');
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [token]);

  const applyFilters = useCallback((filters = {}) => {
    setActiveFilters(filters);
    setNextCursor(null);
    return fetchPage(filters, null, false);
  }, [fetchPage]);

  const reload = useCallback(() => fetchPage(activeFilters, null, false), [activeFilters, fetchPage]);
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextCursor) return fetchPage(activeFilters, nextCursor, true);
    return Promise.resolve();
  }, [activeFilters, fetchPage, hasMore, loadingMore, nextCursor]);

  useEffect(() => {
    if (enabled && token) applyFilters({});
  }, [enabled, token]); // eslint-disable-line react-hooks/exhaustive-deps

  return { entries, loading, loadingMore, error, hasMore, applyFilters, reload, loadMore };
}
