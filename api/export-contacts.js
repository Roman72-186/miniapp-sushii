// api/export-contacts.js — Экспорт всех пользователей из SQLite

const { getAllUsers } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const users = await getAllUsers();

    const rows = users.map(u => ({
      telegram_id: u.telegram_id || '',
      name: u.name || '',
      phone: u.phone || '',
      tariff: u.tariff || '',
      is_ambassador: u.is_ambassador ? 'Да' : '',
      subscription_status: u.subscription_status || '',
      subscription_start: u.subscription_start || '',
      subscription_end: u.subscription_end || '',
      balance_shc: u.balance_shc != null ? String(u.balance_shc) : '',
      ref_url: u.ref_url || '',
      invited_by: u.invited_by || '',
      created_at: u.created_at || '',
      updated_at: u.updated_at || '',
    }));

    const format = req.query.format || 'json';

    if (format === 'csv') {
      const columns = ['telegram_id', 'name', 'phone', 'tariff', 'is_ambassador',
        'subscription_status', 'subscription_start', 'subscription_end',
        'balance_shc', 'ref_url', 'invited_by', 'created_at', 'updated_at'];

      const escapeCsv = (val) => {
        const s = String(val);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      const header = columns.map(escapeCsv).join(',');
      const lines = rows.map(row => columns.map(col => escapeCsv(row[col] || '')).join(','));
      const csv = '\uFEFF' + header + '\n' + lines.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
      return res.status(200).send(csv);
    }

    // JSON по умолчанию
    return res.status(200).json({
      total: rows.length,
      contacts: rows,
    });
  } catch (error) {
    console.error('export-contacts error:', error.message);
    return res.status(500).json({ error: 'Ошибка загрузки контактов' });
  }
};
