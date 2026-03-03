// api/export-contacts.js — Экспорт всех контактов со всеми переменными
// Vercel Serverless Function (CommonJS)

const { fetchAllContacts } = require('./_lib/watbot');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiToken = process.env.WATBOT_API_TOKEN;
  if (!apiToken) return res.status(500).json({ error: 'Ошибка конфигурации сервера' });

  try {
    const contacts = await fetchAllContacts(apiToken);

    // Собираем все уникальные имена переменных
    const varNamesSet = new Set();
    for (const c of contacts) {
      if (Array.isArray(c.variables)) {
        for (const v of c.variables) {
          if (v.name) varNamesSet.add(v.name);
        }
      }
    }
    const varNames = [...varNamesSet].sort();

    // Формируем таблицу
    const rows = contacts.map(c => {
      const variables = {};
      if (Array.isArray(c.variables)) {
        for (const v of c.variables) {
          if (v.name) variables[v.name] = v.value != null ? String(v.value) : '';
        }
      }

      const row = {
        id: c.id || '',
        name: c.name || '',
        telegram_id: c.telegram_id || '',
        phone: c.phone || '',
      };

      for (const vn of varNames) {
        row[vn] = variables[vn] || '';
      }

      return row;
    });

    const format = req.query.format || 'json';

    if (format === 'csv') {
      // CSV с BOM для корректного отображения кириллицы в Excel
      const columns = ['id', 'name', 'telegram_id', 'phone', ...varNames];
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
      variable_names: varNames,
      contacts: rows,
    });
  } catch (error) {
    console.error('export-contacts error:', error.message);
    return res.status(500).json({ error: 'Ошибка загрузки контактов' });
  }
};
