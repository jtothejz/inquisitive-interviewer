import { describe, it, expect } from 'vitest';
import { INITIAL_PERSONAS } from '../data/personas';
import { SessionStorage, SavedInterviewSession } from '../types/session';

describe('Prompt Generation & Persona Output Format Validation', () => {
  it('should have distinct narrative styles across all personas', () => {
    const formatTitles = INITIAL_PERSONAS.map((p) => p.narrator_engine.format_title);
    const uniqueTitles = new Set(formatTitles);
    expect(uniqueTitles.size).toBe(INITIAL_PERSONAS.length);
  });

  it('each persona should specify active preferred attribution verbs', () => {
    for (const p of INITIAL_PERSONAS) {
      expect(p.narrator_engine.lexical_filters.preferred_verbs.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Gonzo persona should have signature staccato and visceral constraints', () => {
    const gonzo = INITIAL_PERSONAS.find((p) => p.id === 'gonzo_hunter')!;
    expect(gonzo.inquisitor_engine.pacing_constraints.emotional_temperature).toContain('Furious');
    expect(gonzo.narrator_engine.lexical_filters.banned_words).toContain('synergy');
    expect(gonzo.narrator_engine.lexical_filters.preferred_verbs).toContain('butcher');
  });

  it('Barbaro persona should enforce chronological baseline and micro-questions', () => {
    const barbaro = INITIAL_PERSONAS.find((p) => p.id === 'michael_barbaro')!;
    expect(barbaro.inquisitor_engine.hook_archetype).toContain('Chronological On-Ramp');
    expect(barbaro.narrator_engine.output_schema.some((s) => s.includes('THE DAILY'))).toBe(true);
  });

  it('Pogue persona should focus on relatable analogies and consumer skepticism', () => {
    const pogue = INITIAL_PERSONAS.find((p) => p.id === 'david_pogue')!;
    expect(pogue.inquisitor_engine.relational_stance).toContain('Strategic Naïf');
    expect(pogue.narrator_engine.format_title).toContain('CBS Sunday Morning');
  });
});

describe('Session Storage Management', () => {
  it('should save, retrieve, and delete interview sessions', () => {
    const mockSession: SavedInterviewSession = {
      id: 'test-session-123',
      title: 'Testing Storage',
      topic: 'Test Topic',
      createdAt: Date.now(),
      config: {
        mode: 'single',
        primaryPersonaId: 'gonzo_hunter',
        panelPersonaIds: ['gonzo_hunter'],
        topic: 'Test Topic',
        dossier: 'Test Dossier',
        intensity: 'ruthless',
        autoExtractNuggets: true,
      },
      turns: [
        {
          id: 'turn-1',
          speaker: 'Hunter S. Thompson',
          text: 'What is the real story?',
          timestamp: Date.now(),
          isFinal: true,
        },
      ],
      nuggets: [],
      drafts: [],
    };

    SessionStorage.save(mockSession);
    const sessions = SessionStorage.getAll();
    expect(sessions.some((s) => s.id === 'test-session-123')).toBe(true);

    SessionStorage.delete('test-session-123');
    const afterDelete = SessionStorage.getAll();
    expect(afterDelete.some((s) => s.id === 'test-session-123')).toBe(false);
  });
});

describe('Synthesis Service Engine & Fallback', () => {
  it('should generate simulated draft in Gonzo voice when API key is not present', async () => {
    const { SynthesisService } = await import('../services/synthesis-service');
    const service = new SynthesisService('');
    const gonzo = INITIAL_PERSONAS.find((p) => p.id === 'gonzo_hunter')!;
    const mockTranscript = [
      {
        id: '1',
        speaker: 'Hunter S. Thompson',
        text: 'Who is bleeding if this whole thing blows up?',
        timestamp: 1000,
        isFinal: true,
      },
      {
        id: '2',
        speaker: 'user',
        text: 'We burned $4M to rebuild from scratch on AI agents because the old architecture was dying.',
        timestamp: 2000,
        isFinal: true,
      },
    ];
    const mockNuggets = [
      {
        id: 'n-1',
        category: 'admission' as const,
        label: 'Burned $4M',
        quote: 'We burned $4M to rebuild from scratch on AI agents',
        context: 'Subject admitted destroying working business',
        timestamp: 2000,
        pinned: true,
      },
    ];

    const draft = await service.generateDraft(gonzo, mockTranscript, mockNuggets, 'Killing SaaS Product');

    expect(draft.personaId).toBe('gonzo_hunter');
    expect(draft.content).toContain('THE EDGE OF THE PRECIPICE');
    expect(draft.content).toContain('We burned $4M');
  });

  it('should generate simulated quotes deck when API key is not present', async () => {
    const { SynthesisService } = await import('../services/synthesis-service');
    const service = new SynthesisService('');
    const mockTranscript = [
      {
        id: '1',
        speaker: 'user',
        text: 'We took the hardest path.',
        timestamp: 1000,
        isFinal: true,
      },
    ];
    const mockNuggets = [
      {
        id: 'n-1',
        category: 'quote' as const,
        label: 'Hardest Path',
        quote: 'We took the hardest path.',
        context: 'Turning point',
        timestamp: 1000,
        pinned: true,
      },
    ];

    const quotesDraft = await service.generateQuotesDeck(mockTranscript, mockNuggets, 'Killing SaaS Product');

    expect(quotesDraft.personaId).toBe('quotes_curator');
    expect(quotesDraft.content).toContain('GOLDEN QUOTATIONS');
    expect(quotesDraft.content).toContain('We took the hardest path.');
  });
});
