import React, { Suspense, useEffect } from 'react';
import { LazyChunkErrorBoundary, lazyWithRetry } from './LazyChunkBoundary';
import { useAppActions, useModalState } from '../context/AppNavigationContext';
import { useAuthUser } from '../context/AuthUserContext';
import { useVoiceCommandActions, useVoiceCommandFeedback } from '../context/VoiceCommandContext';

const VoiceCommandOverlay = lazyWithRetry(() =>
  import('./VoiceCommandOverlay').then((m) => ({ default: m.VoiceCommandOverlay }))
);
const AlwaysListeningFloatingIndicator = lazyWithRetry(() =>
  import('./AlwaysListeningFloatingIndicator').then((m) => ({
    default: m.AlwaysListeningFloatingIndicator,
  }))
);

/**
 * Isolated voice UI host: handles global keyboard shortcut ('v' / Cmd+K),
 * lazy VoiceCommandOverlay, and lazy AlwaysListeningFloatingIndicator without re-rendering App.
 */
export const AppVoiceCommandHost: React.FC = React.memo(() => {
  const modals = useModalState();
  const actions = useAppActions();
  const { user, updateUser } = useAuthUser();
  const { isAlwaysListening, lastHeardPhrase, lastActionFeedback } = useVoiceCommandFeedback();
  const { toggleAlwaysListening, clearFeedback } = useVoiceCommandActions();

  // Global Keyboard Shortcut for Voice Commands (Press 'v' when not typing, or Ctrl/Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (!isInput && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        actions.toggleModal('voiceOverlay');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        actions.openModal('voiceOverlay');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const shouldRenderFloatingIndicator = isAlwaysListening || Boolean(lastActionFeedback);

  return (
    <>
      {modals.voiceOverlay && (
        <LazyChunkErrorBoundary compact resetKey="voice-overlay">
          <Suspense fallback={null}>
            <VoiceCommandOverlay
              isOpen={modals.voiceOverlay}
              onClose={() => actions.closeModal('voiceOverlay')}
              onNavigateTab={(tab) => {
                actions.navigateTab(tab);
                actions.closeModal('voiceOverlay');
              }}
              onOpenSettings={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('userProfile');
              }}
              onOpenHistory={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('history');
              }}
              onOpenNotifications={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('notificationCenter');
              }}
              onOpenSecurity={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('security');
              }}
              onOpenPricing={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('premium');
              }}
              onOpenJobSearch={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('jobSearch');
              }}
              onOpenScholarship={() => {
                actions.closeModal('voiceOverlay');
                actions.openScholarship();
              }}
              onOpenLegalAdvisor={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('legalAdvisor');
              }}
              onOpenMechanic={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('mechanic');
              }}
              onOpenVideoTranslator={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('videoTranslator');
              }}
              onOpenDrawer={() => {
                actions.closeModal('voiceOverlay');
                actions.openModal('drawer');
              }}
              onSendChatMessage={(prompt) => {
                actions.closeModal('voiceOverlay');
                actions.selectPromptForChat(prompt);
              }}
              isAlwaysListening={isAlwaysListening}
              onToggleAlwaysListening={() => toggleAlwaysListening()}
              user={user}
              onUpdateUser={updateUser}
            />
          </Suspense>
        </LazyChunkErrorBoundary>
      )}

      {shouldRenderFloatingIndicator && (
        <Suspense fallback={null}>
          <AlwaysListeningFloatingIndicator
            isActive={isAlwaysListening}
            onToggle={() => toggleAlwaysListening()}
            onOpenOverlay={() => actions.openModal('voiceOverlay')}
            lastPhrase={lastHeardPhrase}
            lastFeedback={lastActionFeedback}
            onClearFeedback={clearFeedback}
          />
        </Suspense>
      )}
    </>
  );
});
