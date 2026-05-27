import React, { useState } from 'react';
import { getFallbackFace, getRatingLabel } from '../utils/avatar';

function UserAvatar({
  userId,
  name,
  avatarUrl,
  rating,
  size = 'md',
  className = '',
  href,
  onClick,
  title,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const label = getRatingLabel(rating);
  const classes = ['user-avatar', `user-avatar--${size}`, className].filter(Boolean).join(' ');
  const fallback = getFallbackFace(userId || name);
  const ariaLabel = title || name || 'Профиль';

  const content = (
    <>
      <span className="user-avatar__media" aria-hidden="true">
        {avatarUrl && !imageFailed ? (
          <img src={avatarUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <span className="user-avatar__emoji">{fallback}</span>
        )}
      </span>
      {label && <span className="user-avatar__rank">{label}</span>}
    </>
  );

  if (href) {
    return (
      <a className={classes} href={href} title={ariaLabel} aria-label={ariaLabel}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} title={ariaLabel} aria-label={ariaLabel}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes} title={ariaLabel} aria-label={ariaLabel}>
      {content}
    </div>
  );
}

export default UserAvatar;
