// src/components/GiftPeriodsHistory.js — История подарочных периодов (окон)
// Показывается в аккордеоне ProfilePage рядом с «История заказов».

import React from 'react';

function parseDate(ddmmyyyy) {
  if (!ddmmyyyy) return null;
  const [dd, mm, yyyy] = String(ddmmyyyy).split('.');
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / ms);
}

function formatShort(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  const [dd, mm] = String(ddmmyyyy).split('.');
  return `${dd}.${mm}`;
}

const rowBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 10,
  marginBottom: 6,
  border: '1px solid rgba(255,255,255,0.06)',
};

const styles = {
  claimed: { ...rowBase, background: 'rgba(60, 200, 161, 0.08)', borderColor: 'rgba(60, 200, 161, 0.25)' },
  available: { ...rowBase, background: 'rgba(255, 200, 60, 0.1)', borderColor: 'rgba(255, 200, 60, 0.35)' },
  upcoming: { ...rowBase, background: 'rgba(255,255,255,0.03)' },
  expired: { ...rowBase, background: 'rgba(255,255,255,0.02)', opacity: 0.55 },
  icon: { fontSize: 20, flex: '0 0 24px', textAlign: 'center' },
  title: { color: '#eaeaf8', fontSize: 13, fontWeight: 600 },
  meta: { color: '#9fb0c3', fontSize: 12, marginTop: 2 },
  sectionTitle: { color: '#eaeaf8', fontSize: 13, fontWeight: 700, margin: '4px 0 8px' },
  sectionWrap: { marginBottom: 14 },
};

function WindowRow({ w, giftType, today }) {
  const label = giftType === 'set' ? 'Сет' : 'Ролл';
  const start = parseDate(w.start);
  const end = parseDate(w.end);
  if (!start || !end) return null;

  const range = `${formatShort(w.start)} — ${formatShort(w.end)}`;

  if (w.status === 'claimed') {
    const claimedDate = w.claimedAt ? new Date(w.claimedAt).toLocaleDateString('ru-RU') : null;
    return (
      <div style={styles.claimed}>
        <div style={styles.icon}>✓</div>
        <div style={{ flex: 1 }}>
          <div style={styles.title}>{label} · {range}</div>
          <div style={styles.meta}>Получен{claimedDate ? ` ${claimedDate}` : ''}</div>
        </div>
      </div>
    );
  }

  if (start > today) {
    const daysTo = daysBetween(today, start);
    return (
      <div style={styles.upcoming}>
        <div style={styles.icon}>⏳</div>
        <div style={{ flex: 1 }}>
          <div style={styles.title}>{label} · {range}</div>
          <div style={styles.meta}>Откроется через {daysTo} дн.</div>
        </div>
      </div>
    );
  }

  // Период закончился, подарок не был получен — недоступно
  if (end < today) {
    return (
      <div style={styles.expired}>
        <div style={styles.icon}>✕</div>
        <div style={{ flex: 1 }}>
          <div style={styles.title}>{label} · {range}</div>
          <div style={styles.meta}>Период прошёл — подарок недоступен</div>
        </div>
      </div>
    );
  }

  const daysLeft = Math.max(0, daysBetween(today, end));
  return (
    <div style={styles.available}>
      <div style={styles.icon}>🎁</div>
      <div style={{ flex: 1 }}>
        <div style={styles.title}>{label} · {range}</div>
        <div style={styles.meta}>Доступно — осталось {daysLeft} дн.</div>
      </div>
    </div>
  );
}

function GiftPeriodsHistory({ windows, tarif, adminGrants }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasTariff = tarif === '490' || tarif === '1190';
  const giftType = tarif === '1190' ? 'set' : 'roll';

  const list = Array.isArray(windows) ? windows : [];
  const regular = list.filter(w => w.grantedBy !== 'admin');
  const admin = list.filter(w => w.grantedBy === 'admin');

  if (!hasTariff && admin.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 8px' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎁</div>
        <div style={{ fontWeight: 600, color: '#eaeaf8', marginBottom: 6 }}>
          Подарки доступны на подписках
        </div>
        <div style={{ fontSize: 13, color: '#9fb0c3', lineHeight: 1.6, marginBottom: 14 }}>
          <div>• <strong>690 ₽/мес</strong> — ролл в подарок каждые 15 дней</div>
          <div>• <strong>1390 ₽/мес</strong> — сет в подарок каждые 30 дней</div>
        </div>
        <a
          href="/"
          style={{
            display: 'inline-block',
            background: '#3CC8A1',
            color: '#000',
            padding: '10px 18px',
            borderRadius: 10,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Выбрать тариф
        </a>
      </div>
    );
  }

  return (
    <div>
      {hasTariff && regular.length > 0 && (
        <div style={styles.sectionWrap}>
          <div style={styles.sectionTitle}>
            {giftType === 'set' ? '🍱 Подарочные сеты' : '🍣 Подарочные роллы'}
          </div>
          {regular.map((w, i) => (
            <WindowRow key={`r-${i}`} w={w} giftType={giftType} today={today} />
          ))}
        </div>
      )}

      {admin.length > 0 && (
        <div style={styles.sectionWrap}>
          <div style={styles.sectionTitle}>👑 Подарки от администрации</div>
          {admin.map((w, i) => (
            <WindowRow key={`a-${i}`} w={w} giftType={w.grantType || giftType} today={today} />
          ))}
        </div>
      )}

      {hasTariff && regular.length === 0 && admin.length === 0 && (
        <div style={{ color: '#9fb0c3', textAlign: 'center', padding: 12 }}>
          Периодов пока нет — подписка только начинается.
        </div>
      )}
    </div>
  );
}

export default GiftPeriodsHistory;
