export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';

export interface InquisitorEngine {
  relational_stance: string;
  ingestion_filter: string;
  hook_archetype: string;
  listening_vector: string;
  pushback_mechanic: string;
  pacing_constraints: {
    max_questions_per_turn: number;
    emotional_temperature: string;
    weaponized_brevity: boolean;
    banned_fillers: string[];
  };
}

export interface NarratorEngine {
  narrative_stance: string;
  sentence_cadence: string;
  lexical_filters: {
    banned_words: string[];
    preferred_verbs: string[];
  };
  output_schema: string[];
  format_title: string;
  format_description: string;
}

export interface Persona {
  id: string;
  display_name: string;
  tagline: string;
  avatar_url?: string;
  color: string;
  accent_border: string;
  voice_name: VoiceName;
  vocal_characteristics: string;
  inquisitor_engine: InquisitorEngine;
  narrator_engine: NarratorEngine;
  is_custom?: boolean;
}

export type InterviewMode = 'single' | 'panel';

export interface BriefingFact {
  metricOrFact: string;
  context: string;
  relevance: string;
  source?: string;
}

export interface BriefingPrecedent {
  analogyOrCase: string;
  lesson: string;
  applicationToGuest: string;
}

export interface BriefingLandmine {
  talkingPoint: string;
  underlyingTension: string;
  razorQuestion: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface InterviewBriefingBook {
  guestName?: string;
  guestTitleOrRole?: string;
  summaryAngle: string;
  hardDatapoints: BriefingFact[];
  historicalPrecedents: BriefingPrecedent[];
  vulnerabilitiesAndPRSpin: BriefingLandmine[];
  counterTheses: string[];
  originAndMotivationAngles?: string[];
  groundingSources?: GroundingSource[];
}

export interface InterviewConfig {
  mode: InterviewMode;
  primaryPersonaId: string;
  panelPersonaIds: string[];
  topic: string;
  dossier: string;
  guestName?: string;
  guestRole?: string;
  briefingBook?: InterviewBriefingBook;
  intensity: 'gentle' | 'balanced' | 'ruthless';
  interviewGoal?: 'thesis_discovery' | 'cross_examination';
  autoExtractNuggets: boolean;
}

export interface TranscriptTurn {
  id: string;
  speaker: 'user' | string; // 'user' or persona display_name / id
  text: string;
  timestamp: number;
  isFinal: boolean;
  nuggets?: JuicyNugget[];
}

export interface JuicyNugget {
  id: string;
  category: 'admission' | 'conflict' | 'quote' | 'turning_point' | 'metric';
  label: string;
  quote: string;
  context: string;
  timestamp: number;
  pinned?: boolean;
}

export interface SynthesizedDraft {
  formatId: string;
  personaId: string;
  formatTitle: string;
  formatDescription: string;
  content: string;
  createdAt: number;
}
