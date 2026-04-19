const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../_lib/auth');

const PURPOSE = 'set_password_otp';
const EXPIRES_IN = '10m';

function createOtpProof({ phone, email }) {
  return jwt.sign(
    {
      purpose: PURPOSE,
      phone: String(phone),
      email: email ? String(email).trim().toLowerCase() : null,
    },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

function verifyOtpProof(token, phone) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.purpose !== PURPOSE) {
      return { ok: false, reason: 'invalid' };
    }
    if (String(payload.phone) !== String(phone)) {
      return { ok: false, reason: 'phone_mismatch' };
    }
    return { ok: true, email: payload.email || null };
  } catch {
    return { ok: false, reason: 'expired' };
  }
}

module.exports = { createOtpProof, verifyOtpProof };
