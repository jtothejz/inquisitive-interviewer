import React, { useState } from 'react';
import { X, Key, ShieldCheck, Cpu, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  liveModel: string;
  onSaveLiveModel: (model: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  liveModel,
  onSaveLiveModel,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [selectedModel, setSelectedModel] = useState(liveModel || 'models/gemini-2.0-flash-exp');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(inputKey.trim());
    onSaveLiveModel(selectedModel.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-200 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Studio & API Settings</h2>
            <p className="text-xs text-slate-400">Google Gemini Live Multimodal Engine</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">Gemini API Key</label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-orange-400 hover:underline flex items-center gap-1"
              >
                Get a free key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-orange-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Stored locally in your browser session and connects directly over secure WebSockets.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Live WebSocket Model Name</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
            >
              <option value="models/gemini-2.0-flash-exp">models/gemini-2.0-flash-exp (Gemini Multimodal Live Voice)</option>
              <option value="models/gemini-2.0-flash-realtime-exp">models/gemini-2.0-flash-realtime-exp (Gemini Realtime Live Audio)</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-100/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Cost & Architecture Breakdown
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>Real-time Voice:</strong> Powered by Gemini Multimodal Live over native WebSockets with 16kHz PCM audio streaming.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>Lowest Cost:</strong> Gemini runs at fractions of a cent per audio minute (and is within the generous free tier limits on Google AI Studio).
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>Deploy Anywhere:</strong> Zero backend servers required. Ready for Cloudflare Pages edge deployment.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-100 text-slate-300 font-semibold hover:bg-surface-50 transition"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-slate-950 shadow-lg transition active:scale-95"
            >
              {saved ? (
                <>
                  <ShieldCheck className="w-4 h-4" /> Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
