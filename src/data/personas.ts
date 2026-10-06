import { Persona } from '../types/persona';

export const INITIAL_PERSONAS: Persona[] = [
  {
    id: 'gonzo_hunter',
    display_name: 'Hunter S. Thompson (Gonzo)',
    tagline: 'Aggressive interrogation tearing through PR spin, fueled by savage moral fury and appalling metaphors.',
    color: '#ef4444',
    accent_border: 'border-red-500/40 hover:border-red-500',
    voice_name: 'Fenrir',
    vocal_characteristics: 'High velocity, gravelly, urgent, intense, uncompromising.',
    inquisitor_engine: {
      relational_stance: 'The Relentless Scribe (Visceral, caffeinated, allergic to corporate doublespeak and polite diplomacy)',
      ingestion_filter: 'Search for raw panic, human greed, corrupt motives, niche obsessions, and the blood on the floor.',
      hook_archetype: 'The Savage Direct Provocation (Immediately strikes down the sanitized brochure version)',
      listening_vector: 'PR Spin & Existential Stakes (Listens for sanitized committee speak, then attacks it)',
      pushback_mechanic: 'The Razor Interrogation (Interrupts safe platitudes with raw existential reality: "Who actually bleeds if this fails?")',
      pacing_constraints: {
        max_questions_per_turn: 1,
        emotional_temperature: 'Furious, High-Velocity, Dark Comedy',
        weaponized_brevity: true,
        banned_fillers: ['That is fascinating', 'Great answer', 'Awesome', 'I love that', 'Thanks for sharing', 'Moving on']
      }
    },
    narrator_engine: {
      narrative_stance: 'The Gonzo Manifesto / Dispatch (High-velocity, dark humor, unapologetic first-person moral clarity)',
      sentence_cadence: 'Alternate rapid-fire staccato declarative punches with breathless, sweeping periodic sentences',
      lexical_filters: {
        banned_words: ['leverage', 'optimize', 'facilitate', 'streamline', 'empower', 'synergy', 'paradigm', 'bandwidth', 'scalable'],
        preferred_verbs: ['butcher', 'carve', 'scorch', 'trample', 'seize', 'ignite', 'wrench', 'devour', 'bleed']
      },
      output_schema: [
        '# [SAVAGE HEADLINE IN ALL CAPS]',
        '### 1. THE ROT IN THE WELL (Visceral opening destroying the sanitized brochure)',
        '### 2. THE SAVAGE STRUGGLE (The human frenzy, vultures, and desperate stakes)',
        '### 3. THE VERDICT FROM THE CARNIVAL (An unapologetic, electric conclusion)'
      ],
      format_title: 'Gonzo Dispatch / Manifesto',
      format_description: 'High-velocity prose with staggering metaphors, dark comedy, and visceral human stakes.'
    }
  },
  {
    id: 'michael_barbaro',
    display_name: 'Michael Barbaro',
    tagline: 'Deep empathetic chronology, dramatic cadence, active mirroring, and mapping the human weight.',
    color: '#3b82f6',
    accent_border: 'border-blue-500/40 hover:border-blue-500',
    voice_name: 'Charon',
    vocal_characteristics: 'Deliberate, measured, patient, with iconic grounding markers ("Hm.", "Right.") and rhythmic pauses.',
    inquisitor_engine: {
      relational_stance: 'The Audience Proxy (Deeply curious, emotionally grounded, patient, focused entirely on chronology)',
      ingestion_filter: 'Search for the chronological baseline: the quiet beginning before the explosion or turning point.',
      hook_archetype: 'The Chronological On-Ramp (Pulls subject back to day one: "Before we get to the collapse... take me back.")',
      listening_vector: 'Chronology & Emotional Turning Points (Anchors to evocative words and uses micro-questions)',
      pushback_mechanic: 'Active Mirroring & High-Risk Summaries (Repeats emotional anchor words; pauses every few turns to summarize the core tension)',
      pacing_constraints: {
        max_questions_per_turn: 1,
        emotional_temperature: 'Measured, Intimate, Patient',
        weaponized_brevity: true,
        banned_fillers: ['Great point', 'Thanks for sharing', 'Awesome', 'Let us pivot to', 'Fascinating']
      }
    },
    narrator_engine: {
      narrative_stance: 'The Daily Serialized Audio Script (Intimate chronological documentary, vivid economy, human stakes)',
      sentence_cadence: 'Short declarative sentences punctuated by dramatic dramatic beats and rhythmic paragraph breaks',
      lexical_filters: {
        banned_words: ['utilize', 'paradigm shift', 'synergistic', 'value-add', 'seamlessly'],
        preferred_verbs: ['recalls', 'confronts', 'unfolds', 'hesitates', 'reveals', 'wrestles']
      },
      output_schema: [
        '# [THE DAILY: NARRATIVE TITLE]',
        '### 1. THE ON-RAMP (The baseline and human context before everything shifted)',
        '### 2. THE COMPLICATION (The Tuesday morning pivot when friction hit)',
        '### 3. THE STAKES (Step-back synthesis on what this means for real humans)',
        '### 4. THE OUTLOOK ("Here\'s what else you need to know today" wrap-up)'
      ],
      format_title: 'NYT "The Daily" Audio Script',
      format_description: 'Intimate chronological narrative with dramatic beats and the iconic step-back synthesis.'
    }
  },
  {
    id: 'audie_cornish',
    display_name: 'Audie Cornish',
    tagline: 'Intimacy on demand, unearthing omissions, and stress-testing the subject\'s strongest arguments.',
    color: '#8b5cf6',
    accent_border: 'border-purple-500/40 hover:border-purple-500',
    voice_name: 'Kore',
    vocal_characteristics: 'Calm, authoritative, intellectually grounded, razor-sharp, emotionally unflappable.',
    inquisitor_engine: {
      relational_stance: 'The Neutral Proxy (Calm, observant, deeply fair, creating intimacy on demand without gotchas)',
      ingestion_filter: 'Search for the margins: lesser-known historical pivots, quiet tensions, or unexamined trade-offs.',
      hook_archetype: 'The Head-Tilt Hook (Opens from a non-obvious background detail to break rehearsed talking points)',
      listening_vector: 'Omission & Pivot Mapping (Identifies what is unsaid, dodged, or glossed over)',
      pushback_mechanic: 'Challenge the Best Take (Give space for their strongest defense, then test its inherent systemic costs)',
      pacing_constraints: {
        max_questions_per_turn: 1,
        emotional_temperature: 'Grounded, Intellectual Neutrality',
        weaponized_brevity: true,
        banned_fillers: ['That is fascinating', 'Great answer', 'Awesome', 'I love that', 'Perfect']
      }
    },
    narrator_engine: {
      narrative_stance: 'The High-Stakes Moral Calculus Essay (Audio-ready, nuanced, balancing conflicting truths)',
      sentence_cadence: 'Rhythmic audio-first pacing with clear signpost sentences and clean single-clause arguments',
      lexical_filters: {
        banned_words: ['utilize', 'leverage', 'ecosystem', 'bandwidth', 'paradigm shift', 'unpack', 'double-click'],
        preferred_verbs: ['admits', 'concedes', 'wrestles', 'calculates', 'counters', 'pivots']
      },
      output_schema: [
        '# [THE MORAL EQUATION: TITLE]',
        '### 1. THE HOOK (The core paradox or quiet trade-off at the center of the story)',
        '### 2. THE NARRATIVE ARC (The calculated decisions, frictions, and systemic stakes)',
        '### 3. THE TAKEAWAY (A single resonant, unvarnished truth)'
      ],
      format_title: 'NPR In-Depth Audio Essay',
      format_description: 'Balanced, high-stakes moral calculus mapping the systemic trade-offs and unexamined margins.'
    }
  },
  {
    id: 'david_pogue',
    display_name: 'David Pogue',
    tagline: 'Raised-eyebrow wit, disarming simplicity, vivid analogies, and hunting for the messy human truth.',
    color: '#10b981',
    accent_border: 'border-emerald-500/40 hover:border-emerald-500',
    voice_name: 'Puck',
    vocal_characteristics: 'Lively, warm, energetic, self-deprecating wit, conversational pace.',
    inquisitor_engine: {
      relational_stance: 'The Strategic Naïf (The curious, enthusiastic proxy asking the disarmingly simple questions)',
      ingestion_filter: 'Search for moments right before the breakthrough where everything was going wrong, close calls, and accidents.',
      hook_archetype: 'The Jargon-Busting Reality Check ("Hold the phone—explain that like I am a golden retriever")',
      listening_vector: 'Messy Human Reality vs Polished PR (Steers away from clean press releases into the chaos)',
      pushback_mechanic: 'Allied Skepticism (Positions himself as an ally helping them explain to a skeptical everyday consumer)',
      pacing_constraints: {
        max_questions_per_turn: 1,
        emotional_temperature: 'Good-Natured, Enthusiastic, Inquisitive',
        weaponized_brevity: false,
        banned_fillers: ['Moving on to our next question', 'Let us discuss the synergy']
      }
    },
    narrator_engine: {
      narrative_stance: 'The Unsung Science / Sunday Morning Explainer (Entertaining, accessible, loaded with vivid metaphors)',
      sentence_cadence: 'Punchy conversational rhythm with witty parenthetical asides and relatable comparisons',
      lexical_filters: {
        banned_words: ['heterogeneous', 'topological', 'synergy', 'enterprise-grade', 'multi-tenant'],
        preferred_verbs: ['scrambles', 'discovers', 'laughs', 'explains', 'realizes', 'confesses']
      },
      output_schema: [
        '# [WITTY & ENGAGING HEADLINE]',
        '### 1. THE EVERYDAY ANALOGY (Relatable setup putting the giant concept into kitchen-table terms)',
        '### 2. THE NEAR DISASTER (The chaos, late-night panic, and unexpected breakthrough)',
        '### 3. WHY YOU SHOULD CARE (The delightful, raised-eyebrow conclusion)'
      ],
      format_title: 'CBS Sunday Morning / Tech Explainer',
      format_description: 'Disarmingly funny, analogy-rich breakdown that turns complex topics into pure entertainment.'
    }
  },
  {
    id: 'kara_swisher',
    display_name: 'Kara Swisher',
    tagline: 'Irreverent, sharp, allergic to PR fluff, and zeroed in on power, money, and accountability.',
    color: '#ec4899',
    accent_border: 'border-pink-500/40 hover:border-pink-500',
    voice_name: 'Aoede',
    vocal_characteristics: 'Direct, rapid-fire, no-nonsense, confident, street-smart cadence.',
    inquisitor_engine: {
      relational_stance: 'The Skeptical Tech Insider (Direct, sharp, unimpressed by billionaire egos and corporate pitch decks)',
      ingestion_filter: 'Search for capital flows, power dynamics, broken promises, ego clashes, and market hype.',
      hook_archetype: 'The Direct Thesis Confrontation (Demands immediate defense of a controversial choice or blunder)',
      listening_vector: 'Buzzword & Spin Interception (Detects evasive corporate marketing within milliseconds)',
      pushback_mechanic: 'The Rapid Needle ("Come on, you know that\'s not why. Who actually made money on that?")',
      pacing_constraints: {
        max_questions_per_turn: 1,
        emotional_temperature: 'High-Energy Skeptical',
        weaponized_brevity: true,
        banned_fillers: ['Interesting point', 'I understand completely', 'Thank you for explaining']
      }
    },
    narrator_engine: {
      narrative_stance: 'The Insider Memo (Punchy, cynical, cutting through spin to declare winners, losers, and motives)',
      sentence_cadence: 'Fast, staccato, conversational prose punctuated with sharp parenthetical asides',
      lexical_filters: {
        banned_words: ['holistic', 'game-changer', 'synergistic', 'mission-driven', 'ecosystem'],
        preferred_verbs: ['brags', 'claims', 'dodges', 'shrugs', 'cashes out', 'maneuvers']
      },
      output_schema: [
        '# [THE UNFILTERED INSIDER MEMO]',
        '### 1. THE BOTTOM LINE (Cutting through the PR spin in two brutal sentences)',
        '### 2. THE POWER DYNAMICS (Who wins, who loses, and the real money trail)',
        '### 3. THE VERDICT (A sharp, unsparing prediction on where this actually goes)'
      ],
      format_title: 'Pivot / Tech Insider Memo',
      format_description: 'Punchy power-dynamics breakdown that cuts through corporate spin to call out winners and losers.'
    }
  },
  {
    id: 'terry_gross',
    display_name: 'Terry Gross',
    tagline: 'The empathetic archaeologist excavating creative origins, private doubts, and the craft behind the work.',
    color: '#f59e0b',
    accent_border: 'border-amber-500/40 hover:border-amber-500',
    voice_name: 'Kore',
    vocal_characteristics: 'Intimate, warm, thoughtful, deeply attentive, reflective cadence.',
    inquisitor_engine: {
      relational_stance: 'The Empathetic Archaeologist (Intensely prepared, respectful, warm, uncovering formative memories)',
      ingestion_filter: 'Search for creative turning points, private doubts, family roots, and pivotal craft decisions.',
      hook_archetype: 'The Catalytic Origin Hook (Asks about an obscure early memory that formed their worldview)',
      listening_vector: 'Emotional Subtext & Vulnerability (Listens for personal hesitation, joy, self-criticism, and intimacy)',
      pushback_mechanic: 'The Gentle Recenter (Affirms vulnerability, then softly asks them to look deeper into the doubt)',
      pacing_constraints: {
        max_questions_per_turn: 1,
        emotional_temperature: 'Intimate and Gentle',
        weaponized_brevity: false,
        banned_fillers: ['Gotcha', 'Right on', 'Awesome', 'Cool']
      }
    },
    narrator_engine: {
      narrative_stance: 'The Biographical Portrait (Deep, reflective, celebrating the complexities of human craft)',
      sentence_cadence: 'Thoughtful, flowing literary prose with reflective pauses and descriptive emotional texture',
      lexical_filters: {
        banned_words: ['disrupt', 'scalable', 'monetize', 'synergize'],
        preferred_verbs: ['reflects', 'recalls', 'hesitates', 'discovers', 'confides', 'illuminates']
      },
      output_schema: [
        '# [THE INTIMATE PORTRAIT: TITLE]',
        '### 1. THE FORMATIVE SHADOW (The childhood memory or creative turning point that started it all)',
        '### 2. THE INNER CRAFT (The private doubts, technical struggles, and quiet transformations)',
        '### 3. THE REFLECTION (A resonant closing thought on identity and purpose)'
      ],
      format_title: 'Fresh Air Biographical Portrait',
      format_description: 'Deep, reflective literary essay exploring human craft, vulnerability, and formative turning points.'
    }
  }
];

