import { create } from 'zustand';
import type { ChatAttachment, ChatMessage } from '../types';
import { chat } from '../services/openrouter';
import { useTimelineStore } from './timeline';

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  error?: string;
  send: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  clear: () => void;
}

const welcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text:
    "Ciao 👋 Sono l'assistente di salute di uHmana. Come posso aiutarti oggi?\n\nPuoi scrivermi, inviarmi foto, video o referti.",
  createdAt: new Date().toISOString(),
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [welcome],
  sending: false,
  send: async (text, attachments = []) => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      attachments,
      createdAt: new Date().toISOString(),
    };
    set({
      messages: [...get().messages, userMsg],
      sending: true,
      error: undefined,
    });
    try {
      const context = useTimelineStore.getState().contextSummary();
      const reply = await chat({
        history: get().messages,
        extraContext: context,
      });
      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: reply,
        createdAt: new Date().toISOString(),
      };
      set({ messages: [...get().messages, botMsg], sending: false });
    } catch (e: any) {
      set({ sending: false, error: e?.message ?? 'Errore connessione AI' });
    }
  },
  clear: () => set({ messages: [welcome], sending: false, error: undefined }),
}));
