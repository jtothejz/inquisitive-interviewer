import React, { useEffect, useRef, useState } from 'react';
import { Persona, InterviewConfig, TranscriptTurn, JuicyNugget } from '../types/persona';
import { AudioVisualizer } from './AudioVisualizer';
import { SteeringDock } from './SteeringDock';
import { NuggetSidebar } from './NuggetSidebar';
import { Mic, MicOff, PhoneOff, Radio, Volume2, Sparkles, MessageSquare, FileText } from 'lucide-react';

interface LiveRoomProps {
  config: InterviewConfig;
  allPersonas: Persona[];
  turns: TranscriptTurn[];
  nuggets: JuicyNugget[];
  activeSpeakerId: string | 'user' | null;
  inputLevel: number;
  outputLevel: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
  onSendDirective: (directive: string) => void;
  onSendTextAnswer: (text: string) => void;
  onTogglePinNugget: (id: string) => void;
  onEndInterview: () => void;
  onToggleMute?: (muted: boolean) => void;
}

export const LiveRoom: React.FC<LiveRoomProps> = ({
  config,
  allPersonas,
  turns,
  nuggets,
  activeSpeakerId,
  inputLevel,
  outputLevel,
  connectionStatus,
  errorMessage,
  onSendDirective,
  onSendTextAnswer,
  onTogglePinNugget,
  onEndInterview,
  onToggleMute,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isNuggetOpen, setIsNuggetOpen] = useState(false);
  const [intelTab, setIntelTab] = useState<'nuggets' | 'dossier'>('nuggets');
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    onToggleMute?.(nextMuted);
  };

  const activePersonas =
    config.mode === 'single'
      ? allPersonas.filter((p) => p.id === config.primaryPersonaId)
      : allPersonas.filter((p) => config.panelPersonaIds.includes(p.id));

  const currentActivePersona = allPersonas.find((p) => p.id === activeSpeakerId);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  return (
    <div className="relative min-h-screen bg-background flex flex-col justify-between overflow-hidden">
      {/* Background ambient lighting */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[140px] opacity-25 pointer-events-none transition-all duration-700"
        style={{
          backgroundColor: currentActivePersona?.color || '#f97316',
        }}
      />

      {/* Top Header Bar */}
      <header className="relative z-20 border-b border-slate-800/80 bg-surface-200/80 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
              <Radio className="w-3 h-3" /> ON AIR
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[180px] sm:max-w-md">
              {config.topic}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {config.mode === 'panel' ? 'Collaborative Multi-Interviewer Panel' : `1-on-1 with ${activePersonas[0]?.display_name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {connectionStatus === 'connected' ? (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live Stream
            </span>
          ) : (
            <span className="text-[11px] text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> {connectionStatus}...
            </span>
          )}

          <button
            onClick={onEndInterview}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-xs shadow-lg transition"
          >
            <PhoneOff className="w-3.5 h-3.5" /> End & Synthesize
          </button>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col justify-between overflow-hidden">
        {/* Panelist Cards Row */}
        <div className="flex items-center justify-center gap-4 py-2 flex-wrap">
          {activePersonas.map((p) => {
            const isSpeaking = activeSpeakerId === p.id || (config.mode === 'single' && outputLevel > 0.05);
            return (
              <div
                key={p.id}
                className={`relative px-4 py-2.5 rounded-2xl glass-panel border transition-all duration-300 flex items-center gap-3 ${
                  isSpeaking
                    ? 'border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.35)] scale-105'
                    : 'border-slate-800 opacity-80'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-inner relative"
                  style={{ backgroundColor: p.color }}
                >
                  {p.display_name.split(' ').map((n) => n[0]).join('')}
                  {isSpeaking && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-slate-900 animate-pulse" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    {p.display_name}
                    {isSpeaking && (
                      <Volume2 className="w-3.5 h-3.5 text-orange-400 animate-bounce" />
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 max-w-[170px]">
                    {p.inquisitor_engine.relational_stance.split('(')[0]}
                  </p>
                </div>
              </div>
            );
          })}

          {/* User Badge */}
          <div
            className={`px-4 py-2.5 rounded-2xl glass-panel border transition-all duration-300 flex items-center gap-3 ${
              activeSpeakerId === 'user' || inputLevel > 0.1
                ? 'border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.35)] scale-105'
                : 'border-slate-800 opacity-80'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-sm text-white shadow-inner">
              YOU
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Subject (Guest)</h4>
              <p className="text-[10px] text-slate-400">Microphone Audio</p>
            </div>
          </div>
        </div>

        {/* Central Audio Waveform */}
        <div className="my-1">
          <AudioVisualizer
            inputLevel={inputLevel}
            outputLevel={outputLevel}
            activeSpeaker={activeSpeakerId}
            activeColor={currentActivePersona?.color || '#f97316'}
            isRecording={!isMuted}
            isPlaying={outputLevel > 0.05}
          />
        </div>

        {/* Live Mic Status Indicator */}
        <div className="flex items-center justify-center -mt-1 mb-1">
          {activeSpeakerId ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Panelist Speaking — Mic Paused (Echo Prevention)
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Studio Mic Active — Listening for your voice...
            </div>
          )}
        </div>

        {/* Live Scrolling Transcript Feed */}
        <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto glass-panel rounded-2xl p-4 my-2 space-y-3.5 border border-slate-800/80 shadow-inner">
          {turns.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-8 space-y-3">
              <MessageSquare className="w-8 h-8 text-orange-400 mb-1 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-slate-200">The studio is live on air.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Connecting to Gemini Realtime voice stream... You can speak into your microphone or click below to prompt the opening question.
                </p>
              </div>
              <button
                onClick={() => onSendDirective('Start the interview right now with your opening question.')}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-xs text-slate-950 shadow-md transition active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" /> Prompt Opening Question
              </button>
            </div>
          ) : (
            turns
              .filter((t) => t.text && t.text.trim().length > 0)
              .map((turn) => {
                const isUser = turn.speaker === 'user';
                const matchingPersona = allPersonas.find(
                  (p: Persona) =>
                    p.display_name.toLowerCase() === turn.speaker.toLowerCase() ||
                    p.id.toLowerCase() === turn.speaker.toLowerCase()
                );
                const speakerColor = isUser ? '#60a5fa' : matchingPersona?.color || '#f97316';

                return (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span
                        style={{ color: speakerColor }}
                        className="text-[11px] font-bold tracking-wide uppercase"
                      >
                        {turn.speaker}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(turn.timestamp).toLocaleTimeString([], {
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-sm'
                          : 'bg-surface-100/90 border border-slate-700/60 text-slate-200 rounded-tl-sm'
                      }`}
                    >
                      {turn.text}
                    </div>
                  </div>
                );
              })
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs px-4 py-2 rounded-xl my-2 text-center">
            {errorMessage}
          </div>
        )}

        {/* Live Steering Dock */}
        <div className="mt-2">
          <SteeringDock
            mode={config.mode}
            panelPersonas={activePersonas}
            activeSpeakerId={activeSpeakerId}
            onSendDirective={onSendDirective}
            onSendTextAnswer={onSendTextAnswer}
          />
        </div>
      </main>

      {/* Bottom Floating Mic / Audio Bar */}
      <footer className="relative z-20 px-6 py-3 border-t border-slate-800/80 bg-surface-200/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-surface-100 text-slate-200 border-slate-700 hover:bg-surface-50'
            }`}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-blue-400" />}
            {isMuted ? 'Muted' : 'Mic Active'}
          </button>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Speak naturally or interrupt anytime.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {config.briefingBook && (
            <button
              onClick={() => {
                setIntelTab('dossier');
                setIsNuggetOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
              title="View Interviewer's Secret Prep Sheet"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Prep Dossier</span>
              <span className="sm:hidden">Dossier</span>
            </button>
          )}

          <button
            onClick={() => {
              setIntelTab('nuggets');
              setIsNuggetOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nuggets ({nuggets.length})</span>
          </button>
        </div>
      </footer>

      {/* Real-time Intel & Nuggets Sidebar */}
      <NuggetSidebar
        nuggets={nuggets}
        onTogglePin={onTogglePinNugget}
        isOpen={isNuggetOpen}
        onToggleOpen={() => setIsNuggetOpen(!isNuggetOpen)}
        briefingBook={config.briefingBook}
        initialTab={intelTab}
      />
    </div>
  );
};
