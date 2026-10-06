import React, { useState } from 'react';
import { Persona, InterviewMode } from '../types/persona';
import { Zap, Skull, Users, HelpCircle, Send, Radio } from 'lucide-react';

interface SteeringDockProps {
  mode: InterviewMode;
  panelPersonas: Persona[];
  activeSpeakerId: string | 'user' | null;
  onSendDirective: (directive: string) => void;
  onSendTextAnswer: (text: string) => void;
}

export const SteeringDock: React.FC<SteeringDockProps> = ({
  mode,
  panelPersonas,
  activeSpeakerId: _activeSpeakerId,
  onSendDirective,
  onSendTextAnswer,
}) => {
  const [customText, setCustomText] = useState('');
  const [modeTab, setModeTab] = useState<'steer' | 'type'>('steer');

  const presetSteerings = [
    {
      label: 'Push Harder',
      icon: <Skull className="w-3.5 h-3.5 text-red-400" />,
      directive: 'Push significantly harder. Challenge my last claim and demand specific numbers or names.',
    },
    {
      label: 'Cut the PR Spin',
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      directive: 'Call me out on corporate buzzwords or PR spin. Force me to speak plainly about the messy reality.',
    },
    {
      label: 'Dig for Emotional Stakes',
      icon: <HelpCircle className="w-3.5 h-3.5 text-purple-400" />,
      directive: 'Dig into the personal, emotional stakes. Ask what this cost me or what I was privately afraid of.',
    },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    if (modeTab === 'steer') {
      onSendDirective(customText.trim());
    } else {
      onSendTextAnswer(customText.trim());
    }
    setCustomText('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel rounded-2xl p-3 shadow-2xl border border-slate-800">
      {/* Quick Action Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 pl-1">
          <Radio className="w-3 h-3 text-orange-400 animate-pulse" /> Live Steering:
        </span>

        {presetSteerings.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onSendDirective(preset.directive)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100/90 hover:bg-surface-50 border border-slate-700/60 hover:border-orange-500/40 text-xs text-slate-200 font-medium transition active:scale-95 shadow-sm"
          >
            {preset.icon}
            {preset.label}
          </button>
        ))}

        {/* In Panel Mode: Switch Interviewer Pills */}
        {mode === 'panel' && panelPersonas.length > 1 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-400" /> Pass mic to:
            </span>
            {panelPersonas.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  onSendDirective(
                    `Have ${p.display_name} jump into the conversation right now with their signature perspective and question.`
                  )
                }
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition border border-slate-700 hover:border-slate-500"
                style={{ backgroundColor: `${p.color}22`, color: p.color }}
              >
                {p.display_name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Form for custom steering or typed answer */}
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
        <div className="flex rounded-lg bg-surface-200 p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setModeTab('steer')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              modeTab === 'steer'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Steer
          </button>
          <button
            type="button"
            onClick={() => setModeTab('type')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              modeTab === 'type'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Type Answer
          </button>
        </div>

        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder={
            modeTab === 'steer'
              ? 'Send director note (e.g. "Ask about the 2AM panic moment")...'
              : 'Type your answer if you prefer typing over voice...'
          }
          className="flex-1 bg-surface-200/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500/60 transition"
        />

        <button
          type="submit"
          disabled={!customText.trim()}
          className="p-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-slate-950 font-bold transition shadow-md active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
