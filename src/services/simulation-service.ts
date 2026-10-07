import { Persona, InterviewConfig, TranscriptTurn, JuicyNugget } from '../types/persona';
import { GeminiNeuralTTS } from '../audio/gemini-neural-tts';

export interface SimulationCallbacks {
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  onActiveSpeakerChange: (speakerId: string | 'user' | null) => void;
  onTranscriptUpdate: (turns: TranscriptTurn[]) => void;
  onNewNugget: (nugget: JuicyNugget) => void;
  onAudioLevel: (level: number) => void;
}

export class SimulationService {
  private isRunning = false;
  private turns: TranscriptTurn[] = [];
  private currentTurnIndex = 0;
  private timer: number | null = null;
  private animInterval: number | null = null;
  private neuralTTS: GeminiNeuralTTS | null = null;
  private apiKey = '';

  constructor(private callbacks: SimulationCallbacks) {}

  public start(config: InterviewConfig, personas: Persona[], apiKey?: string): void {
    this.isRunning = true;
    this.turns = [];
    this.currentTurnIndex = 0;
    this.apiKey = apiKey || '';
    if (this.apiKey) {
      this.neuralTTS = new GeminiNeuralTTS(this.apiKey);
    }
    this.callbacks.onStatusChange('connecting');

    setTimeout(() => {
      if (!this.isRunning) return;
      this.callbacks.onStatusChange('connected');

      const isPanel = config.mode === 'panel';
      const activePersonas = isPanel
        ? personas.filter((p) => config.panelPersonaIds.includes(p.id))
        : personas.filter((p) => p.id === config.primaryPersonaId);

      const firstSpeaker = activePersonas[0] || personas[0];

      // Opening hook based on persona
      const openingQuestion = this.getOpeningHook(
        firstSpeaker,
        config.topic,
        config.dossier,
        config.briefingBook,
        config.interviewGoal
      );
      this.playQueuedTurns([{ speakerPersona: firstSpeaker, text: openingQuestion }]);
    }, 400);
  }

  private getOpeningHook(
    persona: Persona,
    topic: string,
    _dossier: string,
    briefingBook?: import('../types/persona').InterviewBriefingBook,
    interviewGoal?: 'thesis_discovery' | 'cross_examination'
  ): string {
    const isThesisDiscovery = interviewGoal !== 'cross_examination';
    const fact = briefingBook?.hardDatapoints?.[0]?.metricOrFact;
    const razor = briefingBook?.vulnerabilitiesAndPRSpin?.[0]?.razorQuestion;
    const precedent = briefingBook?.historicalPrecedents?.[0]?.analogyOrCase;

    if (isThesisDiscovery) {
      if (persona.id === 'gonzo_hunter') {
        return `Cut through the academic pitch for "${topic}". Take me back to the exact project where you were in the trenches, looking at the screen, and realized the hype was a lie. What were you actually trying to build when you hit that wall?`;
      } else if (persona.id === 'michael_barbaro') {
        return `Hm. Before we get into the debate around "${topic}"... take me back to day one. Was there a specific project or moment where you realized the conventional approach just wasn't working? What inspired this thinking?`;
      } else if (persona.id === 'kara_swisher') {
        return `Let's skip the tech-keynote spin on "${topic}". You didn't just wake up with this conclusion. What project were you working on that made you say, 'Wait, this is completely the wrong tool for the job'?`;
      } else if (persona.id === 'david_pogue') {
        return `Hold the phone! You're taking on a huge assumption here with "${topic}". But walk me back to the start—was there a specific project, a late-night coding session, or a facepalm moment that sparked this whole line of thinking?`;
      } else if (persona.id === 'audie_cornish') {
        return `Help me understand the evolution of your thinking on "${topic}". In an era where everyone reaches for the same playbook, what was the formative project or turning point that motivated you to take this stance?`;
      } else if (persona.id === 'terry_gross') {
        return `When you look back at how this conviction formed around "${topic}", what was the early project or personal doubt that made you step back and say, 'We need to rethink how we do this'?`;
      } else {
        return `Walk me back to where this conviction on "${topic}" actually started. What was the specific project or moment that catalyzed this realization for you?`;
      }
    }

    // Direct cross-examination mode
    if (persona.id === 'gonzo_hunter') {
      if (razor) {
        return `Cut the corporate brochure. Our homework shows ${fact || 'the numbers leaking'}. ${razor}`;
      }
      return `Cut the boardroom script and tell me the unvarnished truth. In "${topic}", who had their back against the wall when the numbers started leaking, and why was the board terrified?`;
    } else if (persona.id === 'michael_barbaro') {
      if (fact) {
        return `Hm. Before we get into the crisis... our reporting notes you were managing ${fact}. Take me back to the moment you realized that wasn't going to hold.`;
      }
      return `Hm. Before we get into the crisis... take me back to day one. When you first set out to build this, what was the quiet assumption that made you think nobody else could solve it?`;
    } else if (persona.id === 'kara_swisher') {
      if (razor) {
        return `Let's cut through the spin. We pulled your numbers: ${fact || 'the record tells a very different story'}. ${razor}`;
      }
      return `Let's cut through the press release on "${topic}". Who was sitting across the table when the decision was made, and who actually had the most to lose?`;
    } else if (persona.id === 'david_pogue') {
      if (precedent && fact) {
        return `Hold the phone! Looking at this like ${precedent}, you had ${fact}! For the folks at home, was this pure genius or a near-fatal panic?`;
      }
      return `Hold the phone! I've heard two completely different versions of this story—some say it was pure genius, others say it was a near-fatal panic. Where is the actual truth?`;
    } else if (persona.id === 'audie_cornish') {
      if (briefingBook?.vulnerabilitiesAndPRSpin?.[0]) {
        return `Help me understand the calculus here. Publicly you stated "${briefingBook.vulnerabilitiesAndPRSpin[0].talkingPoint}", but behind the scenes: ${briefingBook.vulnerabilitiesAndPRSpin[0].underlyingTension}. Who bore the brunt of that trade-off?`;
      }
      return `Help me understand the calculus here. You were operating under intense pressure—what was the trade-off you knew you were making that nobody wanted to talk about?`;
    } else if (persona.id === 'terry_gross') {
      return `When you were sitting with that decision in the middle of the night, what was the private doubt that made you want to tear up the plan and start over?`;
    } else {
      return `Looking back at this moment in "${topic}", what was the core turning point that changed how you view this entire problem?`;
    }
  }

