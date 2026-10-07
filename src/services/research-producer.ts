import { InterviewBriefingBook, GroundingSource } from '../types/persona';

export interface ResearchProducerParams {
  topic: string;
  guestName?: string;
  guestRole?: string;
  notes?: string;
  apiKey?: string;
}

export class ResearchProducerService {
  private static runCounter = 0;

  /**
   * Generates a comprehensive Journalistic Show Briefing Book.
   * 1. If an apiKey is available, queries Gemini with search grounding.
   * 2. Otherwise attempts serverless Cloudflare Edge Function (/api/research).
   * 3. Falls back to dynamic, context-aware heuristic synthesis.
   */
  public async generateBriefingBook(params: ResearchProducerParams): Promise<InterviewBriefingBook> {
    const { topic, guestName, guestRole, notes, apiKey } = params;
    ResearchProducerService.runCounter++;

    // 1. Direct client-side Gemini call if user provided an API key
    if (apiKey && apiKey.trim().length > 0) {
      try {
        return await this.callGeminiResearch(topic, guestName, guestRole, notes, apiKey.trim());
      } catch (err) {
        console.warn('[ResearchProducer] Direct Gemini API call failed, attempting serverless edge route:', err);
      }
    }

    // 2. Attempt Cloudflare Edge Function /api/research
    try {
      const edgeRes = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          guestName,
          guestRole,
          notes,
          apiKey: apiKey?.trim() || undefined,
        }),
      });

      if (edgeRes.ok) {
        const edgeBook = (await edgeRes.json()) as InterviewBriefingBook;
        if (edgeBook && edgeBook.hardDatapoints && edgeBook.vulnerabilitiesAndPRSpin) {
          return edgeBook;
        }
      }
    } catch {
      // Edge function unavailable (e.g. local preview or unconfigured backend)
    }

    // 3. Dynamic contextual heuristic briefing generation
    return this.generateSimulatedBriefing(topic, guestName, guestRole, notes);
  }

  private async callGeminiResearch(
    topic: string,
    guestName?: string,
    guestRole?: string,
    notes?: string,
    apiKey?: string
  ): Promise<InterviewBriefingBook> {
    const guestIdentifier = [guestName, guestRole].filter(Boolean).join(', ') || 'The Guest';

    const systemInstructions = `You are the Senior Investigative Show Producer and Chief Researcher for an elite journalistic interview show (in the caliber of Fresh Air, The Daily, CBS Sunday Morning, 60 Minutes, and Pivot).

Your mission is to perform thorough "pre-interview homework" on the upcoming guest and topic.
Find real-world facts, hard metrics, industry benchmarks, historical precedents, and counter-theses so the interviewer can speak with deep authority, cite concrete numbers, and challenge spin with receipts.

Output MUST be a single valid JSON object with EXACTLY this structure (no outside commentary, no markdown code fence wrappers):
{
  "guestName": "${guestName || 'The Guest'}",
  "guestTitleOrRole": "${guestRole || ''}",
  "summaryAngle": "Punchy 2-3 sentence summary of the core narrative tension, paradox, or high-stakes dilemma at the heart of this interview.",
  "hardDatapoints": [
    {
      "metricOrFact": "Exact metric, date, financial number, or verifiable fact (e.g. '$4.2M ARR', '78% churn rate', '2.5 billion active devices', 'Series B down-round')",
      "context": "Short explanation of where this figure comes from and its significance.",
      "relevance": "How the interviewer should deploy this number in cross-examination."
    }
  ],
  "historicalPrecedents": [
    {
      "analogyOrCase": "Name of real-world historical precedent or corporate parallel (e.g. 'Apple MobileMe launch in 2008', 'Netflix Qwikster pivot', 'Basecamp cloud exit')",
      "lesson": "What happened in that historical parallel and what lesson emerged.",
      "applicationToGuest": "How the interviewer can draw a direct analogy to the guest's situation."
    }
  ],
  "vulnerabilitiesAndPRSpin": [
    {
      "talkingPoint": "The predictable, polished PR soundbite the guest is coached to give.",
      "underlyingTension": "The uncomfortable, unsaid truth or vulnerability they are avoiding.",
      "razorQuestion": "A piercing, single-barreled question that cuts right through the spin."
    }
  ],
  "counterTheses": [
    "Sharp 1-sentence bear-case or critic objection #1",
    "Sharp 1-sentence bear-case or critic objection #2",
    "Sharp 1-sentence bear-case or critic objection #3"
  ],
  "originAndMotivationAngles": [
    "The formative project, experiment, or late-night moment where the conventional approach failed and catalyzed this stance",
    "What the guest originally believed vs the turning point that inverted their thinking",
    "What motivated or inspired them to champion this perspective for their article or thesis"
  ]
}
Provide at least 3-4 hardDatapoints, 2-3 historicalPrecedents, 3 vulnerabilitiesAndPRSpin, 3 counterTheses, and 2-3 originAndMotivationAngles.`;

    const userPrompt = `TOPIC TO INVESTIGATE: "${topic}"
GUEST: ${guestIdentifier}
${notes ? `ADDITIONAL SOURCE NOTES & BACKGROUND:\n${notes}` : ''}`;

    let responseText = '';
    const groundingSources: GroundingSource[] = [];

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.0-flash'];

    // Attempt 1: Call with Google Search tool
    for (const model of candidateModels) {
      if (responseText) break;
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }],
              },
            ],
            tools: [{ googleSearch: {} }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2500,
            },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const candidate = data.candidates?.[0];
          responseText = candidate?.content?.parts?.[0]?.text || '';

          const searchChunks = candidate?.groundingMetadata?.groundingChunks || [];
          for (const chunk of searchChunks) {
            if (chunk.web?.uri && chunk.web?.title) {
              groundingSources.push({
                title: chunk.web.title,
                url: chunk.web.uri,
              });
            }
          }
        }
      } catch {
        // Fall through to next model
      }
    }

    // Attempt 2: Direct call with responseMimeType: 'application/json' if search grounding did not output text
    if (!responseText) {
      for (const model of candidateModels) {
        if (responseText) break;
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                responseMimeType: 'application/json',
                maxOutputTokens: 2500,
              },
            }),
          });

          if (response.ok) {
            const data = (await response.json()) as any;
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } catch {
          // Fall through to next model
        }
      }
    }

    // Clean and parse the response
    const parsed = this.cleanAndParseJSON<InterviewBriefingBook>(responseText);
    if (!parsed || !parsed.hardDatapoints || !parsed.vulnerabilitiesAndPRSpin) {
      throw new Error('Failed to parse valid structured briefing book from Gemini');
    }

    parsed.guestName = guestName || parsed.guestName || 'The Guest';
    parsed.guestTitleOrRole = guestRole || parsed.guestTitleOrRole || '';
    if (groundingSources.length > 0) {
      parsed.groundingSources = groundingSources.slice(0, 5);
    }

    return parsed;
  }

  /**
   * Generates a high-quality, dynamically adapted simulated briefing book
   * based on the provided topic, guest, and raw context.
   */
  public generateSimulatedBriefing(
    topic: string,
    guestName?: string,
    guestRole?: string,
    notes?: string
  ): InterviewBriefingBook {
    const name = guestName?.trim() || 'The Guest';
    const role = guestRole?.trim() || 'Guest & Subject';
    const cleanTopic = topic.trim();
    const cycle = ResearchProducerService.runCounter % 2;

    const lowerName = name.toLowerCase();
    const lowerRole = role.toLowerCase();
    const lowerTopic = cleanTopic.toLowerCase();

    // 1. Check if the user is explicitly running one of the 4 pre-configured sample dossiers
    const isSampleAlexChen =
      (lowerName.includes('alex chen') || lowerRole.includes('workflowgen')) ||
      (lowerTopic.includes('shutting down') && lowerTopic.includes('autonomous'));

    const isSampleBiotech =
      lowerName.includes('aris thorne') ||
      (lowerTopic.includes('enzyme') && (lowerTopic.includes('8m') || lowerTopic.includes('buyout'))) ||
      lowerTopic.includes('plastic enzyme');

    const isSampleHardware =
      lowerName.includes('marcus vance') ||
      (lowerTopic.includes('100,000 orders') && lowerTopic.includes('400'));

    const isSampleSecurity =
      lowerName.includes('elena rostova') ||
      (lowerTopic.includes('security breach') && lowerTopic.includes('techcorp'));

    if (isSampleAlexChen) {
      return this.buildTechPivotBriefing(name, role, cleanTopic, notes, cycle);
    }
    if (isSampleBiotech) {
      return this.buildBiotechBriefing(name, role, cycle);
    }
    if (isSampleHardware) {
      return this.buildHardwareBriefing(name, role, cycle);
    }
    if (isSampleSecurity) {
      return this.buildSecurityBriefing(name, role, cleanTopic, notes, cycle);
    }

    // 2. Any other topic is a CUSTOM TOPIC: synthesize 100% dynamic briefing book with ZERO demo artifacts
    return this.buildDynamicCustomBriefing(name, role, cleanTopic, notes, cycle);
  }

  private buildBiotechBriefing(name: string, role: string, cycle: number): InterviewBriefingBook {
    if (cycle === 1) {
      return {
        guestName: name,
        guestTitleOrRole: role,
        summaryAngle: `The secondary fallout of refusing commercialization: with the lab running a negative \$140K budget, ${name} faces an internal mutiny from junior researchers who spent three years on benchwork and now face career insolvency for an ideological crusade.`,
        hardDatapoints: [
          {
            metricOrFact: '3 doctoral candidates left lab in past 90 days citing missed stipends',
            context: 'University department attrition filings following the commercial patent refusal.',
            relevance: 'Ask whether junior team members consented to being martyrs for the founder\'s moral stance.',
          },
          {
            metricOrFact: '\$8M acquisition offer with restrictive private patent lock',
            context: 'Multinational chemical syndicate submitted formal buyout requiring all genomic sequences sealed.',
            relevance: 'Press guest on whether turning down \$8M while operating on a negative \$140K budget was heroic or irresponsible.',
          },
          {
            metricOrFact: '140,000 tons of urban runoff plastic broken down in test basins',
            context: 'Peer-reviewed preliminary trial achieved a 94.2% polymer decomposition rate in 72 hours.',
            relevance: 'Acknowledge scientific efficacy before pivoting to the commercialization bottleneck.',
          },
        ],
        historicalPrecedents: [
          {
            analogyOrCase: 'Jonas Salk refusing to patent the Polio Vaccine (1955)',
            lesson: 'Prioritized global public welfare over an estimated \$7B patent monopoly.',
            applicationToGuest: 'Contrast Salk-era university philanthropic endowments with modern cutthroat lab operating costs.',
          },
          {
            analogyOrCase: 'CRISPR patent war between Broad Institute and UC Berkeley',
            lesson: 'Years of legal gridlock paralyzed therapeutic deployment across the pharmaceutical industry.',
            applicationToGuest: 'Ask if keeping IP completely open risks lack of corporate incentive to build industrial-scale factories.',
          },
        ],
        vulnerabilitiesAndPRSpin: [
          {
            talkingPoint: 'We are keeping this open-source so third-world communities can synthesize it for free.',
            underlyingTension: 'Without industrial-grade bio-reactors that cost \$25M each, no impoverished municipality can brew the enzyme.',
            razorQuestion: 'Who synthesizes this enzyme in Manila or Lagos when your recipe requires a \$25M cleanroom?',
          },
          {
            talkingPoint: 'Science belongs to the biosphere and humanity, not corporate patent vaults.',
            underlyingTension: 'The laboratory payroll bounces in 60 days, and the lead co-researcher resigned over the lost millions.',
            razorQuestion: 'When your co-founder walked out the door because their kids college fund evaporated with that rejection, what did you tell them?',
          },
        ],
        counterTheses: [
          'Without corporate capital expenditure, open-source enzymes cannot scale beyond benchtop test tubes.',
          'Rejecting commercial partnerships forces loyal junior researchers to subsidize the founder\'s moral crusade.',
          'Ideological purity is a luxury that delays life-saving environmental cleanup.',
        ],
        originAndMotivationAngles: [
          'The Benchtop Genesis: The late-night experiment and initial discovery moment in the lab where the plastic enzyme actually worked on urban runoff.',
          'The Intellectual Crossroads: What Dr. Thorne believed about academic commercialization when she first started, versus the moment she saw corporate patent lockouts firsthand.',
          'Core Motivation: What personal values or environmental crises inspired her to prioritize public domain science over personal wealth.',
        ],
      };
    }

    return {
      guestName: name,
      guestTitleOrRole: role,
      summaryAngle: `A high-stakes clash between open-source ecological purity and multi-million dollar corporate monetization. ${name} holds the patent for a breakthrough remediation enzyme, but faces financial extinction for refusing private equity buyout.`,
      hardDatapoints: [
        {
          metricOrFact: '\$8M acquisition offer with restrictive private patent lock',
          context: 'Multinational chemical syndicate submitted a formal buyout term sheet requiring all genomic sequences to be sealed.',
          relevance: 'Press guest on whether turning down \$8M while operating on a negative \$140K lab budget is heroic or financially negligent.',
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
          lesson: 'Prioritized global public welfare over an estimated \$7B patent monopoly.',
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
    };
  }

  private buildHardwareBriefing(name: string, role: string, cycle: number): InterviewBriefingBook {
    if (cycle === 1) {
      return {
        guestName: name,
        guestTitleOrRole: role,
        summaryAngle: `The supply chain death spiral: converting 100,000 viral orders into reality while freight forwarding costs surged 300% and contract manufacturers in Dongguan demand cash-in-advance to re-tool production lines.`,
        hardDatapoints: [
          {
            metricOrFact: '100,000 orders (\$4.2M gross GMV) in 48 hours',
            context: 'Algorithmic TikTok surge generated 34 million impressions over a single holiday weekend.',
            relevance: 'Celebrate astronomical demand before confronting inventory reality: only 400 finished units in stock.',
          },
          {
            metricOrFact: 'Air freight rates skyrocketed from \$3.20/kg to \$9.80/kg',
            context: 'Q4 container congestion wiped out unit gross margins completely.',
            relevance: 'Show that each unit shipped now loses money on delivery.',
          },
          {
            metricOrFact: '80% of Stripe merchant funds frozen under fraud reserves',
            context: 'Payment processors flagged abnormal transaction velocity and held \$3.3M in escrow.',
            relevance: 'Ask how factory tooling deposits can be paid when liquidity is trapped.',
          },
        ],
        historicalPrecedents: [
          {
            analogyOrCase: 'The Coolest Cooler Kickstarter Collapse (2014)',
            lesson: 'Raised \$13M on viral hype, miscalculated shipping costs, and collapsed under customer fury.',
            applicationToGuest: 'Remind the guest how quickly viral adoration turns into internet pitchforks and consumer fraud inquiries.',
          },
          {
            analogyOrCase: 'Ouya Console Fulfillment Disaster (2013)',
            lesson: 'Rushed half-baked units to market to appease backer panic, destroying reputation permanently.',
            applicationToGuest: 'Examine the pressure to ship flawed revision-1 hardware vs delaying for quality.',
          },
        ],
        vulnerabilitiesAndPRSpin: [
          {
            talkingPoint: 'We are working around the clock with our manufacturing partners to fulfill demand.',
            underlyingTension: 'The contract manufacturer paused the production line because the tooling deposit bounced.',
            razorQuestion: 'Is the assembly line in Dongguan running right this second, or is it halted until Stripe releases funds?',
          },
          {
            talkingPoint: 'Customer feedback has been overwhelmingly supportive and excited.',
            underlyingTension: 'The Reddit community created a chargeback coordination megathread with over 4,000 upvotes.',
            razorQuestion: 'What is your chargeback rate today, and what threshold triggers Stripe shutting down your processing entirely?',
          },
        ],
        counterTheses: [
          'Viral demand without production capacity is customer exploitation by another name.',
          'Bootstrapping hardware at six-figure scale without venture debt guarantees bankruptcy.',
          'Consumer trust destroyed during a first fulfillment run can never be salvaged.',
        ],
        originAndMotivationAngles: [
          'The Garage Prototype: The specific design frustration with existing hardware that drove Marcus to machine the first prototype in his bedroom.',
          'The First Customer: What motivated Marcus to share the design publicly, and what he originally envisioned Keystroke Dynamics would become.',
          'The Viral Shock: The exact moment his phone started buzzing with 100k notifications and the transition from pure excitement to icy dread.',
        ],
      };
    }

    return {
      guestName: name,
      guestTitleOrRole: role,
      summaryAngle: `The classic 'success disaster': scaling from a bedroom garage prototype to 100,000 viral orders in 48 hours without working capital, facing frozen payment merchant accounts, and fighting raging accusations of being a vaporware scam.`,
      hardDatapoints: [
        {
          metricOrFact: '100,000 orders (\$4.2M gross GMV) in 48 hours',
          context: 'Algorithmic TikTok surge generated 34 million impressions over a single holiday weekend.',
          relevance: 'Celebrate the astronomical demand before confronting the inventory reality: only 400 finished units in stock.',
        },
        {
          metricOrFact: '80% of Stripe merchant funds frozen under fraud reserves',
          context: 'Payment processors flagged abnormal transaction velocity and held \$3.3M in escrow.',
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
          lesson: 'Raised \$13M on viral hype, miscalculated production and shipping costs, and collapsed under customer fury.',
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
        'The Garage Prototype: The specific design frustration with existing hardware that drove Marcus to machine the first prototype in his bedroom.',
        'The First Customer: What motivated Marcus to share the design publicly, and what he originally envisioned Keystroke Dynamics would become.',
        'The Viral Shock: The exact moment his phone started buzzing with 100k notifications and the transition from pure excitement to icy dread.',
      ],
    };
  }

  private buildSecurityBriefing(
    name: string,
    role: string,
    topic: string,
    notes?: string,
    cycle: number = 0
  ): InterviewBriefingBook {
    const customReceipts = this.extractReceiptsFromText(notes || '');
    const angle =
      cycle === 1
        ? `The disclosure timeline scandal in "${topic}": internal incident response logs show unauthorized queries weeks before executive leadership notified affected enterprise clients. ${name} must answer whether secrecy was prioritized over customer protection.`
        : `An existential crisis in trust around "${topic}": navigating a severe security compromise in automated infrastructure. ${name} must defend whether corporate pressure to deploy cutting-edge agentic workflows outpaced basic safeguards.`;

    return {
      guestName: name,
      guestTitleOrRole: role,
      summaryAngle: angle,
      hardDatapoints: customReceipts.length >= 3 ? customReceipts : [
        {
          metricOrFact: '14 enterprise environments and 48,000 credentials exposed in unauthorized egress',
          context: 'Forensic incident response preliminary report submitted to external audit counsel.',
          relevance: 'Establish concrete blast radius before the guest retreats into "an isolated minor vector".',
        },
        {
          metricOrFact: '42 days between initial anomalous telemetry and public disclosure',
          context: 'Internal SIEM logs confirm early indicators of credential compromise were dismissed as testing artifacts.',
          relevance: 'Cross-examine the disclosure timeline and SEC notification requirements.',
        },
        {
          metricOrFact: '3 senior security architects raised written objections prior to the release',
          context: 'Internal engineering review documentation detailing bypassed penetration testing cycles.',
          relevance: 'Confront the guest with documented internal dissent that was overruled for speed.',
        },
      ],
      historicalPrecedents: [
        {
          analogyOrCase: 'SolarWinds Orion Supply Chain Breach (2020)',
          lesson: 'Nation-state actors exploited trusted build pipelines, leading to multi-agency federal investigations and personal CISO liability.',
          applicationToGuest: 'Ask if leadership recognizes personal liability when security gates are deliberately relaxed.',
        },
        {
          analogyOrCase: 'Equifax Apache Struts Breach (2017)',
          lesson: 'Delayed patching of known vulnerabilities resulted in catastrophic CEO resignation and $700M in FTC penalties.',
          applicationToGuest: 'Compare Equifax\'s notorious delay in public disclosure to the current timeline.',
        },
      ],
      vulnerabilitiesAndPRSpin: [
        {
          talkingPoint: 'Customer privacy is our highest priority, and we acted immediately upon verifying the threat.',
          underlyingTension: 'Security telemetry showed unauthorized queries weeks before the executive team called external incident response.',
          razorQuestion: 'If customer privacy was your highest priority, why did your incident response team wait 42 days to revoke affected session tokens?',
        },
        {
          talkingPoint: 'No evidence suggests customer financial data was exfiltrated.',
          underlyingTension: 'Because audit logs were configured to auto-purge every 7 days to save cloud storage costs, they cannot prove what was taken.',
          razorQuestion: 'Isn\'t the truth that you don\'t have evidence of exfiltration because your team didn\'t retain the ingress logs?',
        },
      ],
      counterTheses: [
        'Speed-to-market incentives in modern software systematically punish responsible security engineering.',
        'Executives who override engineering security vetos should face personal regulatory consequences.',
        'Once enterprise client trust is compromised by negligent infrastructure, recovery takes a decade.',
      ],
      originAndMotivationAngles: [
        'The Breach Origin: The moment anomalous egress telemetry was first flagged and the operational friction inside the room before disclosure.',
        'The Architectural Compromise: What engineering safeguards were initially sacrificed or deprioritized in the sprint to deploy automated infrastructure.',
        'Core Motivation: What personal accountability or systemic changes Elena believes are required to prevent repeating this failure.',
      ],
    };
  }

  private buildTechPivotBriefing(
    name: string,
    role: string,
    topic: string,
    notes?: string,
    cycle: number = 0
  ): InterviewBriefingBook {
    // Check if user provided custom notes with numbers/facts
    const customReceipts = this.extractReceiptsFromText(notes || '');

    if (cycle === 1) {
      return {
        guestName: name,
        guestTitleOrRole: role,
        summaryAngle: `The internal civil war behind the pivot: while public announcements celebrate visionary courage in "${topic}", veteran engineers and enterprise clients view the abrupt sunset as an unacceptable breach of trust. ${name} must defend whether killing a working cash machine is genuine vision or existential panic.`,
        hardDatapoints: customReceipts.length >= 3 ? customReceipts : [
          {
            metricOrFact: '\$4M ARR and 45 headcount on legacy product line',
            context: 'Profitable, five-year track record with established enterprise customer base.',
            relevance: 'Establish that this was not a failing startup, but a deliberate decision to cannibalize a working cash machine.',
          },
          {
            metricOrFact: '8 key engineering leads threatened resignation over 30-day architectural mandate',
            context: 'Internal executive committee confrontation preceding public announcement.',
            relevance: 'Pry open the internal organizational civil war that the polished press release glossed over.',
          },
          {
            metricOrFact: '68% drop in task-completion costs using autonomous agentic architectures',
            context: 'Industry research benchmark for next-generation automated workflow platforms.',
            relevance: 'Contextualize the technological threat: why waiting 12 months meant extinction.',
          },
          {
            metricOrFact: '9-month hard sunset deadline for legacy API and client integrations',
            context: 'Customer advisory board officially categorized the shutdown as an unacceptable breach of trust.',
            relevance: 'Push back on customer collateral damage and contract breach liabilities.',
          },
        ],
        historicalPrecedents: [
          {
            analogyOrCase: 'Apple transition from iPod to iPhone cannibalization (2007)',
            lesson: 'Steve Jobs recognized that smartphones would render dedicated music players obsolete and chose to cannibalize Apple\'s own #1 revenue driver.',
            applicationToGuest: 'Explore whether killing their own cash cow is visionary courage or premature suicide.',
          },
          {
            analogyOrCase: 'Netflix Qwikster / DVD-to-Streaming Pivot (2011)',
            lesson: 'Reed Hastings separated DVD and streaming, lost 800,000 subscribers and 75% market cap, but ultimately won the decadal entertainment war.',
            applicationToGuest: 'Ask if the founder has the stomach to endure an 80% valuation haircut and public humiliation to see the transition through.',
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
          'Abandoning a profitable \$4M SaaS moat gives competitors a free gift of 500+ abandoned enterprise accounts.',
          'Most founders pivot to AI not out of strategic necessity, but out of fear of missing the venture hype cycle.',
        ],
        originAndMotivationAngles: [
          'The Formative Project: The specific workflow automation project where deterministic logic hit an unscalable wall and sparked the realization that software architectures had to change.',
          'The Intellectual Arc: What Alex originally believed about SaaS moats when founding WorkflowGen versus the breaking point where that belief dissolved.',
          'Core Motivation: What motivated Alex to bet 5 years of profitability and team stability on autonomous intelligence rather than taking safe dividends.',
        ],
      };
    }

    return {
      guestName: name,
      guestTitleOrRole: role,
      summaryAngle: `A high-stakes organizational gamble: burning existing revenue and risking customer backlash to pivot into an unproven, agentic paradigm before legacy competitors render the old business model obsolete.`,
      hardDatapoints: customReceipts.length >= 3 ? customReceipts : [
        {
          metricOrFact: '\$4M ARR and 45 headcount on legacy product line',
          context: 'Profitable, five-year track record with established enterprise customer base.',
          relevance: 'Establish that this was not a failing startup, but a deliberate decision to cannibalize a working cash machine.',
        },
        {
          metricOrFact: '68% drop in task-completion costs using autonomous agentic architectures',
          context: 'Industry research benchmark for next-generation automated workflow platforms.',
          relevance: 'Contextualize the technological threat: why waiting 12 months meant extinction.',
        },
        {
          metricOrFact: '3-to-2 board vote split with 8 senior engineers threatening immediate departure',
          context: 'Internal executive committee confrontation preceding public announcement.',
          relevance: 'Pry open the internal organizational civil war that the polished press release glossed over.',
        },
        {
          metricOrFact: '9-month hard sunset deadline for legacy API and client integrations',
          context: 'Customer advisory board officially categorized the shutdown as an unacceptable breach of trust.',
          relevance: 'Push back on customer collateral damage and contract breach liabilities.',
        },
      ],
      historicalPrecedents: [
        {
          analogyOrCase: 'Netflix Qwikster / DVD-to-Streaming Pivot (2011)',
          lesson: 'Reed Hastings separated DVD and streaming, lost 800,000 subscribers and 75% market cap, but ultimately won the decadal entertainment war.',
          applicationToGuest: 'Ask if the founder has the stomach to endure an 80% valuation haircut and public humiliation to see the transition through.',
        },
        {
          analogyOrCase: 'Apple transition from iPod to iPhone cannibalization (2007)',
          lesson: 'Steve Jobs recognized that smartphones would render dedicated music players obsolete and chose to cannibalize Apple\'s own #1 revenue driver.',
          applicationToGuest: 'Explore whether killing their own cash cow is visionary courage or premature suicide.',
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
        'Abandoning a profitable \$4M SaaS moat gives competitors a free gift of 500+ abandoned enterprise accounts.',
        'Most founders pivot to AI not out of strategic necessity, but out of fear of missing the venture hype cycle.',
      ],
      originAndMotivationAngles: [
        'The Formative Project: The specific workflow automation project where deterministic logic hit an unscalable wall and sparked the realization that software architectures had to change.',
        'The Intellectual Arc: What Alex originally believed about SaaS moats when founding WorkflowGen versus the breaking point where that belief dissolved.',
        'Core Motivation: What motivated Alex to bet 5 years of profitability and team stability on autonomous intelligence rather than taking safe dividends.',
      ],
    };
  }

  /**
   * Generates a domain-intelligent, context-aware briefing book for any custom topic
   * with ZERO hardcoded sample artifacts.
   */
  private buildDynamicCustomBriefing(
    name: string,
    role: string,
    topic: string,
    notes: string | undefined,
    cycle: number
  ): InterviewBriefingBook {
    const domain = this.detectDomain(topic, notes);
    const receipts = this.extractReceiptsFromContext(topic, notes);

    let summaryAngle = '';
    const hardDatapoints: Array<{ metricOrFact: string; context: string; relevance: string }> = [];
    let historicalPrecedents: Array<{ analogyOrCase: string; lesson: string; applicationToGuest: string }> = [];
    let vulnerabilitiesAndPRSpin: Array<{ talkingPoint: string; underlyingTension: string; razorQuestion: string }> = [];
    let counterTheses: string[] = [];

    // Prioritize user-provided receipts from notes and topic
    for (const r of receipts) {
      hardDatapoints.push(r);
      if (hardDatapoints.length >= 4) break;
    }

    switch (domain) {
      case 'civic_policy': {
        summaryAngle =
          cycle === 1
            ? `The secondary fallout in "${topic}": while ${name} argues the mandate is vital for institutional order, grassroots opposition and frontline enforcement friction threaten to derail execution. The interviewer must press whether ideological certainty blinds leadership to public backlash.`
            : `A high-stakes governance battle around "${topic}": ${name} faces intense public scrutiny over whether top-down policy directives solve systemic friction or simply shift the burden onto frontline staff and families.`;

        if (hardDatapoints.length < 3) {
          hardDatapoints.push(
            {
              metricOrFact: `Enforcement protocol & compliance friction in "${topic}"`,
              context: `Operational burden placed on frontline staff to execute the policy mandate.`,
              relevance: `Cross-examine ${name} on the practical staffing and time costs required to enforce this policy daily.`,
            },
            {
              metricOrFact: `Documented stakeholder dissent & formal petition submissions`,
              context: `Opposition statements and community protests filed against the directive.`,
              relevance: `Ask ${name} how leadership differentiates legitimate stakeholder concern from fringe opposition.`,
            },
            {
              metricOrFact: `Secondary liability and institutional risk exposure`,
              context: `Potential legal, financial, or constitutional vulnerabilities inherent to the policy's implementation.`,
              relevance: `Force ${name} to address who bears legal and reputational liability if the mandate causes unintended harm.`,
            }
          );
        }

        historicalPrecedents = [
          {
            analogyOrCase: 'New York City Public School Cellphone Ban (2006–2015)',
            lesson: 'A total top-down device ban created an underground truck storage black market outside schools, penalized low-income students, and was ultimately repealed under parental outcry.',
            applicationToGuest: `Ask ${name} how this policy avoids the exact underground workarounds and parental fury that forced NYC to abandon its blanket ban.`,
          },
          {
            analogyOrCase: 'The Volstead Act and Regulatory Prohibition Dilemmas',
            lesson: 'Banning widespread public behaviors without popular consensus accelerates illicit workarounds rather than reforming culture.',
            applicationToGuest: `Examine whether ${name} is creating an enforcement nightmare that damages institutional trust.`,
          },
        ];

        vulnerabilitiesAndPRSpin = [
          {
            talkingPoint: 'We consulted stakeholders and are enacting this strictly for the long-term welfare of the community.',
            underlyingTension: 'Dissenting stakeholders feel completely ignored and are organizing political or legal challenges.',
            razorQuestion: `If the community is so united behind "${topic}", why did dozens of constituents show up to voice formal protests?`,
          },
          {
            talkingPoint: 'Our frontline staff are fully equipped to implement this transition smoothly.',
            underlyingTension: 'Staff are burning hours every day managing disputes rather than performing their primary duties.',
            razorQuestion: `How many hours of core operational time have been lost resolving compliance arguments since this began?`,
          },
        ];

        counterTheses = [
          `Top-down institutional bans address symptoms while failing to cultivate responsible personal decision-making.`,
          `Severing direct communication during an era of anxiety provokes intense parental and community revolt.`,
          `Shifting disciplinary enforcement onto frontline personnel degrades institutional morale and productivity.`,
        ];
        break;
      }

      case 'commerce_business': {
        summaryAngle =
          cycle === 1
            ? `The margin squeeze behind "${topic}": as ${name} accelerates expansion, rising overhead and customer churn threaten to overwhelm unit economics. The core question is whether rapid growth is masking a fragile operational foundation.`
            : `A pivotal commercial crossroad in "${topic}": ${name} must defend whether current growth metrics represent sustainable customer demand or a capital-intensive illusion vulnerable to sudden market shifts.`;

        if (hardDatapoints.length < 3) {
          hardDatapoints.push(
            {
              metricOrFact: `Unit gross margins vs operational overhead in "${topic}"`,
              context: `Financial strain caused by expanding footprint or retooling business operations.`,
              relevance: `Ask ${name} whether each incremental expansion contributes real net profit or accelerates cash burn.`,
            },
            {
              metricOrFact: `Core loyalist retention vs acquisition velocity`,
              context: `Churn rate among long-time customers reacting to strategic format or pricing changes.`,
              relevance: `Press the guest on whether pursuing new audiences is alienating the foundational customer base.`,
            },
            {
              metricOrFact: `12-month working capital runway and debt obligations`,
              context: `Liquidity required to survive potential supply chain disruption or demand softening.`,
              relevance: `Determine the exact timeline before the business must secure additional financing or cut overhead.`,
            }
          );
        }

        historicalPrecedents = [
          {
            analogyOrCase: 'Starbucks Aggressive Store Over-Expansion (2008)',
            lesson: 'Howard Schultz had to shutter 600 stores after opening locations faster than operational quality and local demand could support.',
            applicationToGuest: `Explore whether ${name} is risking brand dilution and cannibalization in pursuit of aggressive topline scale.`,
          },
          {
            analogyOrCase: 'Krispy Kreme Wholesale Saturation',
            lesson: 'Expanding into every gas station and grocery aisle destroyed the scarcity and line-around-the-block novelty that built the brand.',
            applicationToGuest: `Challenge ${name} on how to protect brand soul while pursuing rapid commercial distribution.`,
          },
        ];

        vulnerabilitiesAndPRSpin = [
          {
            talkingPoint: 'Customer demand is unprecedented and our expansion proves the viability of our model.',
            underlyingTension: 'Topline revenue growth is hiding negative cash flow and deteriorating service quality.',
            razorQuestion: `At what date does "${topic}" achieve self-sustaining cash flow without relying on outside capital reserves?`,
          },
          {
            talkingPoint: 'We maintain obsessive focus on quality and community integrity.',
            underlyingTension: 'Frontline employees are overwhelmed, and quality control metrics have slipped.',
            razorQuestion: `When you speak privately to your longest-tenured team members, what is the single biggest quality compromise they warn you about?`,
          },
        ];

        counterTheses = [
          `Rapid scaling before mastering unit economics is a proven path to enterprise insolvency.`,
          `Pursuing mass-market distribution inevitably dilutes the cult loyalty that established the initial brand.`,
          `Operating leverage cuts both ways: high fixed costs turn minor demand fluctuations into fatal losses.`,
        ];
        break;
      }

      case 'healthcare_science': {
        summaryAngle =
          cycle === 1
            ? `The clinical validation crisis in "${topic}": while ${name} heralds a breakthrough paradigm, researchers and oversight bodies demand empirical receipts. The interviewer must determine whether public enthusiasm has outpaced scientific rigor.`
            : `High-stakes ethics and efficacy in "${topic}": ${name} navigates the tension between aggressive therapeutic deployment and the methodical safety demands of institutional peer review.`;

        if (hardDatapoints.length < 3) {
          hardDatapoints.push(
            {
              metricOrFact: `Peer-reviewed trial replication baseline in "${topic}"`,
              context: `Independent laboratory verification of primary therapeutic or scientific claims.`,
              relevance: `Challenge ${name} on whether third-party institutions have replicated these findings under controlled conditions.`,
            },
            {
              metricOrFact: `Regulatory submission timeline and oversight milestones`,
              context: `Pending compliance clearances, FDA/ethics board inquiries, or investigative holds.`,
              relevance: `Force guest to address specific regulatory bottlenecks rather than promotional press statements.`,
            },
            {
              metricOrFact: `Patient/Subject adverse event threshold and monitoring`,
              context: `Safety margins and risk allocation protocols established for end users.`,
              relevance: `Ask ${name} what warning signs would prompt leadership to halt operations immediately.`,
            }
          );
        }

        historicalPrecedents = [
          {
            analogyOrCase: 'Aduhelm Alzheimer FDA Accelerated Clearance Controversy',
            lesson: 'Accelerating approval over advisory panel dissent resulted in widespread hospital boycotts and Medicare restriction.',
            applicationToGuest: `Ask ${name} how rushing past conservative clinical skepticism could backfire on broader institutional adoption.`,
          },
          {
            analogyOrCase: 'Jonas Salk Polio Vaccine Rollout Caution',
            lesson: 'The 1955 Cutter incident demonstrated that manufacturing shortcuts in life-saving science produce catastrophic trust loss.',
            applicationToGuest: `Probe the quality assurance safeguards ${name} has established to prevent execution failure.`,
          },
        ];

        vulnerabilitiesAndPRSpin = [
          {
            talkingPoint: 'Our data speaks for itself and represents an overdue paradigm shift in the field.',
            underlyingTension: 'Leading academic peers remain skeptical of sample sizes and lack of blinded controls.',
            razorQuestion: `Why haven't your findings been published in a top-tier peer-reviewed journal if the data is so conclusive?`,
          },
          {
            talkingPoint: 'Every day of bureaucratic delay costs vulnerable patients real relief.',
            underlyingTension: 'Safety shortcuts risk causing unpredicted harm and destroying public faith in the treatment.',
            razorQuestion: `If an independent audit challenges your core methodology tomorrow, do you stand by your claims under penalty of sanction?`,
          },
        ];

        counterTheses = [
          `Public relations momentum in healthcare can never substitute for blinded, randomized empirical evidence.`,
          `Aggressive patient advocacy cannot justify bypassing methodical regulatory checkpoints.`,
          `Scientific claims that cannot be replicated by skeptical third parties inevitably collapse under scrutiny.`,
        ];
        break;
      }

      case 'media_culture': {
        summaryAngle =
          cycle === 1
            ? `The creative integrity struggle in "${topic}": as commercial stakes escalate, ${name} faces questions over whether artistic voice has been compromised to appease algorithms, advertisers, or corporate benefactors.`
            : `Cultural resonance vs commercial reality in "${topic}": ${name} must defend whether the work challenges the cultural consensus or caters to a curated echo chamber for clicks and prestige.`;

        if (hardDatapoints.length < 3) {
          hardDatapoints.push(
            {
              metricOrFact: `Audience retention vs algorithmic distribution in "${topic}"`,
              context: `Dependence on third-party discovery channels and volatile platform recommendation engines.`,
              relevance: `Ask ${name} what percentage of audience relationships are direct versus rented from platform monopolies.`,
            },
            {
              metricOrFact: `Monetization model conversion and sustainability`,
              context: `Subscriber lifetime value, licensing agreements, or sponsor concentration risk.`,
              relevance: `Determine whether the project generates enduring economic independence or depends on fragile benefactor subsidies.`,
            },
            {
              metricOrFact: `Creative control and copyright ownership terms`,
              context: `Contractual distribution rights, creative vetoes, and derivative rights retained by creators.`,
              relevance: `Explore whether ${name} surrendered long-term artistic agency to secure initial funding.`,
            }
          );
        }

        historicalPrecedents = [
          {
            analogyOrCase: 'The New York Times Digital Paywall Pivot (2011)',
            lesson: 'Resisted industry calls for cheap programmatic traffic, betting everything on reader willingness to pay for premium substance.',
            applicationToGuest: `Ask ${name} if their creative endeavor has the courage to prioritize core depth over superficial mass reach.`,
          },
          {
            analogyOrCase: 'BuzzFeed News Algorithmic Distribution Collapse (2023)',
            lesson: 'Winning Pulitzer Prizes could not save an operation entirely dependent on Facebook algorithms that changed overnight.',
            applicationToGuest: `Examine how ${name} insulates their creative platform from sudden shifts in corporate distribution algorithms.`,
          },
        ];

        vulnerabilitiesAndPRSpin = [
          {
            talkingPoint: 'We are staying true to our voice while reaching audiences where they already live.',
            underlyingTension: 'The format and editorial choices are increasingly shaped by platform analytics rather than pure creative intent.',
            razorQuestion: `What is one creative compromise you made in "${topic}" specifically to juice algorithmic engagement?`,
          },
          {
            talkingPoint: 'Our work provides essential nuance in a world dominated by superficial headlines.',
            underlyingTension: 'The audience is largely an insular demographic that confirms preexisting biases.',
            razorQuestion: `Who is the harshest thoughtful critic of this work, and where do you admit their critique is right?`,
          },
        ];

        counterTheses = [
          `Cultural projects reliant on algorithmic discovery eventually become indistinguishable from the platforms hosting them.`,
          `Prizing ideological purity over sustainable commercial economics guarantees creative extinction.`,
          `True artistic breakthroughs alienate conventional audiences before building an enduring vanguard.`,
        ];
        break;
      }

      case 'tech_software': {
        summaryAngle =
          cycle === 1
            ? `The architecture gamble in "${topic}": while leadership touts technological superiority, ${name} must answer for mounting technical debt, high infrastructure costs, and legacy user frustration. The interviewer must press whether speed-to-market compromised product reliability.`
            : `A decisive architectural test in "${topic}": ${name} faces tough inquiries on whether this technology solves an urgent client workflow need or represents expensive engineering over-engineering in search of a problem.`;

        if (hardDatapoints.length < 3) {
          hardDatapoints.push(
            {
              metricOrFact: `Infrastructure unit economics & latency baseline in "${topic}"`,
              context: `Compute, cloud, or API cost per completed transaction under load.`,
              relevance: `Cross-examine ${name} on gross margins and whether infrastructure costs scale linearly or exponentially with usage.`,
            },
            {
              metricOrFact: `Legacy client migration resistance & workflow retention`,
              context: `Percentage of active users who actively resist or delay adopting the new system architecture.`,
              relevance: `Press the guest on whether existing power users are being alienated by forced feature deprecations.`,
            },
            {
              metricOrFact: `Technical debt and engineering maintenance overhead`,
              context: `Sprint velocity allocated to firefighting bugs versus shipping core roadmap commitments.`,
              relevance: `Ask ${name} what percentage of engineering bandwidth is currently consumed by non-deterministic failures.`,
            }
          );
        }

        historicalPrecedents = [
          {
            analogyOrCase: 'Basecamp Cloud Exit (2023)',
            lesson: 'DHH and Jason Fried rejected cloud vendor dogma, proving that rented infrastructure often inflates costs without delivering promised agility.',
            applicationToGuest: `Explore whether ${name} is over-reliant on third-party cloud and model APIs that dictate their unit economics.`,
          },
          {
            analogyOrCase: 'Digg v4 Redesign Revolt (2010)',
            lesson: 'Overhauling the user experience to favor commercial publishers triggered an overnight mass exodus to Reddit from which Digg never recovered.',
            applicationToGuest: `Ask if ${name} risks catastrophic user attrition by forcing architectural changes that clients did not request.`,
          },
        ];

        vulnerabilitiesAndPRSpin = [
          {
            talkingPoint: 'We are re-architecting the system to provide automated, scalable intelligence for the future.',
            underlyingTension: 'Customers want reliability and predictable deterministic workflows, not non-deterministic unpredictability.',
            razorQuestion: `When a mission-critical workflow fails silently in "${topic}", who is liable for the customer's lost business?`,
          },
          {
            talkingPoint: 'Our technical team is moving with extraordinary agility and shipping weekly improvements.',
            underlyingTension: 'Senior engineering leads are burning out trying to maintain backwards compatibility while rewriting the core stack.',
            razorQuestion: `How many senior engineers have raised written objections to the product release schedule in the past 60 days?`,
          },
        ];

        counterTheses = [
          `Engineering ambition without customer-validated pull results in complex monuments to founder hubris.`,
          `Non-deterministic systems carry hidden operational liabilities that enterprise compliance departments will reject.`,
          `Alienating existing core users in hopes of attracting hypothetical future users usually loses both.`,
        ];
        break;
      }

      case 'finance_capital': {
        summaryAngle =
          cycle === 1
            ? `The counterparty risk behind "${topic}": as market liquidity tightens, ${name} must defend whether reserve allocations, debt structures, and valuation assumptions can withstand a sustained macro stress test.`
            : `A high-stakes liquidity reckoning in "${topic}": ${name} faces sharp cross-examination on whether aggressive financial engineering has outstripped the underlying revenue realities of the business.`;

        if (hardDatapoints.length < 3) {
          hardDatapoints.push(
            {
              metricOrFact: `Net capital burn multiple and cash reserves in "${topic}"`,
              context: `Ratio of invested capital burned relative to new recurring revenue generated over the last 4 quarters.`,
              relevance: `Probe ${name} on how long the enterprise survives without closing an emergency down-round or debt extension.`,
            },
            {
              metricOrFact: `Counterparty exposure and collateral concentration`,
              context: `Concentration of credit risk or asset holdings tied to specific third-party institutions.`,
              relevance: `Ask ${name} what percentage of balance sheet reserves are vulnerable if a key counterparty defaults.`,
            },
            {
              metricOrFact: `Regulatory supervision and audit inquiries`,
              context: `Formal inquiries or disclosure demands from financial oversight bodies.`,
              relevance: `Force guest to address legal compliance exposure rather than forward-looking valuation multiples.`,
            }
          );
        }

        historicalPrecedents = [
          {
            analogyOrCase: 'Long-Term Capital Management (LTCM) Liquidity Crisis (1998)',
            lesson: 'Nobel-prize-winning mathematical models failed when unexpected market contagion broke historic correlations.',
            applicationToGuest: `Ask ${name} what tail-risk events their financial and liquidity models currently assume are impossible.`,
          },
          {
            analogyOrCase: 'WeWork Governance and Valuation Implosion (2019)',
            lesson: 'Rapid top-line expansion subsidized by venture capital collapsed once public markets demanded audited unit profitability.',
            applicationToGuest: `Examine whether ${name} has built a business with durable unit economics or merely an expensive growth facade.`,
          },
        ];

        vulnerabilitiesAndPRSpin = [
          {
            talkingPoint: 'Our balance sheet is robust and we have multiple pathways to profitability.',
            underlyingTension: 'The business model depends on cheap capital and cannot sustain higher borrowing costs.',
            razorQuestion: `If you cannot raise additional capital over the next 12 months, which business units are liquidated first?`,
          },
          {
            talkingPoint: 'We are pioneering a more efficient, decentralized financial mechanism.',
            underlyingTension: 'Retail participants absorb downside risk while insiders hold preferential liquidation rights.',
            razorQuestion: `In a worst-case restructuring, who gets paid back 100 cents on the dollar, and who takes the wipeout?`,
          },
        ];

        counterTheses = [
          `Financial structures that require continuous market euphoria inevitably unravel during liquidity contractions.`,
          `Conflating leverage with genius is the most recurring blunder in economic history.`,
          `When customer deposits or public funds are put at risk, regulatory retribution is swift and unsparing.`,
        ];
        break;
      }

      default: {
        // General / Leadership / Universal investigative framework
        summaryAngle =
          cycle === 1
            ? `The unspoken trade-offs in "${topic}": while ${name} presents a confident public face, internal compromises and dissenting perspectives reveal a precarious high-wire act. The interviewer must press on the reality behind the polished narrative.`
            : `A high-stakes inflection point in "${topic}": ${name} faces intense scrutiny on whether the strategic choices made here will stand as visionary leadership or an unforced institutional crisis.`;

        if (hardDatapoints.length < 3) {
          hardDatapoints.push(
            {
              metricOrFact: `The critical execution milestone in "${topic}"`,
              context: `The primary timeline commitment upon which the success or failure of this initiative hinges.`,
              relevance: `Cross-examine ${name} on what concrete objective evidence proves this milestone is on schedule.`,
            },
            {
              metricOrFact: `Internal stakeholder alignment and private dissent`,
              context: `Documented concerns raised by key team members or partners before public commitment.`,
              relevance: `Confront ${name} with the internal skepticism that leadership chose to override.`,
            },
            {
              metricOrFact: `Reputational and resource allocation risk`,
              context: `Resources, capital, or brand equity diverted from other core priorities to execute this plan.`,
              relevance: `Ask ${name} what the organization sacrifices elsewhere in order to finance and pursue this objective.`,
            }
          );
        }

        historicalPrecedents = [
          {
            analogyOrCase: 'The Johnson & Johnson Tylenol Recall (1982)',
            lesson: 'James Burke demonstrated that uncompromising transparency and immediate accountability salvages public trust during an existential crisis.',
            applicationToGuest: `Contrast this standard of radical transparency with the guarded public posture ${name} has taken in "${topic}".`,
          },
          {
            analogyOrCase: 'The Kodak Digital Dilemma',
            lesson: 'Organizational hesitation and defensive preservation of legacy models resulted in decadal irrelevance.',
            applicationToGuest: `Explore whether ${name} is boldly confronting reality or desperately defending a vulnerable status quo.`,
          },
        ];

        vulnerabilitiesAndPRSpin = [
          {
            talkingPoint: 'We are moving deliberately, learning continuously, and staying focused on our mission.',
            underlyingTension: 'The timeline has slipped and stakeholders are demanding concrete results rather than process reassurance.',
            razorQuestion: `If you step back from the talking points, what is the single biggest unforced error you have made in "${topic}" so far?`,
          },
          {
            talkingPoint: 'The entire organization is energized and united around this direction.',
            underlyingTension: 'Key contributors are quietly hedging their bets and questioning leadership judgment.',
            razorQuestion: `Who was the most credible voice in the room who told you this was a mistake, and why did you ignore them?`,
          },
        ];

        counterTheses = [
          `Visionary rhetoric cannot compensate for flawed operational execution.`,
          `Leaders who isolate themselves from critical internal dissent guarantee avoidable blunders.`,
          `Public trust squandered during a botched rollout takes years of painful rebuilding to recover.`,
        ];
        break;
      }
    }

    const originAndMotivationAngles = [
      `The Formative Crucible: The specific project, workflow failure, or late-night moment where conventional wisdom broke down and crystallized this conviction around "${topic}".`,
      `The Intellectual Arc: What ${name} originally believed when setting out, versus the critical turning point or failure that inverted that assumption.`,
      `Core Motivation & Stakes: What motivated or inspired this stance, and why taking this contrarian approach matters so much to the broader industry.`,
    ];

    return {
      guestName: name,
      guestTitleOrRole: role,
      summaryAngle,
      hardDatapoints: hardDatapoints.slice(0, 4),
      historicalPrecedents,
      vulnerabilitiesAndPRSpin,
      counterTheses,
      originAndMotivationAngles,
    };
  }

  /**
   * Classifies the domain of a topic and context text to pick the best journalistic analytical framework.
   */
  private detectDomain(
    topic: string,
    notes?: string
  ): 'civic_policy' | 'commerce_business' | 'healthcare_science' | 'media_culture' | 'tech_software' | 'finance_capital' | 'general' {
    const text = `${topic} ${notes || ''}`.toLowerCase();

    const scores = {
      civic_policy: 0,
      commerce_business: 0,
      healthcare_science: 0,
      media_culture: 0,
      tech_software: 0,
      finance_capital: 0,
      general: 1,
    };

    if (/\b(policy|policies|board|boards|school|schools|student|students|teacher|teachers|parent|parents|vote|voted|voting|council|city|mayor|ban|bans|banned|banning|law|laws|regulation|regulations|public|court|district|districts|union|unions|tax|taxes|government|civic|election|elections|curriculum|campus|campuses)\b/i.test(text)) {
      scores.civic_policy += 3;
    }
    if (/\b(retail|store|stores|shop|shops|baker|bakers|bakery|bakeries|baking|restaurant|restaurants|food|coffee|cafe|cafes|hotel|hotels|franchise|franchises|customer|customers|inventory|shipping|commerce|ecommerce|sales|brand|brands|flour|hospitality)\b/i.test(text)) {
      scores.commerce_business += 3;
    }
    if (/\b(health|doctor|doctors|patient|patients|clinic|clinics|hospital|hospitals|therapy|therapies|drug|drugs|pharma|bio|biotech|medicine|medicines|medical|disease|diseases|mental|fda|clinical|trial|trials|cancer|vaccine|vaccines)\b/i.test(text)) {
      scores.healthcare_science += 3;
    }
    if (/\b(book|books|author|authors|film|films|movie|movies|music|musician|art|artist|artists|media|journalism|journalist|press|podcast|podcasts|creative|publishing|publisher|publishers|essay|essays|writer|writers|actor|actors|album|albums|documentary|documentaries)\b/i.test(text)) {
      scores.media_culture += 3;
    }
    if (/\b(software|app|apps|platform|platforms|code|coding|cloud|api|apis|database|databases|ai|algorithm|algorithms|model|models|developer|developers|engineer|engineers|engineering|saas|cyber|tech|agent|agents|robot|robots|hardware|server|servers)\b/i.test(text)) {
      scores.tech_software += 3;
    }
    if (/\b(investor|investors|vc|vcs|venture|capital|fund|funds|valuation|equity|shares|debt|bank|banks|banking|crypto|token|tokens|defi|fintech|inflation|liquidity|wall street)\b/i.test(text)) {
      scores.finance_capital += 3;
    }

    let topDomain: 'civic_policy' | 'commerce_business' | 'healthcare_science' | 'media_culture' | 'tech_software' | 'finance_capital' | 'general' = 'general';
    let maxScore = scores.general;

    for (const [dom, score] of Object.entries(scores) as Array<[typeof topDomain, number]>) {
      if (score > maxScore) {
        maxScore = score;
        topDomain = dom;
      }
    }

    return topDomain;
  }

  /**
   * Helper to extract potential metrics, numbers, and facts from raw user text notes AND topic.
   */
  public extractReceiptsFromContext(
    topic: string,
    notes?: string
  ): Array<{ metricOrFact: string; context: string; relevance: string }> {
    const combined = `${notes || ''}\n${topic || ''}`.trim();
    if (!combined) return [];

    const results: Array<{ metricOrFact: string; context: string; relevance: string }> = [];
    const seen = new Set<string>();

    // Split text by lines and sentences
    const rawChunks = combined
      .split(/\n+|(?<=[.!?])\s+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 5);

    for (const chunk of rawChunks) {
      const hasCurrency = /\$[\d,.]+[kmb]?|\b\d+[kmb]?\s*(?:dollars|usd|cents|euros)\b/i.test(chunk);
      const hasPercent = /\b\d+(?:\.\d+)?%|\b\d+\s*percent\b/i.test(chunk);
      const hasQuantityWithNoun = /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b(?:\s+(?:campuses|schools|students|teachers|parents|users|customers|clients|accounts|orders|units|devices|employees|staff|headcount|engineers|locations|stores|patients|trials|cases|infractions|resigned|left|protested|voted|hours|days|weeks|months|years|dollars))\b/i.test(chunk);
      const hasNumber = /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/.test(chunk);

      if (hasCurrency || hasPercent || hasQuantityWithNoun || (hasNumber && chunk.length < 120)) {
        const parts = chunk.split(':');
        const label = parts.length > 1 && parts[0].length < 35 ? parts[0].trim() : 'Operational Metric';
        const val = parts.length > 1 && parts[0].length < 35 ? parts.slice(1).join(':').trim() : chunk;

        const cleanVal = val.replace(/^[•\-\*\s]+/, '').trim();
        const shortVal = cleanVal.length > 85 ? `${cleanVal.slice(0, 82)}...` : cleanVal;

        if (!seen.has(shortVal.toLowerCase())) {
          seen.add(shortVal.toLowerCase());
          results.push({
            metricOrFact: shortVal,
            context: `Extracted from user briefing context (${label}).`,
            relevance: `Cross-examine guest on the operational reality and verification of this claim.`,
          });
        }
      }

      if (results.length >= 5) break;
    }

    return results;
  }

  /**
   * Backwards compatible helper to extract receipts from raw user text notes.
   */
  private extractReceiptsFromText(text: string): Array<{ metricOrFact: string; context: string; relevance: string }> {
    return this.extractReceiptsFromContext('', text);
  }

  /**
   * Helper to format a structured briefing book into high-octane prompt text
   * to be ingested by Gemini Live or Rest Voice engines.
   */
  public static formatBriefingForPrompt(briefing: InterviewBriefingBook, personaDisplayName?: string): string {
    const factsList = briefing.hardDatapoints
      .map(
        (f, i) =>
          `  ${i + 1}. [METRIC/RECEIPT]: ${f.metricOrFact}\n     Context: ${f.context}\n     Weaponize: ${f.relevance}`
      )
      .join('\n');

    const precedentsList = briefing.historicalPrecedents
      .map(
        (p, i) =>
          `  ${i + 1}. [HISTORICAL PRECEDENT]: ${p.analogyOrCase}\n     Lesson: ${p.lesson}\n     Parallels to Guest: ${p.applicationToGuest}`
      )
      .join('\n');

    const landminesList = briefing.vulnerabilitiesAndPRSpin
      .map(
        (l, i) =>
          `  ${i + 1}. Anticipated PR Spin: "${l.talkingPoint}"\n     The Real Tension: ${l.underlyingTension}\n     Razor Trapdoor Question: "${l.razorQuestion}"`
      )
      .join('\n');

    const bearCasesList = briefing.counterTheses.map((c, i) => `  ${i + 1}. ${c}`).join('\n');

    const originsList = (briefing.originAndMotivationAngles && briefing.originAndMotivationAngles.length > 0)
      ? briefing.originAndMotivationAngles.map((o, i) => `  ${i + 1}. [GENESIS & ORIGIN ANGLE]: ${o}`).join('\n')
      : `  1. [GENESIS & ORIGIN ANGLE]: The formative project, workflow failure, or experiment that catalyzed this stance.\n  2. [INTELLECTUAL ARC]: What the guest originally believed vs what broke down to invert their thinking.\n  3. [CORE MOTIVATION]: What inspired or motivated this conviction.`;

    const targetPersona = personaDisplayName ? `FOR ${personaDisplayName.toUpperCase()}` : 'FOR THE INTERVIEWER';

    return `=== THE INVESTIGATIVE SHOW BRIEFING BOOK & HOMEWORK (${targetPersona}) ===
Guest: ${briefing.guestName || 'The Subject'}${briefing.guestTitleOrRole ? ` (${briefing.guestTitleOrRole})` : ''}
Central Narrative Tension: ${briefing.summaryAngle}

--- PHASE 1: FORMATIVE GENESIS & ORIGIN ANGLES ---
(MANDATORY: When opening the interview, explore how the guest arrived at this belief, the formative project/moment, and what motivated this thinking!)
${originsList}

--- HARD DATAPOINTS & FINANCIAL/OPERATIONAL RECEIPTS ---
(MANDATORY: You must actively cite and weaponize these specific figures and dates during the conversation!)
${factsList}

--- HISTORICAL PRECEDENTS & REAL-WORLD ANALOGIES ---
(Use these case studies to contextualize the stakes and draw sharp historical parallels!)
${precedentsList}

--- ANTICIPATED PR SPIN & RAZOR LANDMINES ---
(If the guest retreats into safe PR platitudes, immediately deploy the corresponding razor question!)
${landminesList}

--- CRITIC BEAR-CASES & COUNTER-THESES ---
(Voice these counter-arguments to ensure the guest cannot get away with unexamined assumptions!)
${bearCasesList}
============================================================`;
  }

  /**
   * Cleans potential code blocks and markdown from response text before parsing JSON.
   */
  private cleanAndParseJSON<T>(text: string): T | null {
    if (!text) return null;
    let clean = text.trim();

    // Match code fences anywhere in text
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      clean = codeBlockMatch[1].trim();
    } else {
      // Find outermost JSON object
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        clean = clean.substring(start, end + 1);
      }
    }

    try {
      return JSON.parse(clean) as T;
    } catch {
      // Try stripping trailing commas and control characters
      try {
        const sanitized = clean
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
        return JSON.parse(sanitized) as T;
      } catch (err) {
        console.warn('[ResearchProducer] JSON parse failed on cleaned text:', err);
        return null;
      }
    }
  }
}

export const researchProducer = new ResearchProducerService();
