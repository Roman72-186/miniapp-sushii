const { getCurrentWindow, formatDDMMYYYY, todayUTC } = require('./gift-windows');
const { readGiftWindows, writeGiftWindows } = require('./blob-store');

async function claimCurrentGiftWindow(telegramId, options = {}) {
  const claimedBy = options.claimedBy || null;
  const stored = await readGiftWindows(telegramId);

  if (!stored || !stored.windows || stored.windows.length === 0) {
    return { ok: false, reason: 'not_found' };
  }

  const current = getCurrentWindow(stored.windows);
  if (!current) {
    return { ok: false, reason: 'no_active_window' };
  }

  if (current.status === 'claimed') {
    const nextWindow = stored.windows.find(w => w.num === current.num + 1);
    return {
      ok: false,
      reason: 'already_claimed',
      claimedWindow: current.num,
      nextWindowDate: nextWindow ? nextWindow.start : null,
    };
  }

  current.status = 'claimed';
  current.claimedAt = formatDDMMYYYY(todayUTC());
  if (claimedBy) current.claimedBy = claimedBy;
  stored.updatedAt = new Date().toISOString();

  await writeGiftWindows(telegramId, stored);

  const nextWindow = stored.windows.find(w => w.num === current.num + 1);
  return {
    ok: true,
    claimedWindow: current.num,
    nextWindowDate: nextWindow ? nextWindow.start : null,
  };
}

module.exports = { claimCurrentGiftWindow };
