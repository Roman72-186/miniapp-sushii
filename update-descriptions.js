const fs = require('fs');
const path = require('path');

// Читаем файлы
const opisaniePath = path.join(__dirname, 'src', 'Описание.json');
const dataPath = path.join(__dirname, 'src', 'data.js');

// Читаем JSON и заменяем NaN на null перед парсингом
let opisanieContent = fs.readFileSync(opisaniePath, 'utf8');
opisanieContent = opisanieContent.replace(/:\s*NaN\s*([,}])/g, ': null$1');
const opisanieData = JSON.parse(opisanieContent);
const dataContent = fs.readFileSync(dataPath, 'utf8');

// Создаем словарь из Описание.json
const opisanieMap = new Map();
opisanieData.forEach(item => {
  const name = item['Unnamed: 1'];
  const sostav = item['Состав'];
  
  // Пропускаем заголовки и пустые значения
  if (name && name !== 'Наименование' && sostav && sostav !== 'Состав' && sostav !== null && sostav !== 'NaN') {
    // Нормализуем название для поиска (убираем лишние пробелы, приводим к нижнему регистру)
    const normalizedName = name.trim().toLowerCase();
    opisanieMap.set(normalizedName, sostav);
  }
});

// Функция для нормализации названия из data.js
function normalizeName(name) {
  return name
    .replace(/\s*\*\*\s*$/, '') // Убираем "**" в конце
    .trim()
    .toLowerCase();
}

// Обновляем описания в data.js
let updatedContent = dataContent;
let matchCount = 0;
let notFoundCount = 0;

// Функция для экранирования строки для JSON
function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Находим все товары и обновляем их описания
// Более гибкое регулярное выражение для разных форматов
const productRegex = /"name":\s*"([^"]+)",\s*\n\s*"description":\s*"([^"]*)"/g;
let match;
const matches = [];

// Собираем все совпадения
while ((match = productRegex.exec(dataContent)) !== null) {
  matches.push({
    fullMatch: match[0],
    productName: match[1],
    currentDescription: match[2],
    index: match.index
  });
}

// Обрабатываем совпадения в обратном порядке, чтобы индексы не сбились
matches.reverse().forEach(({ fullMatch, productName, currentDescription }) => {
  const normalizedProductName = normalizeName(productName);
  const sostav = opisanieMap.get(normalizedProductName);
  
  if (sostav) {
    // Заменяем пустое описание на состав
    const newDescription = escapeString(sostav.trim());
    const replacement = `"name": "${productName}",\n      "description": "${newDescription}"`;
    updatedContent = updatedContent.replace(fullMatch, replacement);
    matchCount++;
    console.log(`✓ Найдено: "${productName}" -> "${sostav.trim().substring(0, 50)}..."`);
  } else {
    notFoundCount++;
    console.log(`✗ Не найдено: "${productName}"`);
  }
});

// Сохраняем обновленный файл
fs.writeFileSync(dataPath, updatedContent, 'utf8');

console.log(`\nГотово!`);
console.log(`Обновлено: ${matchCount} товаров`);
console.log(`Не найдено: ${notFoundCount} товаров`);

