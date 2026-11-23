import React, { createContext, useContext, useMemo } from 'react';
import { useAlwaysListeningVoice } from '../hooks/useAlwaysListeningVoice';
import { useAppActions } from './AppNavigationContext';
import { useLanguage } from './LanguageContext';

export interface VoiceCommandFeedbackState {
  isAlwaysListening: boolean;
  lastHeardPhrase: string | null;
  lastActionFeedback: { title: string; desc: string } | null;
}

export interface VoiceCommandActionsType {
  toggleAlwaysListening: (targetState?: boolean) => void;
  clearFeedback: () => void;
}

const VoiceListeningActiveContext = createContext<boolean | undefined>(undefined);
const VoiceFeedbackContext = createContext<VoiceCommandFeedbackState | undefined>(undefined);
const VoiceActionsContext = createContext<VoiceCommandActionsType | undefined>(undefined);

export const VoiceCommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const actions = useAppActions();
  const { setLanguage } = useLanguage();

  const voiceActions = useMemo(
    () => ({
      navigateTab: actions.navigateTab,
      openSettings: () => actions.openModal('userProfile'),
      openSecurity: () => actions.openModal('security'),
      openJobSearch: () => actions.openModal('jobSearch'),
      openScholarship: () => actions.openScholarship(),
      openLegalAdvisor: () => actions.openModal('legalAdvisor'),
      openMechanic: () => actions.openModal('mechanic'),
      openHistory: () => actions.openModal('history'),
      openNotifications: () => actions.openModal('notificationCenter'),
      openPricing: () => actions.openModal('premium'),
      openDrawer: () => actions.openModal('drawer'),
      openVideoTranslator: () => actions.openModal('videoTranslator'),
      openVoiceOverlay: () => actions.openModal('voiceOverlay'),
      setLanguage: (lang: 'ti' | 'en') => setLanguage(lang),
      onSendChatMessage: actions.selectPromptForChat,
    }),
    [actions, setLanguage]
  );

  const {
    isAlwaysListening,
    toggleAlwaysListening,
    lastHeardPhrase,
    lastActionFeedback,
    clearFeedback,
  } = useAlwaysListeningVoice(voiceActions);

  const feedbackValue = useMemo<VoiceCommandFeedbackState>(
    () => ({ isAlwaysListening, lastHeardPhrase, lastActionFeedback }),
    [isAlwaysListening, lastHeardPhrase, lastActionFeedback]
  );

  const actionsValue = useMemo<VoiceCommandActionsType>(
    () => ({ toggleAlwaysListening, clearFeedback }),
    [toggleAlwaysListening, clearFeedback]
  );

  return (
    <VoiceActionsContext.Provider value={actionsValue}>
      <VoiceListeningActiveContext.Provider value={isAlwaysListening}>
        <VoiceFeedbackContext.Provider value={feedbackValue}>
          {children}
        </VoiceFeedbackContext.Provider>
      </VoiceListeningActiveContext.Provider>
    </VoiceActionsContext.Provider>
  );
};

export const useIsAlwaysListening = (): boolean => {
  const active = useContext(VoiceListeningActiveContext);
  if (active === undefined) {
    throw new Error('useIsAlwaysListening must be used within a VoiceCommandProvider');
  }
  return active;
};

export const useVoiceCommandFeedback = (): VoiceCommandFeedbackState => {
  const feedback = useContext(VoiceFeedbackContext);
  if (!feedback) {
    throw new Error('useVoiceCommandFeedback must be used within a VoiceCommandProvider');
  }
  return feedback;
};

export const useVoiceCommandActions = (): VoiceCommandActionsType => {
  const actions = useContext(VoiceActionsContext);
  if (!actions) {
    throw new Error('useVoiceCommandActions must be used within a VoiceCommandProvider');
  }
  return actions;
};
