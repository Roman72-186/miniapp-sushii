// src/LoginPage.js — Вход в веб-версию по номеру телефона

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './shop.css';

function normalizePhone(raw) {
  const nums = String(raw || '').replace(/\D/g, '');
  if (nums.length === 11 && nums.startsWith('8')) return '7' + nums.slice(1);
  if (nums.length === 11 && nums.startsWith('7')) return nums;
  if (nums.length === 10) return '7' + nums;
  return nums;
}

function LoginPage() {
  useEffect(() => {
    document.body.classList.add('shop-body');
    return () => document.body.classList.remove('shop-body');
  }, []);

  const { loginByPhone } = useUser();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'name'
  const [foundUser, setFoundUser] = useState(null); // данные после первой проверки

  const handleCheckPhone = async (e) => {
    e.preventDefault();
    setError('');

    const normalized = normalizePhone(phone);
    if (!/^7\d{10}$/.test(normalized)) {
      setError('Введите корректный российский номер телефона');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setError(data.error || 'Ошибка входа');
        return;
      }

      if (data.isExistingUser) {
        // Пользователь найден — сразу входим
        setFoundUser(data);
        await loginByPhone(normalized);
      } else {
        // Новый пользователь — запрашиваем имя
        setFoundUser({ ...data, phone: normalized });
        setStep('name');
      }
    } catch {
      setError('Ошибка соединения. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Введите ваше имя');
      return;
    }

    setLoading(true);
    try {
      await loginByPhone(foundUser.phone, name.trim());
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shop-page">
      <div className="shop-payment" style={{ paddingTop: 40 }}>

        {/* Логотип */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo.jpg"
            alt="Суши-Хаус 39"
            style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: '#fff' }}>
            Суши-Хаус 39
          </div>
          <div style={{ marginTop: 4, fontSize: 14, color: '#9fb0c3' }}>
            {step === 'phone' ? 'Введите номер телефона для входа' : 'Как вас зовут?'}
          </div>
        </div>

        {step === 'phone' && (
          <form onSubmit={handleCheckPhone}>
            <div className="shop-payment__card" style={{ padding: '20px 16px' }}>
              <div className="shop-form-field" style={{ marginBottom: 0 }}>
                <label className="shop-form-field__label">Номер телефона</label>
                <input
                  className="shop-form-field__input"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="shop-payment__error" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="shop-payment__btn"
              style={{ marginTop: 16 }}
              disabled={loading || !phone.trim()}
            >
              {loading ? 'Проверяем...' : 'Продолжить'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9fb0c3', lineHeight: 1.5 }}>
              Если вы оформляли подписку через Telegram — введите тот же номер телефона.
              Ваши данные будут найдены автоматически.
            </div>
          </form>
        )}

        {step === 'name' && (
          <form onSubmit={handleRegister}>
            <div className="shop-payment__card" style={{ padding: '20px 16px' }}>
              <div style={{ marginBottom: 12, color: '#9fb0c3', fontSize: 14 }}>
                Телефон: <span style={{ color: '#fff' }}>+{foundUser?.phone}</span>
              </div>
              <div className="shop-form-field" style={{ marginBottom: 0 }}>
                <label className="shop-form-field__label">Ваше имя</label>
                <input
                  className="shop-form-field__input"
                  type="text"
                  placeholder="Имя"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="shop-payment__error" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="shop-payment__btn"
              style={{ marginTop: 16 }}
              disabled={loading || !name.trim()}
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>

            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#9fb0c3',
                fontSize: 14,
                cursor: 'pointer',
                display: 'block',
                margin: '12px auto 0',
              }}
              onClick={() => { setStep('phone'); setError(''); }}
            >
              ← Изменить номер
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
