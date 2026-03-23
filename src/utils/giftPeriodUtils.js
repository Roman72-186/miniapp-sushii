/**
 * Утилита для проверки периода доступности подарков
 */

/**
 * Проверяет, активен ли период для подарков
 * @returns {Promise<boolean>} true если период активен, false если нет
 */
export async function isGiftPeriodActive() {
  try {
    // Получаем информацию о текущем периоде из API
    const response = await fetch('/api/gift-period', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Проверяем, активен ли период
    return data.active === true;
  } catch (error) {
    console.error('Ошибка при проверке периода подарков:', error);
    // По умолчанию считаем, что период не активен в случае ошибки
    return false;
  }
}

/**
 * Получает информацию о текущем периоде
 * @returns {Promise<Object>} информация о периоде
 */
export async function getGiftPeriodInfo() {
  try {
    const response = await fetch('/api/gift-period', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении информации о периоде:', error);
    return null;
  }
}