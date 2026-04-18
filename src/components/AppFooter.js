import React from 'react';
import { APP_VERSION } from '../version';

export default function AppFooter() {
  return (
    <footer className="footer">
      <p className="footer-version">v{APP_VERSION}</p>
    </footer>
  );
}
