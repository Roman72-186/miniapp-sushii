import React, { useState, useEffect } from 'react';
import { useUser } from '../UserContext';

const DISMISSED_KEY = 'web_reg_dismissed';

function WebRegistrationPrompt() {
  const { profile, loading } = useUser();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!profile?.needsWebRegistration) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, [loading, profile?.needsWebRegistration]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const handleRegister = () => {
    window.location.href = '/login';
  };

  if (!visible) return null;

  return (
    <div className="web-reg-overlay" onClick={handleDismiss}>
      <div className="web-reg-modal" onClick={e => e.stopPropagation()}>
        <div className="web-reg-icon">🔐</div>
        <h3 className="web-reg-title">Обновите способ входа</h3>
        <p className="web-reg-text">
          Теперь для входа в приложение нужны почта и пароль.
          Это займёт 1 минуту — мы пришлём код на вашу почту.
        </p>
        <button className="web-reg-btn" onClick={handleRegister}>
          Зарегистрироваться
        </button>
        <button className="web-reg-later" onClick={handleDismiss}>
          Позже
        </button>
      </div>
    </div>
  );
}

export default WebRegistrationPrompt;
