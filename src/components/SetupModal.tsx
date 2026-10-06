import React, { useState } from 'react';
import { Persona, InterviewConfig, InterviewMode, InterviewBriefingBook } from '../types/persona';
import { SAMPLE_DOSSIERS } from '../data/personas';
import { researchProducer } from '../services/research-producer';
import {
  Mic,
  Users,
  User,
  Sliders,
  Settings,
  PlusCircle,
  FileText,
  Radio,
  History,
  Play,
  Sparkles,
  Search,
  BarChart3,
  Landmark,
  Target,
  Scale,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Compass,
  Lightbulb,
} from 'lucide-react';

interface SetupModalProps {
  allPersonas: Persona[];
  onStartInterview: (config: InterviewConfig, isSimulation?: boolean) => void;
  onOpenCustomPersona: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  apiKey: string;
  hasHistory: boolean;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  allPersonas,
  onStartInterview,
  onOpenCustomPersona,
  onOpenSettings,
  onOpenHistory,
  apiKey,
  hasHistory,
}) => {
  const [activeSampleIndex, setActiveSampleIndex] = useState<number | 'custom'>(0);
  const [guestName, setGuestName] = useState(SAMPLE_DOSSIERS[0].guestName);
  const [guestRole, setGuestRole] = useState(SAMPLE_DOSSIERS[0].guestRole);
  const [topic, setTopic] = useState(SAMPLE_DOSSIERS[0].topic);
  const [dossier, setDossier] = useState(SAMPLE_DOSSIERS[0].dossier);
  const [briefingBook, setBriefingBook] = useState<InterviewBriefingBook | null>(
    SAMPLE_DOSSIERS[0].briefingBook
  );
  const [sampleBriefingTopic, setSampleBriefingTopic] = useState<string>(SAMPLE_DOSSIERS[0].topic);
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgressMsg, setResearchProgressMsg] = useState('');
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [activeBriefingTab, setActiveBriefingTab] = useState<
    'origins' | 'metrics' | 'precedents' | 'landmines' | 'countertheses'
  >('origins');

  const [mode, setMode] = useState<InterviewMode>('single');
  const [primaryPersonaId, setPrimaryPersonaId] = useState<string>('gonzo_hunter');
  const [panelPersonaIds, setPanelPersonaIds] = useState<string[]>([
    'gonzo_hunter',
    'michael_barbaro',
    'kara_swisher',
  ]);
  const [interviewGoal, setInterviewGoal] = useState<'thesis_discovery' | 'cross_examination'>('thesis_discovery');
  const [intensity, setIntensity] = useState<'gentle' | 'balanced' | 'ruthless'>('balanced');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTogglePanelPersona = (id: string) => {
    setValidationError(null);
    setPanelPersonaIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleLoadSample = (sampleIndex: number) => {
    setValidationError(null);
    setActiveSampleIndex(sampleIndex);
    const sample = SAMPLE_DOSSIERS[sampleIndex];
    if (sample) {
      setTopic(sample.topic);
      setDossier(sample.dossier);
      setGuestName(sample.guestName);
      setGuestRole(sample.guestRole);
      setBriefingBook(sample.briefingBook);
      setSampleBriefingTopic(sample.topic);
    }
  };

  const handleSelectCustom = () => {
    setValidationError(null);
    setActiveSampleIndex('custom');
    setGuestName('');
    setGuestRole('');
    setTopic('');
    setDossier('');
    setBriefingBook(null);
    setSampleBriefingTopic('');
  };

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    if (activeSampleIndex !== 'custom') {
      setActiveSampleIndex('custom');
    }
    // If the briefing book belonged to an old sample and topic has changed, invalidate it
    if (briefingBook && sampleBriefingTopic && newTopic.trim().toLowerCase() !== sampleBriefingTopic.trim().toLowerCase()) {
      setBriefingBook(null);
      setSampleBriefingTopic('');
    }
  };

  const handleGuestNameChange = (val: string) => {
    setGuestName(val);
    if (activeSampleIndex !== 'custom') setActiveSampleIndex('custom');
  };

  const handleGuestRoleChange = (val: string) => {
    setGuestRole(val);
    if (activeSampleIndex !== 'custom') setActiveSampleIndex('custom');
  };

  const handleDossierChange = (val: string) => {
    setDossier(val);
    if (activeSampleIndex !== 'custom') setActiveSampleIndex('custom');
  };

  const handleDoHomework = async () => {
    if (!topic.trim()) {
      setValidationError('Please specify a core topic before running the Show Producer research.');
      return;
    }
    setValidationError(null);
    setIsResearching(true);

    const steps = [
      'Querying Google Search & investigating public records...',
      'Synthesizing hard operational metrics & industry benchmarks...',
      'Formulating historical analogies & corporate precedents...',
      'Mapping predictable PR talking points and razor counter-theses...',
    ];
    let stepIdx = 0;
    setResearchProgressMsg(steps[0]);
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setResearchProgressMsg(steps[stepIdx]);
    }, 1300);

    try {
      const book = await researchProducer.generateBriefingBook({
        topic: topic.trim(),
        guestName: guestName.trim(),
        guestRole: guestRole.trim(),
        notes: dossier.trim(),
        apiKey,
      });
      setBriefingBook(book);
      setSampleBriefingTopic(topic.trim());
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 3000);
    } catch (err: unknown) {
      console.warn('Research generation error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setValidationError(`Show Producer note: ${msg}`);
    } finally {
      clearInterval(interval);
      setIsResearching(false);
      setResearchProgressMsg('');
    }
  };

  const handleLaunch = (isSimulation: boolean = false) => {
    setValidationError(null);
    if (!isSimulation && !apiKey) {
      setValidationError('To start a live voice session, please add your Gemini API Key in Settings (or use Demo Mode below).');
      return;
    }
    if (!topic.trim()) {
      setValidationError('Please provide a topic or premise for the interview before starting.');
      return;
    }

    // Safety: ensure briefing book belongs to the current topic and is not a stale demo artifact
    const activeBriefing =
      briefingBook &&
      (!sampleBriefingTopic || sampleBriefingTopic.trim().toLowerCase() === topic.trim().toLowerCase())
        ? briefingBook
        : undefined;

    onStartInterview(
      {
        mode,
        primaryPersonaId,
        panelPersonaIds,
        topic: topic.trim(),
        dossier: dossier.trim(),
        guestName: guestName.trim(),
        guestRole: guestRole.trim(),
        briefingBook: activeBriefing,
        intensity,
        interviewGoal,
        autoExtractNuggets: true,
      },
      isSimulation
    );
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Mic className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Inquisitive Interviewer
              <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400">
                Voice AI Studio
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Live simulated cross-examination & publication-ready narrative synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {hasHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-800 text-xs font-semibold text-slate-300 transition shadow-sm"
            >
              <History className="w-4 h-4 text-orange-400" />
              <span>Past Sessions</span>
            </button>
          )}

          <button
            onClick={onOpenCustomPersona}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-800 text-xs font-semibold text-slate-300 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-orange-400" />
            <span className="hidden sm:inline">Add Custom Persona</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-slate-800 text-slate-400 hover:text-slate-200 transition shadow-sm"
            title="API & Studio Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Setup Grid */}
      <main className="max-w-6xl w-full mx-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Topic & Dossier */}
        <div className="lg:col-span-6 space-y-6">
          {/* Section 1: Guest Identity & Core Premise */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-slate-800/90 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-400" />
                1. Guest Identity & Core Premise
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-slate-500 font-medium">Scenario:</span>
                <button
                  type="button"
                  onClick={handleSelectCustom}
                  className={`px-2 py-0.5 rounded-md font-semibold transition flex items-center gap-1 ${
                    activeSampleIndex === 'custom'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50 shadow-sm'
                      : 'bg-surface-100 hover:bg-surface-50 text-slate-400 border border-slate-700/60'
                  }`}
                  title="Start fresh with a clean slate for your custom topic"
                >
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  <span>Custom</span>
                </button>
                {SAMPLE_DOSSIERS.map((_s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadSample(idx)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${
                      activeSampleIndex === idx
                        ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-surface-100 hover:bg-surface-50 text-orange-300 border border-slate-700/60'
                    }`}
                    title={_s.title}
                  >
                    #{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Guest Name & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Guest Name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => handleGuestNameChange(e.target.value)}
                  placeholder="e.g. Alex Chen or Subject Name"
                  className="w-full bg-surface-200/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Title / Role / Affiliation
                </label>
                <input
                  type="text"
                  value={guestRole}
                  onChange={(e) => handleGuestRoleChange(e.target.value)}
                  placeholder="e.g. Founder & CEO, WorkflowGen"
                  className="w-full bg-surface-200/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Core Topic / Premise to Interrogate
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => handleTopicChange(e.target.value)}
                placeholder="e.g. Why we decided to ban smartphones or pivot the company..."
                className="w-full bg-surface-200/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Raw Context, Private Tensions & Unsaid Facts
              </label>
              <textarea
                rows={3}
                value={dossier}
                onChange={(e) => handleDossierChange(e.target.value)}
                placeholder="Provide real-world facts, numbers, dates, private tensions, or disputes so the AI can drill down into the real story..."
                className="w-full bg-surface-200/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans transition shadow-inner"
              />
            </div>
          </div>

          {/* Section 2: Investigative Show Producer (The Homework Engine) */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-slate-800/90 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-extrabold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <Search className="w-4 h-4 text-orange-400" />
                  2. Pre-Interview Homework & Dossier
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The interviewer's briefing book: verified metrics, precedents, PR traps, and bear cases
                </p>
              </div>

              <div className="flex items-center gap-2">
                {justRefreshed && (
                  <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    ✓ Updated Just Now
                  </span>
                )}

                {briefingBook?.groundingSources && briefingBook.groundingSources.length > 0 && (
                  <span className="text-[10px] uppercase font-bold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    🔍 {briefingBook.groundingSources.length} Grounded Sources
                  </span>
                )}

                {apiKey ? (
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Search Grounded
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                    Demo Research Mode
                  </span>
                )}

                <button
                  onClick={handleDoHomework}
                  disabled={isResearching}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-md transition"
                  title="Run automated journalistic research on this topic & guest"
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Investigating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{briefingBook ? 'Re-run Homework' : 'Do My Homework'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Research Loading State */}
            {isResearching && (
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3 animate-pulse">
                <Loader2 className="w-5 h-5 text-orange-400 animate-spin shrink-0" />
                <div>
                  <div className="text-xs font-bold text-orange-300">Show Producer Investigating...</div>
                  <div className="text-[11px] text-slate-300">{researchProgressMsg}</div>
                </div>
              </div>
            )}

            {/* Briefing Book Inspector */}
            {briefingBook && !isResearching && (
              <div className="space-y-3 pt-1">
                {/* Central Tension Banner */}
                <div className="p-3 rounded-2xl bg-surface-200/90 border border-slate-700/80 text-xs space-y-1 shadow-inner">
                  <div className="flex items-center gap-1.5 text-orange-400 font-bold text-[11px] uppercase tracking-wider">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Central Narrative Tension / Angle
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">
                    {briefingBook.summaryAngle}
                  </p>
                </div>

                {/* Subtabs */}
                <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-surface-200 border border-slate-800 text-[11px] font-semibold">
                  <button
                    onClick={() => setActiveBriefingTab('origins')}
                    className={`py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                      activeBriefingTab === 'origins'
                        ? 'bg-orange-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass className="w-3 h-3 shrink-0" />
                    <span className="truncate">Origins ({briefingBook.originAndMotivationAngles?.length || 3})</span>
                  </button>
                  <button
                    onClick={() => setActiveBriefingTab('metrics')}
                    className={`py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                      activeBriefingTab === 'metrics'
                        ? 'bg-orange-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3 shrink-0" />
                    <span className="truncate">Facts ({briefingBook.hardDatapoints.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveBriefingTab('precedents')}
                    className={`py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                      activeBriefingTab === 'precedents'
                        ? 'bg-orange-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Landmark className="w-3 h-3 shrink-0" />
                    <span className="truncate">Cases ({briefingBook.historicalPrecedents.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveBriefingTab('landmines')}
                    className={`py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                      activeBriefingTab === 'landmines'
                        ? 'bg-orange-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Target className="w-3 h-3 shrink-0" />
                    <span className="truncate">Traps ({briefingBook.vulnerabilitiesAndPRSpin.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveBriefingTab('countertheses')}
                    className={`py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                      activeBriefingTab === 'countertheses'
                        ? 'bg-orange-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Scale className="w-3 h-3 shrink-0" />
                    <span className="truncate">Bears ({briefingBook.counterTheses.length})</span>
                  </button>
                </div>

                {/* Subtab Content Area */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeBriefingTab === 'origins' &&
                    (briefingBook.originAndMotivationAngles && briefingBook.originAndMotivationAngles.length > 0 ? (
                      briefingBook.originAndMotivationAngles.map((oa, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-surface-200/80 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="font-bold text-amber-300 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-amber-400" />
                            Phase 1 Genesis & Origin Angle #{i + 1}
                          </div>
                          <div className="text-[11px] text-slate-200 leading-relaxed">{oa}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Default genesis inquiry: Formative project history, catalyst moments, and underlying motivations.
                      </div>
                    ))}
                  {activeBriefingTab === 'metrics' &&
                    briefingBook.hardDatapoints.map((dp, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-surface-200/80 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="font-bold text-purple-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          {dp.metricOrFact}
                        </div>
                        <div className="text-[11px] text-slate-400">{dp.context}</div>
                        <div className="text-[11px] text-orange-300 font-medium pt-0.5">
                          <span className="text-slate-500">Cross-examine: </span>
                          {dp.relevance}
                        </div>
                      </div>
                    ))}

                  {activeBriefingTab === 'precedents' &&
                    briefingBook.historicalPrecedents.map((pr, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-surface-200/80 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="font-bold text-blue-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {pr.analogyOrCase}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <span className="text-slate-500 font-semibold">Lesson: </span>
                          {pr.lesson}
                        </div>
                        <div className="text-[11px] text-slate-300 pt-0.5">
                          <span className="text-slate-500 font-semibold">Parallel: </span>
                          {pr.applicationToGuest}
                        </div>
                      </div>
                    ))}

                  {activeBriefingTab === 'landmines' &&
                    briefingBook.vulnerabilitiesAndPRSpin.map((lm, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-surface-200/80 border border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="text-[11px] text-slate-400">
                          <span className="text-slate-500 font-bold uppercase text-[9px] block">
                            Anticipated PR Line
                          </span>
                          "{lm.talkingPoint}"
                        </div>
                        <div className="text-[11px] text-slate-300">
                          <span className="text-amber-400/80 font-bold uppercase text-[9px] block">
                            Uncomfortable Reality
                          </span>
                          {lm.underlyingTension}
                        </div>
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 font-semibold text-[11px]">
                          <span className="text-[9px] uppercase font-bold text-red-400 block tracking-wider">
                            Razor Trapdoor Question
                          </span>
                          "{lm.razorQuestion}"
                        </div>
                      </div>
                    ))}

                  {activeBriefingTab === 'countertheses' && (
                    <div className="space-y-1.5">
                      {briefingBook.counterTheses.map((ct, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-surface-200/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2"
                        >
                          <span className="w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {i + 1}
                          </span>
                          <span className="text-[11px] leading-relaxed">{ct}</span>
                        </div>
                      ))}

                      {briefingBook.groundingSources && briefingBook.groundingSources.length > 0 && (
                        <div className="pt-2 border-t border-slate-800">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
                                <span className="truncate max-w-[320px]">{src.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 ml-1 opacity-70" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State when no briefing book has been generated yet */}
            {!briefingBook && !isResearching && (
              <div className="p-6 rounded-2xl bg-surface-200/50 border border-dashed border-slate-700/80 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto shadow-inner">
                  <Search className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-200">No Briefing Dossier Generated Yet</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {topic.trim()
                      ? `Ready to investigate "${topic.length > 40 ? topic.slice(0, 38) + '...' : topic}". Click below to generate verified receipts, precedents, and PR traps.`
                      : 'Define your guest identity and premise above, then run automated homework to prepare cross-examination receipts.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDoHomework}
                  disabled={!topic.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-md transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Homework Dossier</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Interview Goal Arc & Pushback Heat Dial */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800/90 shadow-2xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <Compass className="w-3.5 h-3.5 text-orange-400" />
                3. Interview Goal & Conversational Arc
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setInterviewGoal('thesis_discovery')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    interviewGoal === 'thesis_discovery'
                      ? 'bg-orange-500/15 border-orange-500 text-orange-300 shadow-md ring-1 ring-orange-500/30'
                      : 'bg-surface-200/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      Article & Thesis Discovery
                    </span>
                    <span className="text-[9px] uppercase font-bold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded ml-auto">
                      Default
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Explores formative project history, turning points, and motivations before stress-testing.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setInterviewGoal('cross_examination')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    interviewGoal === 'cross_examination'
                      ? 'bg-orange-500/15 border-orange-500 text-orange-300 shadow-md ring-1 ring-orange-500/30'
                      : 'bg-surface-200/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-red-400" />
                      Investigative Cross-Exam
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Immediate high-velocity accountability holding claims to verified receipts.
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                Pushback & Heat Dial
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'gentle', label: 'Gentle', desc: 'Terry Gross craft exploration' },
                  { id: 'balanced', label: 'Balanced', desc: 'Audie Cornish trade-off mapping' },
                  { id: 'ruthless', label: 'Ruthless', desc: 'Gonzo / Kara spin destroying' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIntensity(item.id as 'gentle' | 'balanced' | 'ruthless')}
                    className={`p-2.5 rounded-2xl border text-left transition ${
                      intensity === item.id
                        ? 'bg-orange-500/15 border-orange-500 text-orange-300 shadow-md ring-1 ring-orange-500/30'
                        : 'bg-surface-200/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold text-slate-200">{item.label}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Persona Selection & Mode */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-slate-800/90 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                2. Studio Format & Panel Selection
              </h2>

              {/* Mode Toggle */}
              <div className="flex rounded-xl bg-surface-200 p-1 border border-slate-800">
                <button
                  onClick={() => setMode('single')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    mode === 'single'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> 1-on-1
                </button>
                <button
                  onClick={() => setMode('panel')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    mode === 'panel'
                      ? 'bg-orange-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Multi-Panel
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {mode === 'single'
                ? 'Select a single interviewer archetype for a deep, focused 1-on-1 cross-examination.'
                : 'Select 2 or more interviewers to form a dynamic live panel where they tag-team and debate each other.'}
            </p>

            {/* Persona Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {allPersonas.map((p) => {
                const isSelected =
                  mode === 'single'
                    ? primaryPersonaId === p.id
                    : panelPersonaIds.includes(p.id);

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (mode === 'single') {
                        setPrimaryPersonaId(p.id);
                      } else {
                        handleTogglePanelPersona(p.id);
                      }
                    }}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all duration-200 relative ${
                      isSelected
                        ? 'bg-surface-100 border-orange-500/90 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/30'
                        : 'bg-surface-200/70 border-slate-800/80 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-inner"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.display_name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-100 truncate">
                          {p.display_name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Voice: {p.voice_name}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-2">
                      {p.tagline}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate max-w-[150px]">
                        📝 {p.narrator_engine.format_title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validation Banner if missing key or topic */}
            {validationError && (
              <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                <p className="leading-snug">{validationError}</p>
                {validationError.includes('Settings') && (
                  <button
                    onClick={onOpenSettings}
                    className="px-2.5 py-1 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white font-semibold text-[11px] whitespace-nowrap transition"
                  >
                    Open Settings
                  </button>
                )}
              </div>
            )}

            {/* Launch Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                onClick={() => handleLaunch(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-400 hover:to-red-500 text-slate-950 font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-orange-500/25 transition-all transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
              >
                <Radio className="w-5 h-5 animate-pulse" />
                Step Into Live Voice Studio (Gemini Realtime Live)
              </button>

              <button
                onClick={() => handleLaunch(true)}
                className="w-full py-2.5 rounded-2xl bg-surface-100/90 hover:bg-surface-50 border border-slate-700/80 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
              >
                <Play className="w-3.5 h-3.5 text-orange-400" />
                Try Interactive Demo / Simulation Mode (No API Key Required)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>Real-time voice powered by Gemini Multimodal Live & Edge WebSockets</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Zero Server Cost • Cloudflare Ready</span>
        </div>
      </footer>
    </div>
  );
};
