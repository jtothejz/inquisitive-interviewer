import React from 'react';
import { SavedInterviewSession } from '../types/session';
import { History, X, Trash2, ArrowRight, BookOpen, Sparkles } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SavedInterviewSession[];
  onSelectSession: (session: SavedInterviewSession) => void;
  onDeleteSession: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onDeleteSession,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-surface-200 border border-slate-800 rounded-3xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">Past Interview Sessions</h2>
            <p className="text-xs text-slate-400">Revisit past interviews, transcripts, and synthesized story drafts</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {sessions.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
              <BookOpen className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
              <p className="text-xs font-semibold text-slate-400">No saved sessions yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Completed interview sessions and their extracted stories will appear here.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-2xl bg-surface-100/80 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                      {session.config.mode === 'panel' ? 'Multi-Panel' : '1-on-1'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(session.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                    {session.topic}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {session.turns.length} dialogue turns • {session.nuggets.length} nuggets • {session.drafts.length} drafts
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDeleteSession(session.id)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800 transition"
                    title="Delete Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onSelectSession(session);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-xs text-slate-950 transition active:scale-95 shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Open Studio
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