  public handleUserMessage(
    userText: string,
    config: InterviewConfig,
    personas: Persona[]
  ): void {
    if (!this.isRunning) return;

    // Add user turn
    const userTurn: TranscriptTurn = {
      id: `turn-user-${Date.now()}`,
      speaker: 'user',
      text: userText,
      timestamp: Date.now(),
      isFinal: true,
    };
    this.turns.push(userTurn);
    this.callbacks.onTranscriptUpdate([...this.turns]);
    this.currentTurnIndex++;

    // Generate possible nugget from user answer
    if (userText.length > 20) {
      setTimeout(() => {
        this.callbacks.onNewNugget({
          id: `nugget-sim-${Date.now()}`,
          category: this.currentTurnIndex % 2 === 0 ? 'admission' : 'conflict',
          label: `Key Turning Point #${this.currentTurnIndex}`,
          quote: userText.length > 80 ? `${userText.slice(0, 80)}...` : userText,
          context: `Revealed during cross-examination on turn ${this.currentTurnIndex}`,
          timestamp: Date.now(),
          pinned: false,
        });
      }, 1000);
    }

    // Determine next speaker and follow-up
    setTimeout(() => {
      if (!this.isRunning) return;

      const isPanel = config.mode === 'panel';
      const activePersonas = isPanel
        ? personas.filter((p) => config.panelPersonaIds.includes(p.id))
        : personas.filter((p) => p.id === config.primaryPersonaId);

      const nextSpeaker = isPanel
        ? activePersonas[this.currentTurnIndex % activePersonas.length]
        : activePersonas[0];

      // In panel mode, occasionally produce an organic 2-speaker tag-team
      if (isPanel && activePersonas.length > 1 && this.currentTurnIndex % 2 === 1) {
        const coHost = activePersonas.find((p) => p.id !== nextSpeaker.id) || activePersonas[1];
        const turn1Text = `Wait, ${coHost.display_name.split(' ')[0]}, look at that answer—they're pretending the risk was calculated!`;
        const turn2Text = this.generateFollowUp(coHost, userText, false, activePersonas, this.currentTurnIndex, config.interviewGoal);

        this.playQueuedTurns([
          { speakerPersona: nextSpeaker, text: turn1Text },
          { speakerPersona: coHost, text: turn2Text },
        ]);
      } else {
        const followUp = this.generateFollowUp(nextSpeaker, userText, isPanel, activePersonas, this.currentTurnIndex, config.interviewGoal);
        this.playQueuedTurns([{ speakerPersona: nextSpeaker, text: followUp }]);
      }
    }, 1200);
  }

