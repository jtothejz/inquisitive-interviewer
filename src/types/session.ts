import { InterviewConfig, TranscriptTurn, JuicyNugget, SynthesizedDraft, InterviewBriefingBook } from './persona';

export interface SavedInterviewSession {
  id: string;
  title: string;
  topic: string;
  createdAt: number;
  config: InterviewConfig;
  turns: TranscriptTurn[];
  nuggets: JuicyNugget[];
  drafts: SynthesizedDraft[];
  briefingBook?: InterviewBriefingBook;
}

const STORAGE_KEY = 'inquisitive_interview_history';
let memoryStorage: Record<string, string> = {};

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, value: string) => {
      memoryStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
  };
};

export const SessionStorage = {
  getAll(): SavedInterviewSession[] {
    try {
      const storage = getStorage();
      const data = storage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save(session: SavedInterviewSession): void {
    try {
      const existing = this.getAll();
      const filtered = existing.filter((s) => s.id !== session.id);
      const storage = getStorage();
      storage.setItem(STORAGE_KEY, JSON.stringify([session, ...filtered]));
    } catch (e) {
      console.warn('Failed to persist interview session:', e);
    }
  },

  delete(id: string): void {
    try {
      const existing = this.getAll();
      const filtered = existing.filter((s) => s.id !== id);
      const storage = getStorage();
      storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete session:', e);
    }
  },
};
