import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_WIDTHS = [240, 320, 480, 640];
const OPTIMIZABLE_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif)$/i;

function canOptimize(src) {
  return Boolean(src)
    && typeof src === 'string'
    && !src.startsWith('data:')
    && !/^(https?:)?\/\//i.test(src)
    && OPTIMIZABLE_EXTENSIONS.test(src.split('?')[0].split('#')[0]);
}

function optimizedUrl(src, width, quality = 78) {
  const params = new URLSearchParams({
    src,
    w: String(width),
    q: String(quality),
    format: 'auto',
  });

  return `/api/image?${params.toString()}`;
}

function normalizeWidths(widths) {
  return [...new Set(widths.map(Number).filter(Boolean))].sort((a, b) => a - b);
}

function OptimizedImage({
  src,
  fallbackSrc = '/logo.jpg',
  widths = DEFAULT_WIDTHS,
  width = 480,
  quality = 78,
  sizes = '(max-width: 640px) 50vw, 240px',
  alt,
  onError,
  ...props
}) {
  const [failed, setFailed] = useState(false);
  const imageSrc = failed ? fallbackSrc : src;
  const useOptimizer = canOptimize(imageSrc);
  const imageWidths = useMemo(() => normalizeWidths(widths), [widths]);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const handleError = event => {
    if (!failed && fallbackSrc && imageSrc !== fallbackSrc) {
      setFailed(true);
      return;
    }
    if (onError) onError(event);
  };

  return (
    <img
      {...props}
      src={useOptimizer ? optimizedUrl(imageSrc, width, quality) : imageSrc}
      srcSet={useOptimizer ? imageWidths.map(item => `${optimizedUrl(imageSrc, item, quality)} ${item}w`).join(', ') : undefined}
      sizes={useOptimizer ? sizes : undefined}
      alt={alt}
      decoding="async"
      onError={handleError}
    />
  );
}

export default OptimizedImage;
