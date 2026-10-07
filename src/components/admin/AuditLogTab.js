import React, { useMemo, useState } from 'react';
import useAdminAuditLog from '../../hooks/useAdminAuditLog';
import {
  AUDIT_ACTOR_LABELS,
  AUDIT_EVENT_LABELS,
  AUDIT_RESULT_LABELS,
  getAuditEventLabel,
} from '../../config/auditEvents';

const COLORS = {
  bg: '#1a1a1a', surface: '#202024', raise: '#2c2c30', text: '#e8e8f0',
  muted: '#888899', border: 'rgba(255,255,255,0.07)', accent: '#3CC8A1',
  danger: '#ff4d6a', warn: '#f5923a',
};

const EMPTY_FILTERS = {
  from: '', to: '', event: '', actorType: '', actorId: '',
  targetType: '', targetId: '', result: '', requestId: '',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Yekaterinburg', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : DATE_FORMATTER.format(date);
}

function toApiFilters(filters) {
  return {
    ...filters,
    // Границы календарного дня тоже трактуем по времени Екатеринбурга.
    from: filters.from ? `${filters.from}T00:00:00+05:00` : '',
    to: filters.to ? `${filters.to}T23:59:59.999+05:00` : '',
  };
}

function displayActor(entry) {
  return entry.actor_label || AUDIT_ACTOR_LABELS[entry.actor_type] || entry.actor_type || '—';
}

function displayTarget(entry) {
  if (!entry.target_type && !entry.target_id) return '—';
  return [entry.target_type, entry.target_id].filter(Boolean).join(' · ');
}

function ResultBadge({ result }) {
  const color = result === 'succeeded' ? COLORS.accent
    : result === 'failed' || result === 'denied' ? COLORS.danger : COLORS.warn;
  return (
    <span style={{ ...styles.badge, color, borderColor: `${color}55`, background: `${color}12` }}>
      {AUDIT_RESULT_LABELS[result] || result || '—'}
    </span>
  );
}

function JsonBlock({ title, value }) {
  if (value == null || (typeof value === 'object' && Object.keys(value).length === 0)) return null;
  let content;
  try { content = JSON.stringify(value, null, 2); } catch (_) { content = String(value); }
  return (
    <div style={styles.detailSection}>
      <div style={styles.detailLabel}>{title}</div>
      <pre style={styles.jsonBlock}>{content}</pre>
    </div>
  );
}

