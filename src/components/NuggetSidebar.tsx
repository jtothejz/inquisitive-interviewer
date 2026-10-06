import React, { useState } from 'react';
import { JuicyNugget, InterviewBriefingBook } from '../types/persona';
import {
  Sparkles,
  Pin,
  BookmarkCheck,
  Flame,
  Scale,
  Quote,
  Milestone,
  BarChart3,
  Copy,
  Check,
  X,
  FileText,
  Landmark,
  Target,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface NuggetSidebarProps {
  nuggets: JuicyNugget[];
  onTogglePin: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  briefingBook?: InterviewBriefingBook;
  initialTab?: 'nuggets' | 'dossier';
}

export const NuggetSidebar: React.FC<NuggetSidebarProps> = ({
  nuggets,
  onTogglePin,
  isOpen,
  onToggleOpen,
  briefingBook,
  initialTab = 'nuggets',
}) => {
  const [activeTab, setActiveTab] = useState<'nuggets' | 'dossier'>(initialTab);
  const [activeDossierSubTab, setActiveDossierSubTab] = useState<
    'metrics' | 'precedents' | 'landmines' | 'countertheses'
  >('metrics');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync tab if initialTab changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const getCategoryIcon = (category: JuicyNugget['category']) => {
    switch (category) {
      case 'admission':
        return <Flame className="w-3.5 h-3.5 text-red-400" />;
      case 'conflict':
        return <Scale className="w-3.5 h-3.5 text-amber-400" />;
      case 'quote':
        return <Quote className="w-3.5 h-3.5 text-blue-400" />;
      case 'turning_point':
        return <Milestone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'metric':
        return <BarChart3 className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-orange-400" />;
    }
  };

  const getCategoryBadgeClass = (category: JuicyNugget['category']) => {
    switch (category) {
      case 'admission':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'conflict':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'quote':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'turning_point':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'metric':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
  };

  const handleCopyQuote = (nugget: JuicyNugget) => {
    navigator.clipboard.writeText(`"${nugget.quote}" — ${nugget.context}`);
    setCopiedId(nugget.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full transition-all duration-300 z-30 flex ${
        isOpen ? 'w-full sm:w-96 md:w-[420px] max-w-full' : 'w-0'
      }`}
    >
      {/* Toggle Tab */}
      <button
        onClick={onToggleOpen}
        className="absolute -left-10 top-20 bg-surface-100 hover:bg-surface-50 border border-slate-800 text-slate-300 px-2.5 py-3 rounded-l-xl shadow-xl flex flex-col items-center gap-1 text-xs font-semibold"
        title="Toggle Studio Intelligence Drawer"
      >
        <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
        <span className="[writing-mode:vertical-rl] tracking-wider uppercase text-[10px] text-slate-400">
          Intel ({nuggets.length})
        </span>
      </button>

      {/* Sidebar Content */}
      <div className="w-full h-full bg-surface-200/95 backdrop-blur-xl border-l border-slate-800/80 flex flex-col shadow-2xl overflow-hidden">
        {/* Header with Tab Switcher */}
        <div className="p-3.5 border-b border-slate-800/80 bg-surface-100/50">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 rounded-xl bg-surface-200 p-1 border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('nuggets')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  activeTab === 'nuggets'
                    ? 'bg-orange-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Nuggets ({nuggets.length})</span>
              </button>
              {briefingBook && (
                <button
                  onClick={() => setActiveTab('dossier')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                    activeTab === 'dossier'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Prep Dossier</span>
                </button>
              )}
            </div>

            <button
              onClick={onToggleOpen}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeTab === 'dossier' && briefingBook && (
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800/60 text-[10px] font-semibold text-slate-400">
              <button
                onClick={() => setActiveDossierSubTab('metrics')}
                className={`py-1 px-1.5 rounded-md flex items-center justify-center gap-1 truncate transition ${
                  activeDossierSubTab === 'metrics'
                    ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                    : 'hover:bg-surface-100 text-slate-400'
                }`}
              >
                <BarChart3 className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">Facts ({briefingBook.hardDatapoints.length})</span>
              </button>
              <button
                onClick={() => setActiveDossierSubTab('precedents')}
                className={`py-1 px-1.5 rounded-md flex items-center justify-center gap-1 truncate transition ${
                  activeDossierSubTab === 'precedents'
                    ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                    : 'hover:bg-surface-100 text-slate-400'
                }`}
              >
                <Landmark className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">Cases ({briefingBook.historicalPrecedents.length})</span>
              </button>
              <button
                onClick={() => setActiveDossierSubTab('landmines')}
                className={`py-1 px-1.5 rounded-md flex items-center justify-center gap-1 truncate transition ${
                  activeDossierSubTab === 'landmines'
                    ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                    : 'hover:bg-surface-100 text-slate-400'
                }`}
              >
                <Target className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">Landmines ({briefingBook.vulnerabilitiesAndPRSpin.length})</span>
              </button>
              <button
                onClick={() => setActiveDossierSubTab('countertheses')}
                className={`py-1 px-1.5 rounded-md flex items-center justify-center gap-1 truncate transition ${
                  activeDossierSubTab === 'countertheses'
                    ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                    : 'hover:bg-surface-100 text-slate-400'
                }`}
              >
                <Scale className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">Bears ({briefingBook.counterTheses.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {activeTab === 'nuggets' ? (
            nuggets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Sparkles className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
                <p className="text-xs font-medium text-slate-400">Listening for revelations...</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  As you speak, candid admissions and turning points will be automatically pinned here for your final drafts.
                </p>
              </div>
            ) : (
              nuggets.map((nugget) => (
                <div
                  key={nugget.id}
                  className={`p-3 rounded-xl border transition-all duration-200 ${
                    nugget.pinned
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-surface-100/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${getCategoryBadgeClass(
                          nugget.category
                        )}`}
                      >
                        {getCategoryIcon(nugget.category)}
                        {nugget.category}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 truncate max-w-[130px]">
                        {nugget.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyQuote(nugget)}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
                        title="Copy Quote"
                      >
                        {copiedId === nugget.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => onTogglePin(nugget.id)}
                        className={`p-1 rounded transition ${
                          nugget.pinned
                            ? 'text-orange-400 bg-orange-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title={nugget.pinned ? 'Pinned to drafts' : 'Pin to synthesis drafts'}
                      >
                        {nugget.pinned ? (
                          <BookmarkCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Pin className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <blockquote className="text-xs text-slate-200 font-medium italic border-l-2 border-orange-400/60 pl-2 my-1.5 leading-relaxed">
                    "{nugget.quote}"
                  </blockquote>

                  {nugget.context && (
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      <span className="font-semibold text-slate-300">Why it matters: </span>
                      {nugget.context}
                    </p>
                  )}
                </div>
              ))
            )
          ) : briefingBook ? (
            <div className="space-y-3">
              {/* Header Angle */}
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-orange-300 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Interviewer's Secret Angle
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {briefingBook.summaryAngle}
                </p>
              </div>

              {/* Sub-tab 1: Hard Datapoints */}
              {activeDossierSubTab === 'metrics' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                    Verified Facts & Metrics To Cite
                  </div>
                  {briefingBook.hardDatapoints.map((dp, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5 text-xs"
                    >
                      <div className="font-bold text-purple-300">{dp.metricOrFact}</div>
                      <div className="text-[11px] text-slate-400">{dp.context}</div>
                      <div className="text-[11px] text-orange-300/90 font-medium pt-1 border-t border-slate-800/80">
                        <span className="text-slate-500 font-normal">Weaponize: </span>
                        {dp.relevance}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-tab 2: Precedents */}
              {activeDossierSubTab === 'precedents' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-blue-400" />
                    Historical Precedents & Analogies
                  </div>
                  {briefingBook.historicalPrecedents.map((pr, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-surface-100/80 border border-slate-800 space-y-1.5 text-xs"
                    >
                      <div className="font-bold text-blue-300">{pr.analogyOrCase}</div>
                      <div className="text-[11px] text-slate-400">
                        <span className="text-slate-500">Historical Lesson: </span>
                        {pr.lesson}
                      </div>
                      <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                        <span className="text-slate-500">Application: </span>
                        {pr.applicationToGuest}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-tab 3: Landmines */}
              {activeDossierSubTab === 'landmines' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-red-400" />
                    PR Talking Points vs Razor Traps
                  </div>
                  {briefingBook.vulnerabilitiesAndPRSpin.map((lm, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-surface-100/80 border border-slate-800 space-y-2 text-xs"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Anticipated PR Line
                        </span>
                        <span className="text-slate-300 italic text-[11px]">"{lm.talkingPoint}"</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-400/80 block">
                          Unspoken Tension
                        </span>
                        <span className="text-slate-400 text-[11px]">{lm.underlyingTension}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 font-semibold text-[11px]">
                        <span className="text-[9px] uppercase font-bold text-red-400 block tracking-wider">
                          Razor Trapdoor Question
                        </span>
                        "{lm.razorQuestion}"
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-tab 4: Counter-Theses */}
              {activeDossierSubTab === 'countertheses' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    Critic Bear-Cases & Objections
                  </div>
                  <div className="space-y-2">
                    {briefingBook.counterTheses.map((ct, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-surface-100/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed text-[11px]">{ct}</span>
                      </div>
                    ))}
                  </div>

                  {briefingBook.groundingSources && briefingBook.groundingSources.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Google Search Verified Citations
                      </div>
                      <div className="space-y-1">
                        {briefingBook.groundingSources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between text-[11px] text-blue-400 hover:text-blue-300 truncate p-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-slate-800 transition"
                          >
                            <span className="truncate max-w-[280px]">{src.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 ml-1 opacity-70" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs">
              No prep briefing book attached to this session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