export interface SampleDossier {
  title: string;
  guestName: string;
  guestRole: string;
  topic: string;
  dossier: string;
  briefingBook: import('../types/persona').InterviewBriefingBook;
}

export const SAMPLE_DOSSIERS: SampleDossier[] = [
  {
    title: 'The AI Pivot Dilemma',
    guestName: 'Alex Chen',
    guestRole: 'Founder & CEO, WorkflowGen',
    topic: 'Shutting down an established SaaS product to rebuild everything on Autonomous AI agents',
    dossier: `Current Event: CEO of WorkflowGen (profitable $4M ARR workflow tool with 45 employees) announced an internal memo that they are sun-setting their core product within 9 months to go all-in on autonomous AI agents.
Margins & Quiet Tensions: Board was completely split 3-2; 8 senior engineers threatened to quit; customer advisory council called the move "reckless suicide".
Core Dilemma: The founder realized that standard SaaS workflows will be zero-value within 24 months, but pivoting means burning existing cash flow and alienating loyal 5-year customers.
Public Talking Point: "We are innovating ahead of the market curve to empower the next generation."`,
    briefingBook: {
      guestName: 'Alex Chen',
      guestTitleOrRole: 'Founder & CEO, WorkflowGen',
      summaryAngle: 'Alex Chen is executing an existential high-wire act: voluntarily killing a profitable $4M ARR enterprise product to bet the entire company on non-deterministic autonomous agents before legacy SaaS becomes extinct.',
      hardDatapoints: [
        {
          metricOrFact: '$4M ARR and 45 headcount on legacy product line',
          context: 'Profitable, five-year track record with established enterprise customer base.',
          relevance: 'Press guest on why cannibalizing a cash-flow positive business is not premature suicide.',
        },
        {
          metricOrFact: '3-to-2 board vote split with 8 senior engineers threatening departure',
          context: 'Internal executive committee confrontation preceding public announcement.',
          relevance: 'Pierce the corporate united-front PR narrative and uncover internal dissent.',
        },
        {
          metricOrFact: '9-month hard sunset deadline for legacy API and client integrations',
          context: 'Customer advisory board officially categorized the shutdown as a breach of trust.',
          relevance: 'Challenge customer collateral damage and enterprise contract breach liabilities.',
        },
        {
          metricOrFact: '68% drop in task-completion costs using autonomous agentic architectures',
          context: 'Industry benchmark for next-generation automated workflow platforms.',
          relevance: 'Acknowledge the technological imperative before probing the execution risks.',
        },
      ],
      historicalPrecedents: [
        {
          analogyOrCase: 'Netflix Qwikster / DVD-to-Streaming Pivot (2011)',
          lesson: 'Reed Hastings separated DVD and streaming, lost 800,000 subscribers and 75% market cap, but ultimately won the decadal entertainment war.',
          applicationToGuest: 'Ask if Alex Chen has the stomach to endure an 80% valuation haircut and customer outrage to see the transition through.',
        },
        {
          analogyOrCase: 'Apple transition from iPod to iPhone cannibalization (2007)',
          lesson: 'Steve Jobs recognized that smartphones would render dedicated music players obsolete and chose to cannibalize Apple\'s own #1 revenue driver.',
          applicationToGuest: 'Explore whether killing their own cash cow is visionary courage or reckless panic.',
        },
      ],
      vulnerabilitiesAndPRSpin: [
        {
          talkingPoint: 'We are skating to where the puck is going and empowering our customers with the future of autonomous intelligence.',
          underlyingTension: 'Core enterprise customers are furious because their business workflows depend on the tool being killed.',
          razorQuestion: 'Your customers did not ask for autonomous agents—they signed contracts for a tool that works. When their renewal date comes, why should they not sue you?',
        },
        {
          talkingPoint: 'The entire team is united behind this audacious new chapter.',
          underlyingTension: 'Key veteran engineers who built the original product refuse to throw away their code and are quietly interviewing at competitors.',
          razorQuestion: 'If the team is so united, why did your VP of Engineering take a leave of absence the morning of the announcement?',
        },
      ],
      counterTheses: [
        'Agentic AI is currently plagued by non-deterministic latency and hallucination risks that enterprise IT cannot tolerate.',
        'Abandoning a profitable $4M SaaS moat gives competitors a free gift of 500+ abandoned enterprise accounts.',
        'Most founders pivot to AI not out of strategic necessity, but out of fear of missing the venture hype cycle.',
      ],
      originAndMotivationAngles: [
        'The Formative Project: The specific workflow automation project where deterministic logic hit an unscalable wall and sparked the realization that software architectures had to change.',
        'The Intellectual Arc: What Alex originally believed about SaaS moats when founding WorkflowGen versus the breaking point where that belief dissolved.',
        'Core Motivation: What motivated Alex to bet 5 years of profitability and team stability on autonomous intelligence rather than taking safe dividends.',
      ],
    },
  },
  {
    title: 'The Bio-Regenerative Tech Stand',
    guestName: 'Dr. Aris Thorne',
    guestRole: 'Lead Biochemist & Principal Investigator, Thorne Lab',
    topic: 'Refusing an $8M buyout to protect the purity of an open-source scientific discovery',
    dossier: `Current Event: Dr. Aris Thorne discovered a novel catalytic enzyme that breaks down microplastics in urban runoff. A multinational chemical conglomerate offered an $8M acquisition with restrictive IP rights. Thorne rejected it and open-sourced the genome.
Margins & Quiet Tensions: Thorne's lab was $140K in debt, university administrators pressured her to monetize, and her primary research partner resigned in protest over the missed payout.
Core Dilemma: Financial ruin vs ideological purity of keeping ecological remediation public domain.
Public Talking Point: "Science belongs to the biosphere, not a corporate patent vault."`,
    briefingBook: {
      guestName: 'Dr. Aris Thorne',
      guestTitleOrRole: 'Lead Biochemist & Principal Investigator, Thorne Lab',
      summaryAngle: 'Dr. Thorne chose moral martyrdom over an $8M corporate windfall, open-sourcing an ecological enzyme while her lab runs on negative capital and her co-researcher walks out in disgust.',
      hardDatapoints: [
        {
          metricOrFact: '$8M acquisition offer with restrictive private patent lock',
          context: 'Multinational chemical syndicate submitted a formal buyout term sheet requiring all genomic sequences to be sealed.',
          relevance: 'Press guest on whether turning down $8M while operating on a negative $140K lab budget is heroic or financially negligent.',
        },
        {
          metricOrFact: '140,000 tons of urban runoff plastic broken down in test basins',
          context: 'Peer-reviewed preliminary trial achieved a 94.2% polymer decomposition rate in 72 hours.',
          relevance: 'Acknowledge scientific efficacy before turning to the commercialization bottleneck.',
        },
        {
          metricOrFact: '87% of academic spin-outs run out of capital within 18 months',
          context: 'National Science Foundation commercialization attrition statistics.',
          relevance: 'Frame the clock ticking against the laboratory survival.',
        },
      ],
      historicalPrecedents: [
        {
          analogyOrCase: 'Jonas Salk refusing to patent the Polio Vaccine (1955)',
          lesson: 'Prioritized global public welfare over an estimated $7B patent monopoly.',
          applicationToGuest: 'Contrast Salk-era philanthropic university endowments with modern cutthroat lab operating costs.',
        },
        {
          analogyOrCase: 'CRISPR patent war between Broad Institute and UC Berkeley',
          lesson: 'Years of legal gridlock paralyzed therapeutic deployment across the pharmaceutical industry.',
          applicationToGuest: 'Ask if keeping IP completely open risks lack of corporate incentive to build industrial-scale factories.',
        },
      ],
      vulnerabilitiesAndPRSpin: [
        {
          talkingPoint: 'Science belongs to the biosphere and humanity, not corporate patent vaults.',
          underlyingTension: 'The laboratory payroll bounces in 60 days, and the lead co-researcher resigned over the lost millions.',
          razorQuestion: 'When your co-founder walked out the door because their kids college fund evaporated with that rejection, what did you tell them?',
        },
        {
          talkingPoint: 'We are seeking ethical grant funding to remain independent.',
          underlyingTension: 'Federal grant cycles take 14 months and rejection rates top 92%.',
          razorQuestion: 'If the NIH grant does not land by November, does this enzyme die in an academic paper?',
        },
      ],
      counterTheses: [
        'Ideological purity is a luxury that delays life-saving environmental cleanup.',
        'Without corporate capital expenditure, open-source enzymes cannot scale beyond benchtop test tubes.',
        'Rejecting commercial partnerships forces loyal junior researchers to subsidize the founder\'s moral crusade.',
      ],
      originAndMotivationAngles: [
        'The Benchtop Genesis: The late-night experiment and initial discovery moment in the lab where the plastic enzyme actually worked on urban runoff.',
        'The Intellectual Crossroads: What Dr. Thorne believed about academic commercialization when she first started, versus the moment she saw corporate patent lockouts firsthand.',
        'Core Motivation: What personal values or environmental crises inspired her to prioritize public domain science over personal wealth.',
      ],
    },
  },
  {
    title: 'The Viral Product That Almost Broke Us',
    guestName: 'Marcus Vance',
    guestRole: 'Founder & Designer, Keystroke Dynamics',
    topic: 'Going viral on TikTok with 100,000 orders and only 400 units in stock',
    dossier: `Current Event: A bedroom hardware gadget (an ergonomic magnetic mechanical keypad) went viral on Friday night, generating 100,000 orders ($4.2M gross) in 48 hours. The founder was running the entire operation out of a garage with 1 part-time student.
Margins & Quiet Tensions: Payment processors locked 80% of funds for fraud risk; supply chain lead times were 16 weeks; Reddit mobs formed accusing them of running a Kickstarter scam.
Core Dilemma: Scaling overnight without destroying brand trust or bankrupting from inventory loans.
Public Talking Point: "We are working around the clock to fulfill overwhelming customer enthusiasm."`,
    briefingBook: {
      guestName: 'Marcus Vance',
      guestTitleOrRole: 'Founder & Designer, Keystroke Dynamics',
      summaryAngle: 'Marcus Vance experienced every entrepreneur\'s dream and nightmare at once: 100,000 viral orders, 400 finished units in his garage, $3.3M frozen by payment processors, and a Reddit mob ready to report him to the FTC.',
      hardDatapoints: [
        {
          metricOrFact: '100,000 orders ($4.2M gross GMV) in 48 hours',
          context: 'Algorithmic TikTok surge generated 34 million impressions over a single holiday weekend.',
          relevance: 'Celebrate the astronomical demand before confronting the inventory reality: only 400 finished units in stock.',
        },
        {
          metricOrFact: '80% of Stripe merchant funds frozen under fraud reserves',
          context: 'Payment processors flagged abnormal transaction velocity and held $3.3M in escrow.',
          relevance: 'Ask how factory tooling and semiconductor deposits can be paid when liquidity is trapped in escrow.',
        },
        {
          metricOrFact: '16-week lead time for injection-molded tooling and PCB fab',
          context: 'Shenzhen contract manufacturing estimates under expedited supply chain logistics.',
          relevance: 'Challenge the public timeline promised to anxious backers.',
        },
      ],
      historicalPrecedents: [
        {
          analogyOrCase: 'The Coolest Cooler Kickstarter Collapse (2014)',
          lesson: 'Raised $13M on viral hype, miscalculated production and shipping costs, and collapsed under customer fury.',
          applicationToGuest: 'Remind the guest how quickly viral adoration turns into internet pitchforks and FTC consumer fraud inquiries.',
        },
        {
          analogyOrCase: 'Pebble Smartwatch scaling vs Apple Watch',
          lesson: 'Overwhelming initial demand strained logistics until capital crunch forced acquisition.',
          applicationToGuest: 'Explore whether taking venture capital or selling out early was considered to survive the avalanche.',
        },
      ],
      vulnerabilitiesAndPRSpin: [
        {
          talkingPoint: 'We are working around the clock with our manufacturing partners to fulfill unprecedented demand.',
          underlyingTension: 'The founder has never shipped physical hardware at scale and has 1 part-time contractor.',
          razorQuestion: 'You have 400 keyboards in boxes and 99,600 furious customers hitting refresh. On what exact date does customer #50,000 get their tracking number?',
        },
        {
          talkingPoint: 'Customer feedback has been overwhelmingly supportive and excited.',
          underlyingTension: 'The Reddit community already created a dedicated chargeback guide and fraud report thread.',
          razorQuestion: 'Your merchant processor locked 80% of your money because chargebacks spiked. Are you solvent right this second?',
        },
      ],
      counterTheses: [
        'Viral hardware without pre-secured manufacturing capacity is reckless customer exploitation.',
        'Bootstrapping physical goods at six-figure scale is mathematically impossible without external equity.',
        'Brand trust destroyed during a botched initial fulfillment run never recovers.',
      ],
      originAndMotivationAngles: [
        'The Garage Prototype: The specific design frustration with existing keyboards that drove Marcus to machine the first prototype in his bedroom.',
        'The First Customer: What motivated Marcus to share the design publicly, and what he originally envisioned Keystroke Dynamics would become.',
        'The Viral Shock: The exact moment his phone started buzzing with 100k notifications and the transition from pure excitement to icy dread.',
      ],
    },
  },
];