function DetailsModal({ entry, onClose, onFilterTarget }) {
  if (!entry) return null;
  const rows = [
    ['Время (Екатеринбург)', formatDate(entry.occurred_at)],
    ['Событие', getAuditEventLabel(entry.event_name)],
    ['Код события', entry.event_name],
    ['Исполнитель', displayActor(entry)],
    ['ID исполнителя', entry.actor_id],
    ['Объект', displayTarget(entry)],
    ['Источник', entry.source],
    ['HTTP', [entry.http_method, entry.status_code].filter(Boolean).join(' ')],
    ['Request ID', entry.request_id],
    ['Correlation ID', entry.correlation_id],
    ['Код ошибки', entry.error_code],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  return (
    <div style={styles.overlay} role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section style={styles.sheet} role="dialog" aria-modal="true" aria-label="Подробности события">
        <div style={styles.sheetHeader}>
          <div>
            <div style={styles.sheetTitle}>{getAuditEventLabel(entry.event_name)}</div>
            <ResultBadge result={entry.result} />
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        <div style={styles.detailGrid}>
          {rows.map(([label, value]) => (
            <div key={label} style={styles.detailRow}>
              <span style={styles.detailLabel}>{label}</span>
              <span style={styles.detailValue}>{String(value)}</span>
            </div>
          ))}
        </div>
        {entry.target_type === 'user' && entry.target_id && (
          <button type="button" style={styles.secondaryButton} onClick={() => onFilterTarget(entry.target_id)}>
            Показать историю этого пользователя
          </button>
        )}
        <JsonBlock title="Изменения" value={entry.changes_json ?? entry.changes} />
        <JsonBlock title="Метаданные" value={entry.metadata_json ?? entry.metadata} />
      </section>
    </div>
  );
}

export default function AuditLogTab({ token, enabled = true }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const { entries, loading, loadingMore, error, hasMore, applyFilters, reload, loadMore } =
    useAdminAuditLog({ token, enabled });

  const eventOptions = useMemo(() => Object.entries(AUDIT_EVENT_LABELS), []);
  const setFilter = (name, value) => setFilters(current => ({ ...current, [name]: value }));
  const submitFilters = event => { event.preventDefault(); applyFilters(toApiFilters(filters)); };
  const clearFilters = () => { setFilters(EMPTY_FILTERS); applyFilters({}); };
  const filterTarget = targetId => {
    const next = { ...filters, targetType: 'user', targetId };
    setFilters(next);
    setSelectedEntry(null);
    applyFilters(toApiFilters(next));
  };

  return (
    <div>
      <style>{`
        .audit-table { display: none; }
        .audit-cards { display: flex; flex-direction: column; gap: 8px; }
        @media (min-width: 760px) {
          .audit-table { display: table; width: 100%; border-collapse: collapse; }
          .audit-cards { display: none; }
        }
      `}</style>
      <div style={styles.hero}>
        <div>
          <div style={styles.title}>Журнал действий</div>
          <div style={styles.help}>Значимые действия персонала, пользователей и системы. Время — Екатеринбург.</div>
        </div>
        <button type="button" style={styles.compactButton} onClick={reload} disabled={loading}>↻</button>
      </div>

      <button type="button" style={styles.filterToggle} onClick={() => setFiltersOpen(value => !value)}>
        Фильтры {filtersOpen ? '▲' : '▼'}
      </button>
      {filtersOpen && (
        <form onSubmit={submitFilters} style={styles.filters}>
          <label style={styles.field}><span>С</span><input aria-label="Дата с" type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)} style={styles.input} /></label>
          <label style={styles.field}><span>По</span><input aria-label="Дата по" type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)} style={styles.input} /></label>
          <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
            <span>Событие</span>
            <select aria-label="Событие" value={filters.event} onChange={e => setFilter('event', e.target.value)} style={styles.input}>
              <option value="">Все события</option>
              {eventOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label style={styles.field}><span>Исполнитель</span><select aria-label="Тип исполнителя" value={filters.actorType} onChange={e => setFilter('actorType', e.target.value)} style={styles.input}><option value="">Все</option>{Object.entries(AUDIT_ACTOR_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label style={styles.field}><span>ID исполнителя</span><input aria-label="ID исполнителя" value={filters.actorId} onChange={e => setFilter('actorId', e.target.value)} style={styles.input} /></label>
          <label style={styles.field}><span>Тип объекта</span><input aria-label="Тип объекта" value={filters.targetType} onChange={e => setFilter('targetType', e.target.value)} placeholder="user, product..." style={styles.input} /></label>
          <label style={styles.field}><span>ID объекта</span><input aria-label="ID объекта" value={filters.targetId} onChange={e => setFilter('targetId', e.target.value)} style={styles.input} /></label>
          <label style={styles.field}><span>Результат</span><select aria-label="Результат" value={filters.result} onChange={e => setFilter('result', e.target.value)} style={styles.input}><option value="">Все</option>{Object.entries(AUDIT_RESULT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label style={styles.field}><span>Request ID</span><input aria-label="Request ID" value={filters.requestId} onChange={e => setFilter('requestId', e.target.value)} style={styles.input} /></label>
          <div style={styles.filterActions}>
            <button type="submit" style={styles.primaryButton} disabled={loading}>Применить</button>
            <button type="button" style={styles.secondaryButton} onClick={clearFilters} disabled={loading}>Сбросить</button>
          </div>
        </form>
      )}

      {loading && <div style={styles.state} role="status">Загрузка журнала…</div>}
      {!loading && error && <div style={styles.error} role="alert"><span>{error}</span><button type="button" onClick={reload} style={styles.retryButton}>Повторить</button></div>}
      {!loading && !error && entries.length === 0 && <div style={styles.state}>Записей по выбранным фильтрам нет.</div>}

      {!loading && !error && entries.length > 0 && (
        <>
          <div style={styles.tableWrap}>
            <table className="audit-table">
              <thead><tr>{['Время', 'Событие', 'Исполнитель', 'Объект', 'Результат', ''].map(title => <th key={title} style={styles.th}>{title}</th>)}</tr></thead>
              <tbody>{entries.map((entry, index) => (
                <tr key={entry.id ?? `${entry.occurred_at}-${index}`}>
                  <td style={styles.td}>{formatDate(entry.occurred_at)}</td><td style={styles.td}><strong>{getAuditEventLabel(entry.event_name)}</strong><div style={styles.code}>{entry.event_name}</div></td>
                  <td style={styles.td}>{displayActor(entry)}</td><td style={styles.td}>{displayTarget(entry)}</td><td style={styles.td}><ResultBadge result={entry.result} /></td>
                  <td style={styles.td}><button type="button" style={styles.detailsButton} onClick={() => setSelectedEntry(entry)}>Детали</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="audit-cards">{entries.map((entry, index) => (
            <button type="button" key={entry.id ?? `${entry.occurred_at}-${index}`} style={styles.card} onClick={() => setSelectedEntry(entry)} aria-label={`Детали: ${getAuditEventLabel(entry.event_name)}`}>
              <div style={styles.cardTop}><span style={styles.cardDate}>{formatDate(entry.occurred_at)}</span><ResultBadge result={entry.result} /></div>
              <div style={styles.cardTitle}>{getAuditEventLabel(entry.event_name)}</div>
              <div style={styles.cardMeta}>{displayActor(entry)} → {displayTarget(entry)}</div>
            </button>
          ))}</div>
          {hasMore && <button type="button" style={styles.loadMore} onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Загрузка…' : 'Загрузить ещё'}</button>}
        </>
      )}

      <DetailsModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} onFilterTarget={filterTarget} />
    </div>
  );
}

const styles = {
  hero: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', padding: 14, marginBottom: 10, background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}` },
  title: { color: COLORS.accent, fontWeight: 800, fontSize: 17 },
  help: { color: COLORS.muted, fontSize: 11, lineHeight: 1.5, marginTop: 4 },
  compactButton: { minWidth: 38, minHeight: 38, border: 0, borderRadius: 9, color: COLORS.accent, background: COLORS.raise, cursor: 'pointer', fontSize: 18 },
  filterToggle: { width: '100%', padding: '10px 12px', textAlign: 'left', border: 0, borderRadius: 10, background: COLORS.surface, color: COLORS.text, fontWeight: 700, cursor: 'pointer', marginBottom: 8 },
  filters: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10, marginBottom: 12, background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}` },
  field: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, color: COLORS.muted, fontSize: 10, fontWeight: 700 },
  input: { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 9px', border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.bg, color: COLORS.text, fontSize: 11, outline: 'none' },
  filterActions: { display: 'flex', gap: 8, gridColumn: '1 / -1' },
  primaryButton: { flex: 1, padding: '9px 12px', border: 0, borderRadius: 9, background: COLORS.accent, color: '#051a12', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { padding: '9px 12px', border: `1px solid ${COLORS.border}`, borderRadius: 9, background: COLORS.raise, color: COLORS.text, fontWeight: 700, cursor: 'pointer' },
  state: { padding: 24, textAlign: 'center', color: COLORS.muted, background: COLORS.surface, borderRadius: 12 },
  error: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 14, color: COLORS.danger, background: 'rgba(255,77,106,0.08)', borderRadius: 12 },
  retryButton: { border: `1px solid ${COLORS.danger}`, borderRadius: 8, padding: '7px 10px', color: COLORS.danger, background: 'transparent', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto', borderRadius: 12, background: COLORS.surface },
  th: { padding: '10px 8px', color: COLORS.muted, fontSize: 10, textAlign: 'left', borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap' },
  td: { padding: '10px 8px', color: COLORS.text, fontSize: 10, verticalAlign: 'top', borderBottom: `1px solid ${COLORS.border}`, maxWidth: 200, wordBreak: 'break-word' },
  code: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  badge: { display: 'inline-flex', padding: '3px 6px', border: '1px solid', borderRadius: 6, fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap' },
  detailsButton: { border: 0, borderRadius: 7, padding: '6px 8px', color: COLORS.accent, background: 'rgba(60,200,161,0.1)', cursor: 'pointer', fontSize: 10 },
  card: { width: '100%', padding: 12, textAlign: 'left', color: COLORS.text, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, cursor: 'pointer' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardDate: { color: COLORS.muted, fontSize: 10 },
  cardTitle: { fontWeight: 800, fontSize: 12, marginTop: 8 },
  cardMeta: { color: COLORS.muted, fontSize: 10, marginTop: 5, wordBreak: 'break-word' },
  loadMore: { width: '100%', marginTop: 12, padding: 11, border: 0, borderRadius: 10, color: COLORS.accent, background: COLORS.surface, fontWeight: 800, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 12, background: 'rgba(0,0,0,0.72)' },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box', padding: 16, borderRadius: '18px 18px 10px 10px', background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` },
  sheetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  sheetTitle: { fontSize: 15, fontWeight: 800, marginBottom: 7 },
  closeButton: { width: 38, height: 38, border: 0, borderRadius: 9, background: COLORS.raise, color: COLORS.muted, cursor: 'pointer', fontSize: 17 },
  detailGrid: { display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 12 },
  detailRow: { display: 'grid', gridTemplateColumns: 'minmax(110px, 0.8fr) 1.2fr', gap: 10, padding: '7px 0', borderBottom: `1px solid ${COLORS.border}` },
  detailLabel: { color: COLORS.muted, fontSize: 10, fontWeight: 700 },
  detailValue: { color: COLORS.text, fontSize: 11, wordBreak: 'break-word' },
  detailSection: { marginTop: 14 },
  jsonBlock: { maxHeight: 220, overflow: 'auto', margin: '5px 0 0', padding: 10, borderRadius: 8, background: COLORS.bg, color: '#c7f5e7', fontSize: 10, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
};
