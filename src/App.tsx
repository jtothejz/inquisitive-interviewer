import React, { useState, useEffect, useRef } from 'react';
import { Persona, InterviewConfig, TranscriptTurn, JuicyNugget, SynthesizedDraft } from './types/persona';
import { SavedInterviewSession, SessionStorage } from './types/session';
import { INITIAL_PERSONAS } from './data/personas';
import { SetupModal } from './components/SetupModal';
import { LiveRoom } from './components/LiveRoom';
import { SynthesisStudio } from './components/SynthesisStudio';
import { CustomPersonaModal } from './components/CustomPersonaModal';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { GeminiLiveService } from './services/gemini-live';
import { NuggetExtractorService } from './services/nugget-extractor';
import { SimulationService } from './services/simulation-service';
import { GeminiRestVoiceService } from './services/gemini-rest-voice';

export const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  });

  const [liveModel, setLiveModel] = useState<string>(() => {
    const stored = localStorage.getItem('gemini_live_model');
    if (stored && (stored.includes('gemini-3.') || stored.includes('gemini-2.5') || stored.includes('gemini-3.5'))) {
      localStorage.setItem('gemini_live_model', 'models/gemini-2.0-flash-exp');
      return 'models/gemini-2.0-flash-exp';
    }
    return stored || 'models/gemini-2.0-flash-exp';
  });

  const [allPersonas, setAllPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem('custom_personas');
    if (saved) {
      try {
        const custom = JSON.parse(saved);
        return [...INITIAL_PERSONAS, ...custom];
      } catch {
        return INITIAL_PERSONAS;
      }
    }
    return INITIAL_PERSONAS;
  });

  const [sessions, setSessions] = useState<SavedInterviewSession[]>(() => SessionStorage.getAll());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<'setup' | 'live' | 'synthesis'>('setup');
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig | null>(null);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);

  // Live session states
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [nuggets, setNuggets] = useState<JuicyNugget[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | 'user' | null>(null);
  const [inputLevel, setInputLevel] = useState<number>(0);
  const [outputLevel, setOutputLevel] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const simServiceRef = useRef<SimulationService | null>(null);
  const nuggetExtractorRef = useRef<NuggetExtractorService | null>(null);
  const restVoiceRef = useRef<GeminiRestVoiceService | null>(null);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    if (liveModel) {
      localStorage.setItem('gemini_live_model', liveModel);
    }
  }, [liveModel]);

  const isLiveSessionActiveRef = useRef<boolean>(false);

  const handleStartInterview = async (config: InterviewConfig, isSimulation: boolean = false) => {
    setInterviewConfig(config);
    setTurns([]);
    setNuggets([]);
    setErrorMessage(null);
    setIsSimulationMode(isSimulation);
    const newSessionId = `session-${Date.now()}`;
    setCurrentSessionId(newSessionId);
    isLiveSessionActiveRef.current = true;
    setActiveView('live');

    if (isSimulation) {
      const sim = new SimulationService({
        onStatusChange: (status) => setConnectionStatus(status),
        onActiveSpeakerChange: (speakerId) => setActiveSpeakerId(speakerId),
        onTranscriptUpdate: (updatedTurns) => setTurns(updatedTurns),
        onNewNugget: (newNugget) => setNuggets((prev) => [...prev, newNugget]),
        onAudioLevel: (level) => setOutputLevel(level),
      });
      simServiceRef.current = sim;
      sim.start(config, allPersonas, apiKey);
    } else {
      nuggetExtractorRef.current = new NuggetExtractorService(apiKey, (newNuggets) => {
        setNuggets(newNuggets);
      });

      const liveService = new GeminiLiveService({
        onStatusChange: (status) => {
          setConnectionStatus(status);
        },
        onActiveSpeakerChange: (speakerId) => setActiveSpeakerId(speakerId),
        onTranscriptUpdate: (updatedTurns) => {
          setTurns(updatedTurns);
          if (config.autoExtractNuggets && nuggetExtractorRef.current) {
            nuggetExtractorRef.current.analyzeRecentTurns(updatedTurns);
          }
        },
        onError: (err) => {
          console.warn('[GeminiLive Error]', err);
          setErrorMessage(err);
        },
        onInputLevel: (level) => setInputLevel(level),
        onOutputLevel: (level) => setOutputLevel(level),
      });

      liveServiceRef.current = liveService;
      try {
        await liveService.startSession(apiKey, config, allPersonas, liveModel);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[GeminiLive start failed]', e);
        setErrorMessage(`Live Voice Studio failed: ${msg}`);
        setConnectionStatus('error');
      }
    }
  };

  const handleSendDirective = (directive: string) => {
    if (isSimulationMode) {
      simServiceRef.current?.handleUserMessage(`[DIRECTOR NOTE]: ${directive}`, interviewConfig!, allPersonas);
    } else if (restVoiceRef.current) {
      restVoiceRef.current.handleUserAnswer(`[DIRECTOR NOTE]: ${directive}`, interviewConfig!, allPersonas);
    } else {
      liveServiceRef.current?.sendSteeringDirective(directive);
    }
  };

  const handleSendTextAnswer = (text: string) => {
    if (isSimulationMode) {
      simServiceRef.current?.handleUserMessage(text, interviewConfig!, allPersonas);
    } else if (restVoiceRef.current) {
      restVoiceRef.current.handleUserAnswer(text, interviewConfig!, allPersonas);
    } else {
      liveServiceRef.current?.sendUserTextMessage(text);
    }
  };

  const handleTogglePinNugget = (id: string) => {
    setNuggets((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const handleEndInterview = () => {
    isLiveSessionActiveRef.current = false;
    let finalTurns = turns;
    if (isSimulationMode && simServiceRef.current) {
      finalTurns = simServiceRef.current.stop();
      setTurns(finalTurns);
    } else if (restVoiceRef.current) {
      finalTurns = restVoiceRef.current.stop();
      setTurns(finalTurns);
    } else if (liveServiceRef.current) {
      finalTurns = liveServiceRef.current.endSession();
      setTurns(finalTurns);
    }

    if (interviewConfig && currentSessionId) {
      const newSession: SavedInterviewSession = {
        id: currentSessionId,
        title: interviewConfig.topic,
        topic: interviewConfig.topic,
        createdAt: Date.now(),
        config: interviewConfig,
        turns: finalTurns,
        nuggets: nuggets,
        drafts: [],
        briefingBook: interviewConfig.briefingBook,
      };
      SessionStorage.save(newSession);
      setSessions(SessionStorage.getAll());
    }

    setActiveView('synthesis');
  };

  const handleSaveDraftsToSession = (drafts: SynthesizedDraft[]) => {
    if (currentSessionId && interviewConfig) {
      const allSaved = SessionStorage.getAll();
      const existing = allSaved.find((s) => s.id === currentSessionId);
      if (existing) {
        const updated: SavedInterviewSession = {
          ...existing,
          drafts,
        };
        SessionStorage.save(updated);
        setSessions(SessionStorage.getAll());
      }
    }
  };

  const handleSelectHistorySession = (session: SavedInterviewSession) => {
    isLiveSessionActiveRef.current = false;
    setInterviewConfig(session.config);
    setTurns(session.turns);
    setNuggets(session.nuggets);
    setCurrentSessionId(session.id);
    setActiveView('synthesis');
  };

  const handleDeleteHistorySession = (id: string) => {
    SessionStorage.delete(id);
    setSessions(SessionStorage.getAll());
  };

  const handleSaveCustomPersona = (persona: Persona) => {
    setAllPersonas((prev) => {
      const updated = [...prev, persona];
      const customOnly = updated.filter((p) => p.is_custom);
      localStorage.setItem('custom_personas', JSON.stringify(customOnly));
      return updated;
    });
  };

  const handleToggleMute = (muted: boolean) => {
    if (restVoiceRef.current) {
      restVoiceRef.current.setMuted(muted);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {activeView === 'setup' && (
        <SetupModal
          allPersonas={allPersonas}
          onStartInterview={handleStartInterview}
          onOpenCustomPersona={() => setIsCustomModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          apiKey={apiKey}
          hasHistory={sessions.length > 0}
        />
      )}

      {activeView === 'live' && interviewConfig && (
        <LiveRoom
          config={interviewConfig}
          allPersonas={allPersonas}
          turns={turns}
          nuggets={nuggets}
          activeSpeakerId={activeSpeakerId}
          inputLevel={inputLevel}
          outputLevel={outputLevel}
          connectionStatus={connectionStatus}
          errorMessage={errorMessage}
          onSendDirective={handleSendDirective}
          onSendTextAnswer={handleSendTextAnswer}
          onTogglePinNugget={handleTogglePinNugget}
          onEndInterview={handleEndInterview}
          onToggleMute={handleToggleMute}
        />
      )}

      {activeView === 'synthesis' && interviewConfig && (
        <SynthesisStudio
          apiKey={apiKey}
          topic={interviewConfig.topic}
          transcript={turns}
          nuggets={nuggets}
          allPersonas={allPersonas}
          initialDrafts={sessions.find((s) => s.id === currentSessionId)?.drafts || []}
          briefingBook={interviewConfig.briefingBook}
          onStartNewSession={() => setActiveView('setup')}
          onSaveDraftsToSession={handleSaveDraftsToSession}
        />
      )}

      <CustomPersonaModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSavePersona={handleSaveCustomPersona}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={(key) => setApiKey(key)}
        liveModel={liveModel}
        onSaveLiveModel={(model) => setLiveModel(model)}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        sessions={sessions}
        onSelectSession={handleSelectHistorySession}
        onDeleteSession={handleDeleteHistorySession}
      />
    </div>
  );
};
export default App;
