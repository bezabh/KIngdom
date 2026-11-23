import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { BrandingThemeProvider } from './context/BrandingThemeContext.tsx';
import { NetworkProvider } from './context/NetworkContext.tsx';
import { AuthUserProvider } from './context/AuthUserContext.tsx';
import { SubscriptionProvider } from './context/SubscriptionContext.tsx';
import { SavedInsightsProvider } from './context/SavedInsightsContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { AppNavigationProvider } from './context/AppNavigationContext.tsx';
import { VoiceCommandProvider } from './context/VoiceCommandContext.tsx';

// Initialize typography preference (Standard Modern vs. Historical Calligraphic Ge'ez)
try {
  const savedFont = localStorage.getItem('axumite_font_theme');
  if (savedFont === 'calligraphic') {
    document.documentElement.classList.add('font-theme-calligraphic');
    document.documentElement.classList.remove('font-theme-modern');
  } else {
    document.documentElement.classList.add('font-theme-modern');
    document.documentElement.classList.remove('font-theme-calligraphic');
  }
} catch (e) {
  console.warn('Font theme initialization:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <BrandingThemeProvider>
        <NetworkProvider>
          <AuthUserProvider>
            <SubscriptionProvider>
              <SavedInsightsProvider>
                <NotificationProvider>
                  <AppNavigationProvider>
                    <VoiceCommandProvider>
                      <App />
                    </VoiceCommandProvider>
                  </AppNavigationProvider>
                </NotificationProvider>
              </SavedInsightsProvider>
            </SubscriptionProvider>
          </AuthUserProvider>
        </NetworkProvider>
      </BrandingThemeProvider>
    </LanguageProvider>
  </StrictMode>
);

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration skipped or failed:', err);
    });
  });
}
