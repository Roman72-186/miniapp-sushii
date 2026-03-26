/**
 * Скрипт для создания резервной копии базы данных SQLite
 * 
 * Использование:
 *   node scripts/backup-db.js
 * 
 * Копия создаётся в директории data/backups/ с датой и временем
 * Удаляется только вручную
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'sushii.db');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

// Форматирование даты для имени файла
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Основная функция
function createBackup() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ БАЗЫ ДАННЫХ                ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  
  // Проверка существования базы данных
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Ошибка: База данных не найдена:', DB_PATH);
    process.exit(1);
  }
  
  // Создание директории для бэкапов
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 Создана директория для бэкапов:', BACKUP_DIR);
  }
  
  // Формирование имени файла
  const timestamp = formatDate(new Date());
  const backupFileName = `sushii.backup.${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  // Копирование файла
  try {
    fs.copyFileSync(DB_PATH, backupPath);
    
    // Получение размера файла
    const stats = fs.statSync(backupPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log('✅ Резервная копия успешно создана!');
    console.log('');
    console.log('📦 Информация о копии:');
    console.log('   Файл:', backupFileName);
    console.log('   Путь:', backupPath);
    console.log('   Размер:', sizeKB, 'KB');
    console.log('   Дата:', timestamp.replace('_', ' '));
    console.log('');
    console.log('⚠️  Важно: Копия хранится до ручного удаления!');
    console.log('');
    console.log('📋 Список всех копий:');
    
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('sushii.backup.') && f.endsWith('.db'))
      .sort()
      .reverse();
    
    if (backups.length === 0) {
      console.log('   (нет копий)');
    } else {
      backups.forEach((f, i) => {
        const filePath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ${i + 1}. ${f} (${sizeKB} KB)`);
      });
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Ошибка при создании копии:', error.message);
    process.exit(1);
  }
}

// Запуск
createBackup();
