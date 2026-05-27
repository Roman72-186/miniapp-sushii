const FACE_EMOJIS = [
  '😀', '😄', '😊', '🙂', '😎', '🤗', '😋', '🤩',
  '😌', '😉', '😇', '🥳', '😃', '😁', '😆', '🙃',
];

export function getFallbackFace(seed) {
  const value = String(seed || 'guest');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return FACE_EMOJIS[Math.abs(hash) % FACE_EMOJIS.length];
}

export function getRatingLabel(rating) {
  const rank = Number(rating?.rank);
  if (!rank) return null;
  return `#${rank}`;
}
