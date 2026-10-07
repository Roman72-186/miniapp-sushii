import React, { useEffect, useState } from 'react';

const FUNNELS = [
  ['subscription', 'Подписка'],
  ['order', 'Заказ'],
  ['auth', 'Вход'],
];

export default function FunnelTab({ token }) {
  const [funnel, setFunnel] = useState('subscription');
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/admin/funnel?funnel=${funnel}&days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Ошибка загрузки');
        if (active) setData(body);
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, funnel, days]);

  const controlStyle = { background: '#202024', color: '#e8e8f0', border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, padding: '9px 11px' };
  const cardStyle = { background: '#18181b', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 14 };

  return (
    <section aria-label="Воронки пользователей">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <select aria-label="Воронка" value={funnel} onChange={event => setFunnel(event.target.value)} style={controlStyle}>
          {FUNNELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Период" value={days} onChange={event => setDays(Number(event.target.value))} style={controlStyle}>
          <option value={1}>1 день</option><option value={7}>7 дней</option><option value={30}>30 дней</option>
        </select>
      </div>

      {loading && <p style={{ color: '#a1a1aa' }}>Загрузка воронки…</p>}
      {error && <p role="alert" style={{ color: '#ff6b7a' }}>{error}</p>}
      {!loading && !error && data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: 12 }}>
            <div style={cardStyle}><b style={{ color: '#3cc8a1', fontSize: 22 }}>{data.totalSessions}</b><div style={{ color: '#a1a1aa', fontSize: 11 }}>всего сессий</div></div>
            <div style={cardStyle}><b style={{ color: '#3cc8a1', fontSize: 22 }}>{data.completedSessions || 0}</b><div style={{ color: '#a1a1aa', fontSize: 11 }}>завершили</div></div>
            <div style={cardStyle}><b style={{ color: '#e8e8f0', fontSize: 22 }}>{data.stoppedSessions}</b><div style={{ color: '#a1a1aa', fontSize: 11 }}>остановились</div></div>
            <div style={cardStyle}><b style={{ color: '#f5a623', fontSize: 22 }}>{data.activeSessions}</b><div style={{ color: '#a1a1aa', fontSize: 11 }}>ещё активны</div></div>
          </div>

          {data.totalSessions === 0 ? <p style={{ color: '#a1a1aa' }}>За выбранный период данных пока нет.</p> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {data.steps.map((step, index) => (
                <div key={step.eventName} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ color: '#e8e8f0', fontWeight: 700 }}>{index + 1}. {step.label}</span>
                    <span style={{ color: '#3cc8a1', fontWeight: 700 }}>{step.count}</span>
                  </div>
                  <div style={{ color: '#a1a1aa', fontSize: 11, marginTop: 5 }}>Конверсия с прошлого шага: {step.conversion}%{step.drop ? ` · потеряно ${step.drop}` : ''}</div>
                </div>
              ))}
            </div>
          )}

          {data.biggestDrop?.drop > 0 && <p style={{ color: '#f5a623' }}>Максимальный отвал: перед шагом «{data.biggestDrop.label}» — {data.biggestDrop.drop} сессий.</p>}
          {data.directEntries > 0 && <p style={{ color: '#a1a1aa' }}>Ещё {data.directEntries} сессий попали сразу на поздний шаг и не включены в расчёт конверсии.</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10, marginTop: 12 }}>
            <div style={cardStyle}><b style={{ color: '#e8e8f0' }}>Где остановились</b>{data.exitPages.length ? data.exitPages.map(item => <div key={item.name} style={{ color: '#a1a1aa', marginTop: 7 }}>{item.name} — {item.count}</div>) : <div style={{ color: '#a1a1aa', marginTop: 7 }}>Нет данных</div>}</div>
            <div style={cardStyle}><b style={{ color: '#e8e8f0' }}>Популярные переходы</b>{data.transitions.length ? data.transitions.map(item => <div key={item.name} style={{ color: '#a1a1aa', marginTop: 7 }}>{item.name} — {item.count}</div>) : <div style={{ color: '#a1a1aa', marginTop: 7 }}>Нет данных</div>}</div>
          </div>
        </>
      )}
    </section>
  );
}
