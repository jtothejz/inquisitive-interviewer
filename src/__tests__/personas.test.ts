import { describe, it, expect } from 'vitest';
import { INITIAL_PERSONAS, SAMPLE_DOSSIERS } from '../data/personas';

describe('Personas Library & Specification Integrity', () => {
  it('should contain all 6 iconic interviewers', () => {
    const ids = INITIAL_PERSONAS.map((p) => p.id);
    expect(ids).toContain('gonzo_hunter');
    expect(ids).toContain('michael_barbaro');
    expect(ids).toContain('audie_cornish');
    expect(ids).toContain('david_pogue');
    expect(ids).toContain('kara_swisher');
    expect(ids).toContain('terry_gross');
    expect(INITIAL_PERSONAS.length).toBeGreaterThanOrEqual(6);
  });

  it('each persona should have complete Inquisitor Engine specifications', () => {
    for (const persona of INITIAL_PERSONAS) {
      const inq = persona.inquisitor_engine;
      expect(inq.relational_stance).toBeTruthy();
      expect(inq.ingestion_filter).toBeTruthy();
      expect(inq.hook_archetype).toBeTruthy();
      expect(inq.listening_vector).toBeTruthy();
      expect(inq.pushback_mechanic).toBeTruthy();
      expect(inq.pacing_constraints.max_questions_per_turn).toBe(1);
      expect(inq.pacing_constraints.banned_fillers.length).toBeGreaterThan(0);
    }
  });

  it('each persona should have complete Narrator Engine specifications', () => {
    for (const persona of INITIAL_PERSONAS) {
      const nar = persona.narrator_engine;
      expect(nar.narrative_stance).toBeTruthy();
      expect(nar.sentence_cadence).toBeTruthy();
      expect(nar.format_title).toBeTruthy();
      expect(nar.format_description).toBeTruthy();
      expect(nar.output_schema.length).toBeGreaterThan(0);
      expect(nar.lexical_filters.banned_words.length).toBeGreaterThan(0);
      expect(nar.lexical_filters.preferred_verbs.length).toBeGreaterThan(0);
    }
  });

  it('sample dossiers should contain realistic business and technical conflicts', () => {
    expect(SAMPLE_DOSSIERS.length).toBeGreaterThanOrEqual(3);
    for (const sample of SAMPLE_DOSSIERS) {
      expect(sample.title).toBeTruthy();
      expect(sample.topic).toBeTruthy();
      expect(sample.dossier).toContain('Core');
    }
  });
});