  private generateFollowUp(
    speaker: Persona,
    lastUserText: string,
    _isPanel: boolean,
    _allPanelists: Persona[],
    turnIndex: number = 1,
    interviewGoal?: 'thesis_discovery' | 'cross_examination'
  ): string {
    const anchor = lastUserText.length > 30 ? lastUserText.slice(0, 25) + '...' : lastUserText;
    const isThesisDiscovery = interviewGoal !== 'cross_examination';

    if (isThesisDiscovery) {
      if (turnIndex <= 2) {
        // Phase 1: Genesis & Intellectual History
        if (speaker.id === 'michael_barbaro') {
          return `Hm. So when you started that project with "${anchor}", what was the initial hope? When did you first sense that the reality wasn't matching the theory?`;
        } else if (speaker.id === 'kara_swisher') {
          return `Okay, so you're building "${anchor}". What was the breaking point where you realized, 'This is completely unviable and everyone is ignoring the friction'?`;
        } else if (speaker.id === 'david_pogue') {
          return `Wait, so you were right in the middle of "${anchor}". Walk me through what happened next—did something crash, or was it a gradual realization that this was the wrong tool?`;
        } else if (speaker.id === 'terry_gross') {
          return `When you realized "${anchor}", what was the quiet hesitation or doubt that made you realize you had to challenge the accepted way of doing things?`;
        } else if (speaker.id === 'audie_cornish') {
          return `Looking at "${anchor}", help me understand what was at stake. What was the cost of continuing with the conventional playbook?`;
        }
        return `Take me deeper into that project: what did you expect to happen versus what actually failed when you encountered "${anchor}"?`;
      } else if (turnIndex <= 4) {
        // Phase 2: Concrete Crucible & Friction
        if (speaker.id === 'gonzo_hunter') {
          return `Enough theory. When the wheels came off in "${anchor}", who was stuck cleaning up the mess at 2:00 AM? What did the actual damage look like?`;
        } else if (speaker.id === 'kara_swisher') {
          return `Let's talk about the money and the time. In "${anchor}", how much engineering bandwidth got burned before anyone was honest about the failure rate?`;
        } else if (speaker.id === 'michael_barbaro') {
          return `Hm. An operational mess. What did that look like day-to-day for the people actually having to run the workflow?`;
        }
        return `When you look at the mechanics of "${anchor}", what was the single hardest friction point that nobody in the industry wants to admit?`;
      } else if (turnIndex <= 6) {
        // Phase 3: Stress-Testing & Devil's Advocate
        if (speaker.id === 'david_pogue') {
          return `Hold on! Playing devil's advocate here: wouldn't your critics say that with the next generation of models or better tooling, the problem with "${anchor}" just disappears?`;
        } else if (speaker.id === 'audie_cornish') {
          return `A skeptic would argue you're over-indexing on an early implementation failure. How do you answer the critic who says you gave up on the technology too soon?`;
        }
        return `Critics reading your article would counter that "${anchor}" is just an edge case that better tooling will solve. What is your strongest defense against that?`;
      } else {
        // Phase 4: Synthesis & The Core Thesis
        if (speaker.id === 'terry_gross') {
          return `If you had to distill this entire journey into one core lesson or rule of thumb for anyone thinking of reaching for this tool, what would that sentence be?`;
        }
        return `Looking across all of this, what is the central thesis you want your reader to walk away with that permanently changes how they approach this problem?`;
      }
    }

    // Direct cross-examination follow-ups
    if (speaker.id === 'gonzo_hunter') {
      return `That sounds like an excuse cooked up at 3:00 AM over stale diner coffee. You talk about "${anchor}", but when the doors closed, who actually got burned?`;
    } else if (speaker.id === 'michael_barbaro') {
      return `Hm. So what you're saying is... up until that moment, there was no safety net. What did that feel like in the room?`;
    } else if (speaker.id === 'kara_swisher') {
      return `Come on, that's the PR version. Who was sitting across the table, and what were they demanding behind closed doors?`;
    } else if (speaker.id === 'david_pogue') {
      return `Wait, hold the phone! For those of us without a corporate playbook, explain that in plain English. Did this almost blow up the entire company or was it just embarrassing?`;
    } else if (speaker.id === 'audie_cornish') {
      return `You mentioned the immediate reaction, but walk me through the secondary friction. Who paid the price for that choice?`;
    } else if (speaker.id === 'terry_gross') {
      return `When you realized there was no turning back, what was the internal reckoning you had with yourself?`;
    } else {
      return `Looking deeper into that decision, what would you have done differently knowing what you know now?`;
    }
  }

