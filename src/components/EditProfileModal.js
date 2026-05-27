// src/components/EditProfileModal.js — Модалка редактирования профиля
// Используется и пользователем (mode="user"), и админкой (mode="admin")

import React, { useState, useEffect } from 'react';
import { normalizePhone } from '../utils/phone';
import { WEB_TOKEN_KEY } from '../utils/webAuth';
import { getFallbackFace } from '../utils/avatar';

const ADMIN_TOKEN_KEY = 'admin_token';

function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts[1] || '',
    middle_name: parts.slice(2).join(' ') || '',
  };
}

function formatPhoneInput(digits) {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  const n = d.startsWith('8') ? '7' + d.slice(1) : d;
  if (n.length <= 1) return `+${n}`;
  if (n.length <= 4) return `+${n.slice(0, 1)} (${n.slice(1)}`;
  if (n.length <= 7) return `+${n.slice(0, 1)} (${n.slice(1, 4)}) ${n.slice(4)}`;
  if (n.length <= 9) return `+${n.slice(0, 1)} (${n.slice(1, 4)}) ${n.slice(4, 7)}-${n.slice(7)}`;
  return `+${n.slice(0, 1)} (${n.slice(1, 4)}) ${n.slice(4, 7)}-${n.slice(7, 9)}-${n.slice(9, 11)}`;
}

function EditProfileModal({ mode = 'user', currentUser, onClose, onSaved, requireEmail = false }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarData, setAvatarData] = useState(null);
  const [avatarReset, setAvatarReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    // Приоритет: раздельные поля из БД → split(name) для legacy
    if (currentUser.first_name || currentUser.last_name || currentUser.middle_name) {
      setFirstName(currentUser.first_name || '');
      setLastName(currentUser.last_name || '');
      setMiddleName(currentUser.middle_name || '');
    } else {
      const parts = splitFullName(currentUser.name);
      setFirstName(parts.first_name);
      setLastName(parts.last_name);
      setMiddleName(parts.middle_name);
    }
    setPhone(currentUser.phone ? formatPhoneInput(currentUser.phone) : '');
    setEmail(currentUser.email || '');
    setAvatarPreview(currentUser.avatar_url || '');
    setAvatarData(null);
    setAvatarReset(false);
  }, [currentUser]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      setError('Загрузите изображение PNG, JPG или WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер аватара должен быть до 5 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setAvatarPreview(dataUrl);
      setAvatarData(dataUrl);
      setAvatarReset(false);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatarIfNeeded = async () => {
    if (mode !== 'user' || (!avatarData && !avatarReset)) return undefined;

    const token = localStorage.getItem(WEB_TOKEN_KEY) || '';
    const res = await fetch('/api/upload-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(avatarReset ? { reset: true } : { imageData: avatarData }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Не удалось сохранить аватар');
    }
    return data.avatar_url || null;
  };

  const handleSave = async () => {
    setError(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const mn = middleName.trim();
    const em = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    if (!fn) { setError('Укажите имя'); return; }
    if (!ln) { setError('Укажите фамилию'); return; }
    if (!/^7\d{10}$/.test(normalizedPhone)) {
      setError('Телефон в формате +7 (XXX) XXX-XX-XX');
      return;
    }
    if (requireEmail && !em) {
      setError('Укажите email — чтобы получать уведомления о подписке и подарках');
      return;
    }
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Некорректный email');
      return;
    }

    setSaving(true);

    try {
      let url, headers, method, body;

      if (mode === 'admin') {
        const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
        url = '/api/admin/update-user';
        method = 'POST';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        };
        body = JSON.stringify({
          telegram_id: currentUser.telegram_id,
          first_name: fn,
          last_name: ln,
          middle_name: mn,
          phone: normalizedPhone,
          email: em || null,
        });
      } else {
        const token = localStorage.getItem(WEB_TOKEN_KEY) || '';
        url = '/api/update-profile';
        method = 'PUT';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        body = JSON.stringify({
          first_name: fn,
          last_name: ln,
          middle_name: mn,
          phone: normalizedPhone,
          email: em || null,
        });
      }

      const res = await fetch(url, { method, headers, body });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка сохранения');
      }

      const uploadedAvatarUrl = await uploadAvatarIfNeeded();
      if (onSaved) await onSaved({
        ...data.user,
        avatar_url: uploadedAvatarUrl !== undefined ? uploadedAvatarUrl : data.user?.avatar_url,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-profile-modal__overlay" onClick={onClose}>
      <div className="edit-profile-modal__content" onClick={e => e.stopPropagation()}>
        <div className="edit-profile-modal__header">
          <h3 className="edit-profile-modal__title">
            {mode === 'admin' ? 'Редактировать пользователя' : 'Редактировать профиль'}
          </h3>
          <button type="button" className="edit-profile-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="edit-profile-modal__body">
          <div className="edit-profile-modal__avatar">
            <div className="edit-profile-modal__avatar-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" />
              ) : (
                <span>{getFallbackFace(currentUser?.telegram_id || currentUser?.name)}</span>
              )}
            </div>
            {mode === 'user' && (
              <div className="edit-profile-modal__avatar-actions">
                <label className="edit-profile-modal__avatar-btn">
                  Загрузить фото
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    disabled={saving}
                  />
                </label>
                {(avatarPreview || currentUser?.avatar_url) && (
                  <button
                    type="button"
                    className="edit-profile-modal__avatar-reset"
                    onClick={() => {
                      setAvatarPreview('');
                      setAvatarData(null);
                      setAvatarReset(true);
                    }}
                    disabled={saving}
                  >
                    Сбросить
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="edit-profile-modal__field">
            <label>Имя</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Иван"
              disabled={saving}
            />
          </div>

          <div className="edit-profile-modal__field">
            <label>Фамилия</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Иванов"
              disabled={saving}
            />
          </div>

          <div className="edit-profile-modal__field">
            <label>Отчество (необязательно)</label>
            <input
              type="text"
              value={middleName}
              onChange={e => setMiddleName(e.target.value)}
              placeholder="Петрович"
              disabled={saving}
            />
          </div>

          <div className="edit-profile-modal__field">
            <label>Телефон</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhoneInput(e.target.value))}
              placeholder="+7 (___) ___-__-__"
              disabled={saving}
            />
          </div>

          <div className="edit-profile-modal__field">
            <label>Email{requireEmail ? '' : ' (необязательно)'}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@mail.ru"
              disabled={saving}
            />
            {requireEmail && (
              <div style={{ fontSize: '12px', color: '#9fb0c3', marginTop: '6px' }}>
                Нужен для уведомлений о подписке, подарках и важных обновлениях.
              </div>
            )}
          </div>

          {error && <div className="edit-profile-modal__error">{error}</div>}
        </div>

        <div className="edit-profile-modal__actions">
          <button
            type="button"
            className="edit-profile-modal__btn edit-profile-modal__btn--cancel"
            onClick={onClose}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            type="button"
            className="edit-profile-modal__btn edit-profile-modal__btn--save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfileModal;
