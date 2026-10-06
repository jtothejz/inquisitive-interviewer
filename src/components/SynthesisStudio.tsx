import React, { useState, useEffect } from 'react';
import { Persona, SynthesizedDraft, TranscriptTurn, JuicyNugget } from '../types/persona';
import { SynthesisService } from '../services/synthesis-service';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Quote,
  Flame,
  ArrowLeft,
  Wand2,
  Printer,
  Share2,
} from 'lucide-react';

interface SynthesisStudioProps {
  apiKey: string;
  topic: string;
  transcript: TranscriptTurn[];
  nuggets: JuicyNugget[];
  allPersonas: Persona[];
  initialDrafts?: SynthesizedDraft[];
  briefingBook?: import('../types/persona').InterviewBriefingBook;
  onStartNewSession: () => void;
  onSaveDraftsToSession?: (drafts: SynthesizedDraft[]) => void;
}

export const SynthesisStudio: React.FC<SynthesisStudioProps> = ({
  apiKey,
  topic,
  transcript,
  nuggets,
  allPersonas,
  initialDrafts = [],
  briefingBook,
  onStartNewSession,
  onSaveDraftsToSession,
}) => {
  const [drafts, setDrafts] = useState<SynthesizedDraft[]>(initialDrafts);
  const [activeFormatId, setActiveFormatId] = useState<string>(
    initialDrafts.length > 0 ? initialDrafts[0].formatId : 'quotes_deck'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [customRefinePrompt, setCustomRefinePrompt] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialDrafts && initialDrafts.length > 0) {
      setDrafts(initialDrafts);
      setActiveFormatId(initialDrafts[0].formatId);
    }
  }, [initialDrafts]);

  const synthesisService = new SynthesisService(apiKey);

  const handleGenerateDraft = async (persona: Persona, customPrompt?: string) => {
    setIsGenerating(true);
    setSynthesisError(null);
    try {
      const draft = await synthesisService.generateDraft(
        persona,
        transcript,
        nuggets,
        topic,
        customPrompt,
        briefingBook
      );
      setDrafts((prev) => {
        const filtered = prev.filter((d) => d.personaId !== persona.id);
        const updated = [...filtered, draft];
        onSaveDraftsToSession?.(updated);
        return updated;
      });
      setActiveFormatId(draft.formatId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSynthesisError(`Synthesis failed: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateQuotesDeck = async () => {
    setIsGenerating(true);
    setSynthesisError(null);
    try {
      const draft = await synthesisService.generateQuotesDeck(transcript, nuggets, topic);
      setDrafts((prev) => {
        const filtered = prev.filter((d) => d.personaId !== 'quotes_curator');
        const updated = [...filtered, draft];
        onSaveDraftsToSession?.(updated);
        return updated;
      });
      setActiveFormatId(draft.formatId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSynthesisError(`Quotes Deck failed: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const activeDraft = drafts.find((d) => d.formatId === activeFormatId) || drafts[0];

  const handleCopyMarkdown = () => {
    if (!activeDraft) return;
    navigator.clipboard.writeText(activeDraft.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!activeDraft) return;
    const blob = new Blob([activeDraft.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDraft.formatTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col print:bg-white print:text-black">
      {/* Studio Navigation Header */}
      <header className="border-b border-slate-800 bg-surface-200/90 backdrop-blur-md px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onStartNewSession}
            className="p-2 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Back to Studio Setup"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                Synthesis Studio
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-100 truncate max-w-lg">
                {topic}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {transcript.length} dialogue turns • {nuggets.length} juicy nuggets extracted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartNewSession}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> New Session
          </button>
        </div>
      </header>

      {/* Format Generator Selector Bar */}
      <div className="border-b border-slate-800/80 bg-surface-300/60 px-6 py-3 overflow-x-auto flex items-center gap-2 print:hidden">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Formats:
        </span>

        {/* Quotes Deck button */}
        <button
          onClick={handleGenerateQuotesDeck}
          disabled={isGenerating}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 whitespace-nowrap ${
            activeDraft?.personaId === 'quotes_curator'
              ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 shadow-md'
              : 'bg-surface-100/90 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Quote className="w-3.5 h-3.5 text-orange-400" />
          Golden Quotes & Soundbites Deck
        </button>

        {/* Persona Formats */}
        {allPersonas.map((p) => {
          const hasDraft = drafts.some((d) => d.personaId === p.id);
          const isSelected = activeDraft?.personaId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleGenerateDraft(p)}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 whitespace-nowrap ${
                isSelected
                  ? 'border-orange-500/80 shadow-md ring-1 ring-orange-500/30'
                  : 'bg-surface-100/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
              style={{
                backgroundColor: isSelected ? `${p.color}25` : undefined,
                color: isSelected ? p.color : undefined,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.narrator_engine.format_title}
              {hasDraft && <span className="text-[10px] opacity-70">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Side: Transcript & Extracted Nuggets */}
        <div className="lg:col-span-5 border-r border-slate-800/80 bg-surface-200/40 p-5 overflow-y-auto max-h-[calc(100vh-120px)] space-y-6 print:hidden">
          {/* Nuggets Deck Preview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Extracted Revelations ({nuggets.length})
            </h3>
            {nuggets.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No juicy nuggets extracted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {nuggets.map((nugget) => (
                  <div
                    key={nugget.id}
                    className="p-3 rounded-2xl bg-surface-100/80 border border-slate-800 text-xs shadow-sm hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase text-orange-400 tracking-wider">
                        {nugget.category} • {nugget.label}
                      </span>
                    </div>
                    <blockquote className="text-slate-200 font-medium italic border-l-2 border-orange-400 pl-2 my-1">
                      "{nugget.quote}"
                    </blockquote>
                    <p className="text-[11px] text-slate-400">{nugget.context}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw Chronological Transcript */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Chronological Transcript ({transcript.length} turns)
            </h3>
            <div className="space-y-3">
              {transcript.map((turn) => (
                <div key={turn.id} className="text-xs space-y-0.5">
                  <span
                    className={`font-bold uppercase tracking-wide text-[10px] ${
                      turn.speaker === 'user' ? 'text-blue-400' : 'text-orange-400'
                    }`}
                  >
                    {turn.speaker}
                  </span>
                  <p className="text-slate-300 leading-relaxed bg-surface-100/40 p-3 rounded-2xl border border-slate-800/60">
                    {turn.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Active Formatted Narrative Draft or Skeleton */}
        <div className="lg:col-span-7 bg-surface-300/30 p-6 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-120px)] print:col-span-12 print:max-h-none print:p-0">
          {synthesisError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-3 print:hidden">
              <span>{synthesisError}</span>
              <button
                onClick={() => setSynthesisError(null)}
                className="px-2.5 py-1 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white font-semibold text-[11px] transition"
              >
                Dismiss
              </button>
            </div>
          )}

          {isGenerating ? (
            <div className="space-y-6 animate-pulse">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-slate-700/60 rounded-xl" />
                  <div className="h-3 w-64 bg-slate-800/80 rounded" />
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing Publication Draft...
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800/80 space-y-6 shadow-xl">
                <div className="h-7 w-3/4 bg-slate-700/60 rounded-xl" />
                <div className="space-y-2.5">
                  <div className="h-3.5 w-full bg-slate-800/70 rounded" />
                  <div className="h-3.5 w-11/12 bg-slate-800/70 rounded" />
                  <div className="h-3.5 w-4/5 bg-slate-800/70 rounded" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/40 border-l-4 border-orange-500/60 space-y-2">
                  <div className="h-3.5 w-5/6 bg-slate-700/60 rounded" />
                  <div className="h-3 w-1/2 bg-slate-800/60 rounded" />
                </div>
                <div className="space-y-2.5">
                  <div className="h-3.5 w-full bg-slate-800/70 rounded" />
                  <div className="h-3.5 w-10/12 bg-slate-800/70 rounded" />
                  <div className="h-3.5 w-3/4 bg-slate-800/70 rounded" />
                </div>
              </div>
            </div>
          ) : activeDraft ? (
            <div className="space-y-6">
              {/* Draft Header & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 print:hidden">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-400" />
                    {activeDraft.formatTitle}
                  </h2>
                  <p className="text-xs text-slate-400">{activeDraft.formatDescription}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95"
                    title="Copy Markdown"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Markdown'}
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95"
                    title="Download .md file"
                  >
                    <Download className="w-3.5 h-3.5" /> .md
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95"
                    title="Print / Save PDF"
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              {/* Formatted Content Prose Canvas */}
              <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-800/90 print:border-none print:shadow-none print:p-0">
                <div className="prose prose-invert prose-orange max-w-none text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans print:text-black print:prose-neutral">
                  {activeDraft.content}
                </div>
              </div>

              {/* AI Refinement Box */}
              <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 space-y-2 print:hidden">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                  AI Polish & Refinement:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customRefinePrompt}
                    onChange={(e) => setCustomRefinePrompt(e.target.value)}
                    placeholder="e.g. 'Sharpen the opening hook', 'Emphasize the financial stakes and moral dilemma'..."
                    className="flex-1 bg-surface-200 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500/60 transition"
                  />
                  <button
                    onClick={() => {
                      const matchedPersona = allPersonas.find((p) => p.id === activeDraft.personaId);
                      if (matchedPersona) {
                        handleGenerateDraft(matchedPersona, customRefinePrompt);
                      }
                    }}
                    disabled={isGenerating || !customRefinePrompt.trim()}
                    className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition active:scale-95 shadow-md"
                  >
                    Refine Draft
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-500">
              <Share2 className="w-12 h-12 text-slate-700 mb-3" />
              <h3 className="text-base font-bold text-slate-300">Ready to synthesize your narrative</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1 mb-6">
                Choose a format above to turn your raw dialogue into a publication-ready piece in seconds.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleGenerateQuotesDeck}
                  disabled={isGenerating}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-xs text-slate-950 shadow-lg transition active:scale-95"
                >
                  Generate Golden Quotes Deck
                </button>
                {allPersonas[0] && (
                  <button
                    onClick={() => handleGenerateDraft(allPersonas[0])}
                    disabled={isGenerating}
                    className="px-4 py-2.5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-700 font-semibold text-xs text-slate-200 transition active:scale-95"
                  >
                    Generate in {allPersonas[0].display_name}'s Voice
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