  private playQueuedTurns(
    queue: Array<{ speakerPersona: Persona; text: string }>,
    onComplete?: () => void
  ): void {
    if (queue.length === 0) {
      onComplete?.();
      return;
    }

    const currentTurn = queue[0];
    const remaining = queue.slice(1);

    const aiTurn: TranscriptTurn = {
      id: `turn-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker: currentTurn.speakerPersona.display_name,
      text: currentTurn.text,
      timestamp: Date.now(),
      isFinal: true,
    };
    this.turns.push(aiTurn);
    this.callbacks.onTranscriptUpdate([...this.turns]);
    this.callbacks.onActiveSpeakerChange(currentTurn.speakerPersona.id);

    // If API key is available, use real Gemini Neural TTS
    if (this.neuralTTS && this.apiKey) {
      const voiceName = currentTurn.speakerPersona.voice_name || 'Fenrir';
      this.neuralTTS
        .speak(
          currentTurn.text,
          voiceName,
          (level) => this.callbacks.onAudioLevel(level),
          () => {
            if (remaining.length > 0) {
              setTimeout(() => {
                if (this.isRunning) {
                  this.playQueuedTurns(remaining, onComplete);
                }
              }, 300);
            } else {
              this.callbacks.onActiveSpeakerChange(null);
              onComplete?.();
            }
          }
        )
        .catch((err) => {
          console.warn('[SimulationService] Neural TTS error, falling back to browser synthesis:', err);
          this.fallbackBrowserSpeak(currentTurn, remaining, onComplete);
        });
      return;
    }

    this.fallbackBrowserSpeak(currentTurn, remaining, onComplete);
  }

  private fallbackBrowserSpeak(
    currentTurn: { speakerPersona: Persona; text: string },
    remaining: Array<{ speakerPersona: Persona; text: string }>,
    onComplete?: () => void
  ): void {
    this.startSimulatedAudio();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentTurn.text);
      const persona = currentTurn.speakerPersona;

      const voices = window.speechSynthesis.getVoices();
      const isFemale = ['audie_cornish', 'kara_swisher', 'terry_gross'].includes(persona.id);

      const preferredVoice = voices.find((v) => {
        if (!v.lang.startsWith('en')) return false;
        const name = v.name.toLowerCase();
        if (isFemale) {
          return name.includes('samantha') || name.includes('karen') || name.includes('ava') || name.includes('serena') || name.includes('victoria') || name.includes('female');
        } else {
          return name.includes('daniel') || name.includes('tom') || name.includes('oliver') || name.includes('evan') || name.includes('male') || name.includes('google');
        }
      });

      if (preferredVoice) utterance.voice = preferredVoice;

      if (persona.id === 'gonzo_hunter') {
        utterance.pitch = 0.88;
        utterance.rate = 1.15;
      } else if (persona.id === 'michael_barbaro') {
        utterance.pitch = 0.95;
        utterance.rate = 0.92;
      } else if (persona.id === 'kara_swisher') {
        utterance.pitch = 1.0;
        utterance.rate = 1.18;
      } else if (persona.id === 'david_pogue') {
        utterance.pitch = 1.08;
        utterance.rate = 1.06;
      } else if (persona.id === 'terry_gross') {
        utterance.pitch = 0.94;
        utterance.rate = 0.90;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.02;
      }

      utterance.onend = () => {
        if (remaining.length > 0) {
          setTimeout(() => {
            if (this.isRunning) {
              this.playQueuedTurns(remaining, onComplete);
            }
          }, 300);
        } else {
          this.stopSimulatedAudio();
          this.callbacks.onActiveSpeakerChange(null);
          onComplete?.();
        }
      };

      utterance.onerror = () => {
        if (remaining.length > 0) {
          setTimeout(() => {
            if (this.isRunning) {
              this.playQueuedTurns(remaining, onComplete);
            }
          }, 300);
        } else {
          this.stopSimulatedAudio();
          this.callbacks.onActiveSpeakerChange(null);
          onComplete?.();
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        if (remaining.length > 0) {
          this.playQueuedTurns(remaining, onComplete);
        } else {
          this.stopSimulatedAudio();
          this.callbacks.onActiveSpeakerChange(null);
          onComplete?.();
        }
      }, 3000);
    }
  }

  private startSimulatedAudio(): void {
    if (this.animInterval) clearInterval(this.animInterval);
    this.animInterval = window.setInterval(() => {
      const level = 0.3 + Math.random() * 0.6;
      this.callbacks.onAudioLevel(level);
    }, 80);
  }

  private stopSimulatedAudio(): void {
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
    this.callbacks.onAudioLevel(0);
  }

  public stop(): TranscriptTurn[] {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    this.stopSimulatedAudio();
    this.neuralTTS?.stop();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.callbacks.onStatusChange('disconnected');
    this.callbacks.onActiveSpeakerChange(null);
    return this.turns;
  }
}
