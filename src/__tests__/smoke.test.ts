import { describe, it, expect } from 'vitest';
import { INITIAL_PERSONAS, SAMPLE_DOSSIERS } from '../data/personas';
import { SessionStorage, SavedInterviewSession } from '../types/session';
import { SynthesisService } from '../services/synthesis-service';
import { NuggetExtractorService } from '../services/nugget-extractor';
import { TranscriptTurn, JuicyNugget } from '../types/persona';

describe('Anti-Slop Smoke Test Suite: Critical User Journeys & State Machines', () => {
  const mockTranscript: TranscriptTurn[] = [
    {
      id: 'turn-1',
      speaker: 'David Pogue',
      text: 'Hold the phone! I have heard two completely different versions of this—some say it was genius, others say it was total panic. Where is the actual truth?',
      timestamp: Date.now() - 5000,
      isFinal: true,
    },
    {
      id: 'turn-2',
      speaker: 'user',
      text: 'The truth is our ARR hit a ceiling and the legacy database was burning $200k a month in maintenance. We made the call to kill it.',
      timestamp: Date.now() - 4000,
      isFinal: true,
    },
    {
      id: 'turn-3',
      speaker: 'Kara Swisher',
      text: 'Let us cut through the press release. Who actually made money on that decision, and why were your investors furious?',
      timestamp: Date.now() - 3000,
      isFinal: true,
    },
    {
      id: 'turn-4',
      speaker: 'user',
      text: 'Two of our seed investors threatened to sue, but we bought back their equity at a 1.2x multiple.',
      timestamp: Date.now() - 2000,
      isFinal: true,
    },
  ];

  const mockNuggets: JuicyNugget[] = [
    {
      id: 'nugget-1',
      category: 'admission',
      label: 'Legacy DB Cost',
      quote: 'The legacy database was burning $200k a month in maintenance.',
      context: 'Subject revealed the hidden burn driving the product sunset.',
      timestamp: Date.now() - 3900,
      pinned: true,
    },
    {
      id: 'nugget-2',
      category: 'conflict',
      label: 'Investor Threat',
      quote: 'Two of our seed investors threatened to sue, but we bought back their equity.',
      context: 'Early backers attempted legal revolt over product kill.',
      timestamp: Date.now() - 1900,
      pinned: true,
    },
  ];

  it('verifies all 6 iconic persona definitions have required engines and constraints', () => {
    expect(INITIAL_PERSONAS.length).toBeGreaterThanOrEqual(6);
    const expectedIds = [
      'gonzo_hunter',
      'michael_barbaro',
      'audie_cornish',
      'david_pogue',
      'kara_swisher',
      'terry_gross',
    ];

    for (const id of expectedIds) {
      const persona = INITIAL_PERSONAS.find((p) => p.id === id);
      expect(persona, `Missing persona: ${id}`).toBeDefined();
      expect(persona!.inquisitor_engine.pacing_constraints.max_questions_per_turn).toBe(1);
      expect(persona!.inquisitor_engine.pacing_constraints.banned_fillers.length).toBeGreaterThan(0);
      expect(persona!.narrator_engine.output_schema.length).toBeGreaterThan(0);
      expect(persona!.narrator_engine.lexical_filters.banned_words.length).toBeGreaterThan(0);
    }
  });

  it('verifies sample dossiers provide rich tension blocks', () => {
    expect(SAMPLE_DOSSIERS.length).toBeGreaterThanOrEqual(3);
    SAMPLE_DOSSIERS.forEach((sample) => {
      expect(sample.topic.length).toBeGreaterThan(10);
      expect(sample.dossier.length).toBeGreaterThan(20);
    });
  });

  it('synthesizes story drafts across each persona without crashing in offline fallback', async () => {
    const service = new SynthesisService(''); // Offline fallback mode

    for (const persona of INITIAL_PERSONAS) {
      const draft = await service.generateDraft(
        persona,
        mockTranscript,
        mockNuggets,
        'Killing SaaS Product'
      );
      expect(draft.formatId).toBeDefined();
      expect(draft.personaId).toBe(persona.id);
      expect(draft.content.length).toBeGreaterThan(50);
      expect(draft.content).toContain('Killing SaaS Product');
    }
  });

  it('synthesizes Golden Quotes Deck with verbatim nuggets', async () => {
    const service = new SynthesisService('');
    const quotesDraft = await service.generateQuotesDeck(
      mockTranscript,
      mockNuggets,
      'Killing SaaS Product'
    );
    expect(quotesDraft.personaId).toBe('quotes_curator');
    expect(quotesDraft.content).toContain('GOLDEN QUOTATIONS');
    expect(quotesDraft.content).toContain('The legacy database was burning $200k a month in maintenance.');
  });

  it('persists and hydrates interview sessions in SessionStorage with zero state corruption', () => {
    const testSessionId = `smoke-test-${Date.now()}`;
    const testSession: SavedInterviewSession = {
      id: testSessionId,
      title: 'Smoke Test Session',
      topic: 'Smoke Test Topic',
      createdAt: Date.now(),
      config: {
        mode: 'panel',
        primaryPersonaId: 'david_pogue',
        panelPersonaIds: ['david_pogue', 'kara_swisher'],
        topic: 'Smoke Test Topic',
        dossier: 'Test dossier content',
        intensity: 'balanced',
        autoExtractNuggets: true,
      },
      turns: mockTranscript,
      nuggets: mockNuggets,
      drafts: [],
    };

    SessionStorage.save(testSession);
    let all = SessionStorage.getAll();
    const retrieved = all.find((s) => s.id === testSessionId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.topic).toBe('Smoke Test Topic');
    expect(retrieved!.turns.length).toBe(mockTranscript.length);

    // Update drafts
    const updatedWithDrafts: SavedInterviewSession = {
      ...retrieved!,
      drafts: [
        {
          formatId: 'draft-1',
          personaId: 'david_pogue',
          formatTitle: 'Pogue Explainer',
          formatDescription: 'Test Description',
          content: '# The Great Turnaround',
          createdAt: Date.now(),
        },
      ],
    };
    SessionStorage.save(updatedWithDrafts);

    all = SessionStorage.getAll();
    const hydrated = all.find((s) => s.id === testSessionId);
    expect(hydrated!.drafts.length).toBe(1);
    expect(hydrated!.drafts[0].formatTitle).toBe('Pogue Explainer');

    // Clean up
    SessionStorage.delete(testSessionId);
    all = SessionStorage.getAll();
    expect(all.some((s) => s.id === testSessionId)).toBe(false);
  });

  it('handles nugget extractor service lifecycle and resets gracefully', () => {
    let capturedNuggets: JuicyNugget[] = [];
    const extractor = new NuggetExtractorService('', (nuggets) => {
      capturedNuggets = nuggets;
    });

    expect(extractor.getNuggets()).toEqual([]);
    extractor.reset();
    expect(extractor.getNuggets()).toEqual([]);
    expect(capturedNuggets).toEqual([]);
  });

  it('SimulationService adapts opening hooks and follow-ups based on interviewGoal', async () => {
    const { SimulationService } = await import('../services/simulation-service');
    const sim = new SimulationService({
      onStatusChange: () => {},
      onActiveSpeakerChange: () => {},
      onTranscriptUpdate: () => {},
      onNewNugget: () => {},
      onAudioLevel: () => {},
    });

    const barbaro = INITIAL_PERSONAS.find((p) => p.id === 'michael_barbaro')!;
    const hunter = INITIAL_PERSONAS.find((p) => p.id === 'gonzo_hunter')!;
    const topic = 'Why AI is not the best choice for repeated automations';

    // In thesis_discovery mode (default): Barbaro opens with Day One genesis & history
    const barbaroThesisHook = (sim as any).getOpeningHook(barbaro, topic, '', undefined, 'thesis_discovery');
    expect(barbaroThesisHook).toContain('day one');
    expect(barbaroThesisHook).toContain('What inspired this thinking?');

    // In thesis_discovery mode: Hunter asks about the trenches and the project
    const hunterThesisHook = (sim as any).getOpeningHook(hunter, topic, '', undefined, 'thesis_discovery');
    expect(hunterThesisHook).toContain('in the trenches');
    expect(hunterThesisHook).toContain('What were you actually trying to build');

    // In cross_examination mode: Hunter fires razor attack
    const hunterCrossHook = (sim as any).getOpeningHook(hunter, topic, '', undefined, 'cross_examination');
    expect(hunterCrossHook).toContain('Cut the boardroom script');

    // Test follow-up phase progression
    const turn1FollowUp = (sim as any).generateFollowUp(barbaro, 'We tried to automate customer refunds with LLMs', false, [], 1, 'thesis_discovery');
    expect(turn1FollowUp).toContain('initial hope');

    const turn5FollowUp = (sim as any).generateFollowUp(barbaro, 'The LLM hallucinated wrong refund amounts', false, [], 5, 'thesis_discovery');
    expect(turn5FollowUp).toContain('Critics reading your article');
  });

  it('GeminiNeuralTTS generates valid WAV headers from raw PCM', async () => {
    const { GeminiNeuralTTS } = await import('../audio/gemini-neural-tts');
    const tts = new GeminiNeuralTTS('test-key');

    // Test PCM to WAV header wrapper
    const dummyPcm = new Uint8Array(48000); // 1 second of 24kHz 16-bit mono
    const wavBuffer = (tts as any).wrapPcmWithWavHeader(dummyPcm, 24000, 1);
    expect(wavBuffer.byteLength).toBe(48000 + 44);

    const view = new DataView(wavBuffer);
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(riff).toBe('RIFF');

    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(wave).toBe('WAVE');

    // Sample rate check (24000)
    expect(view.getUint32(24, true)).toBe(24000);
  });

  it('GeminiLiveService builds valid system prompt and exposes isOpen status', async () => {
    const { GeminiLiveService } = await import('../services/gemini-live');
    const service = new GeminiLiveService({
      onStatusChange: () => {},
      onActiveSpeakerChange: () => {},
      onTranscriptUpdate: () => {},
      onError: () => {},
      onInputLevel: () => {},
      onOutputLevel: () => {},
    });

    (service as any).config = {
      mode: 'single',
      primaryPersonaId: 'gonzo_hunter',
      panelPersonaIds: ['gonzo_hunter'],
      topic: 'Why LLMs are overused for automations',
      dossier: '',
      intensity: 'balanced',
      interviewGoal: 'thesis_discovery',
      autoExtractNuggets: true,
    };
    (service as any).allPersonas = INITIAL_PERSONAS;

    const { prompt, voiceName } = (service as any).buildSystemPrompt();
    expect(voiceName).toBe('Fenrir');
    expect(prompt).toContain('Hunter S. Thompson');
    expect(prompt).toContain('PHASE 1: GENESIS');
    expect(service.isOpen()).toBe(false);
  });
});
