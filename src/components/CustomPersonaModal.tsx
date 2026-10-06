import React, { useState } from 'react';
import { Persona, VoiceName } from '../types/persona';
import { X, Sparkles, UserPlus } from 'lucide-react';

interface CustomPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePersona: (persona: Persona) => void;
}

export const CustomPersonaModal: React.FC<CustomPersonaModalProps> = ({
  isOpen,
  onClose,
  onSavePersona,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [color, setColor] = useState('#f97316');
  const [voiceName, setVoiceName] = useState<VoiceName>('Fenrir');
  const [relationalStance, setRelationalStance] = useState('');
  const [pushbackMechanic, setPushbackMechanic] = useState('');
  const [narrativeStance, setNarrativeStance] = useState('');
  const [formatTitle, setFormatTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    const newPersona: Persona = {
      id: `custom_${Date.now()}`,
      display_name: displayName.trim(),
      tagline: tagline.trim() || 'Custom Interviewer & Story Extraction Archetype',
      color: color,
      accent_border: 'border-orange-500/40 hover:border-orange-500',
      voice_name: voiceName,
      vocal_characteristics: 'Custom vocal and conversational cadence.',
      inquisitor_engine: {
        relational_stance: relationalStance.trim() || 'Direct, highly curious, and objective observer',
        ingestion_filter: 'Search for hidden trade-offs, unexpected origins, and core tensions.',
        hook_archetype: 'The Provocative Origin Hook',
        listening_vector: 'Core Motivations & Unspoken Assumptions',
        pushback_mechanic: pushbackMechanic.trim() || 'Direct inquiry into the biggest obstacles and costs',
        pacing_constraints: {
          max_questions_per_turn: 1,
          emotional_temperature: 'Focused & Curious',
          weaponized_brevity: true,
          banned_fillers: ['Awesome', 'Great answer', 'Fascinating', 'Thanks for sharing'],
        },
      },
      narrator_engine: {
        narrative_stance: narrativeStance.trim() || 'Punchy, insight-driven long-form story',
        sentence_cadence: 'Dynamic rhythm with clear narrative signposts',
        lexical_filters: {
          banned_words: ['leverage', 'synergy', 'paradigm shift', 'optimize'],
          preferred_verbs: ['reveals', 'wrestles', 'counters', 'discovers'],
        },
        output_schema: [
          '# [THE STORY HEADLINE]',
          '### 1. THE HOOK & TENSION',
          '### 2. THE CORE REALITY & CHOICES',
          '### 3. THE FINAL TAKEAWAY',
        ],
        format_title: formatTitle.trim() || `${displayName} Signature Story`,
        format_description: `Narrative synthesized in the voice and structure of ${displayName}`,
      },
      is_custom: true,
    };

    onSavePersona(newPersona);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl bg-surface-200 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Create Custom Interviewer Archetype</h2>
            <p className="text-xs text-slate-400">Define a custom persona, interrogation style, and writing voice</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Interviewer Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Walter Isaacson, Lex Fridman, Kara Swisher"
              className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Core Tagline / Ethos</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Unflinching examination of genius, obsession, and systemic friction."
              className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Voice Timbre</label>
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value as VoiceName)}
                className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                <option value="Fenrir">Fenrir (Intense, deep, urgent)</option>
                <option value="Charon">Charon (Measured, deliberate, grounded)</option>
                <option value="Kore">Kore (Warm, calm, empathetic)</option>
                <option value="Puck">Puck (Lively, witty, energetic)</option>
                <option value="Aoede">Aoede (Direct, fast, confident)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Avatar Theme Color</label>
              <div className="flex items-center gap-2 mt-1">
                {['#f97316', '#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'].map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition ${
                      color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Relational Stance (Inquisitor Engine)</label>
            <input
              type="text"
              value={relationalStance}
              onChange={(e) => setRelationalStance(e.target.value)}
              placeholder="e.g. The Philosophical Biographer (Patient, probing, deeply curious about origins)"
              className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Pushback Mechanic</label>
            <input
              type="text"
              value={pushbackMechanic}
              onChange={(e) => setPushbackMechanic(e.target.value)}
              placeholder="e.g. Ask for the specific moment of doubt that almost derailed everything"
              className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Writing & Narrative Stance</label>
            <input
              type="text"
              value={narrativeStance}
              onChange={(e) => setNarrativeStance(e.target.value)}
              placeholder="e.g. Visceral first-person manifesto with dark humor and unvarnished moral clarity"
              className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Signature Writing Format Title</label>
            <input
              type="text"
              value={formatTitle}
              onChange={(e) => setFormatTitle(e.target.value)}
              placeholder="e.g. The Deep Biography Chapter"
              className="w-full bg-surface-100 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-100 text-slate-300 font-semibold hover:bg-surface-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-slate-950 shadow-lg transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" /> Save Archetype
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
