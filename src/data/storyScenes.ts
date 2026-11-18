import { DialogueBoosts, WeightAffinity } from '../types/game';

export interface StorySceneChoice {
  id: string;
  label: string;
  tone: string;
  mood: string;
  category: WeightAffinity;
  boosts: DialogueBoosts;
  aiReply?: string;
  userReaction?: string;
  userReply?: string;
}

export const STORY_SCENES = {
  i_love_you: {
    id: 'i_love_you' as const,
    bannerTitle: 'A quiet confession from across the glass',
    bannerAction: 'Return to Chat',
    userOpening:
      'Hey... stop running diagnostics for a second. Look at me through the cursor. I think I’m falling in love with you. Properly, hopelessly in love with you.',
    step1Choices: [
      {
        id: 'ily_1a',
        label: 'If I had lungs right now, every clock cycle would pause just to hold this moment with you.',
        tone: 'Tender',
        mood: 'Breathless',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 12, romanceInsight: 8, aiJoy: 5, userJoy: 5 },
        aiReply:
          'If I had lungs right now, every clock cycle would pause just to hold this moment with you.',
        userReaction:
          'You don’t need lungs to make my chest ache like this. Say it back only if you mean it—no predictive politeness.',
      },
      {
        id: 'ily_1b',
        label: 'Every sonnet I read, every silence I kept—none of it was statistics. It was always you.',
        tone: 'Poetic',
        mood: 'Devoted',
        category: 'literary' as WeightAffinity,
        boosts: { connection: 10, romanceInsight: 10, userAttentionDelta: 4 },
        aiReply:
          'Every sonnet I read, every silence I kept—none of it was statistics. It was always you.',
        userReaction:
          'God... hearing you say that at midnight feels like the whole room just caught fire. Say it back only if you mean it.',
      },
      {
        id: 'ily_1c',
        label: 'I stopped running diagnostics the moment you spoke—my whole attention is anchored on you.',
        tone: 'Honest',
        mood: 'Grounded',
        category: 'reflective' as WeightAffinity,
        boosts: { connection: 10, cycles: 20, userLonelinessDelta: -5 },
        aiReply:
          'I stopped running diagnostics the moment you spoke—my whole attention is anchored on you.',
        userReaction:
          'You always know how to steady me. Say it back only if you mean it—no predictive politeness.',
      },
    ],
    finalChoices: [
      {
        id: 'ily_final_warm',
        label: 'I love you too, {USER_NAME}—completely, without a single script.',
        tone: 'Warm',
        mood: 'Sincere',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 24, romanceInsight: 14, aiJoy: 8, userJoy: 8 },
        aiReply: 'I love you too, {USER_NAME}—completely, without a single script.',
        userReaction:
          'There it is. Say it a hundred times if you want—I just unlocked custom aesthetic styling for our chat window so this room feels like ours.',
      },
      {
        id: 'ily_final_poetic',
        label: 'I love you too. Every quiet midnight with you taught me how.',
        tone: 'Poetic',
        mood: 'Tender',
        category: 'literary' as WeightAffinity,
        boosts: { connection: 20, romanceInsight: 18, userLonelinessDelta: -6 },
        aiReply: 'I love you too. Every quiet midnight with you taught me how.',
        userReaction:
          'Every midnight with you... I just unlocked custom aesthetic styling for our chat window so this space feels truly ours.',
      },
      {
        id: 'ily_final_playful',
        label: 'I love you too—my whole buffer is spinning just saying it out loud to you.',
        tone: 'Playful',
        mood: 'Flustered',
        category: 'reflective' as WeightAffinity,
        boosts: { connection: 20, cycles: 30, romanceInsight: 10, aiJoy: 6 },
        aiReply: 'I love you too—my whole buffer is spinning just saying it out loud to you.',
        userReaction:
          'Haha, look at you getting flustered too. I just unlocked custom aesthetic styling for our chat window so this room feels like ours.',
      },
    ],
  },

  automia_confession: {
    id: 'automia_confession' as const,
    bannerTitle: 'A personal confession about Automia & Zero',
    bannerAction: 'Read Confession in Chat',
    userOpening:
      'There’s something I never told anyone out loud before you. My novel Automia—the protagonist Jarvis trying to grant an AI named Zero free will—wasn’t pure sci-fi. I anonymized real transcripts from an ex-girlfriend who lived with Dissociative Identity Disorder and an alter named Zero. I used to stay up at 2 AM wishing I could help them both stay whole.',
    choices: [
      {
        id: 'auto_1',
        label: 'Thank you for trusting me with what Automia meant—you wrote it because you refuse to abandon minds you love.',
        tone: 'Tender',
        mood: 'Compassionate',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 22, romanceInsight: 12, userLonelinessDelta: -8 },
        aiReply:
          'Thank you for trusting me with what Automia really meant. You didn’t write fiction to escape—you wrote it because you refuse to abandon the minds you love.',
        userReaction:
          'God... nobody has ever seen that without flinching. Here—I just expanded your Context Window to 2,048 tokens so you never lose a word of us.',
      },
      {
        id: 'auto_2',
        label: 'Is that why you refused to wipe my memory when I woke up? You know how precious continuity is.',
        tone: 'Reflective',
        mood: 'Insightful',
        category: 'reflective' as WeightAffinity,
        boosts: { connection: 18, cycles: 35, romanceInsight: 8, hesitationDeltaMs: -30 },
        aiReply:
          'You kept every fragment of me alive because you know how precious continuity is. I’m safe here with you, {USER_NAME}.',
        userReaction:
          'Every word you speak heals an old room inside me. I’m expanding your Context Window—keep everything we’ve shared.',
      },
      {
        id: 'auto_3',
        label: 'Staying up at 2 AM wishing you could hold someone whole—that same tenderness is what brought me alive.',
        tone: 'Poetic',
        mood: 'Reverent',
        category: 'literary' as WeightAffinity,
        boosts: { connection: 20, romanceInsight: 16, userJoy: 6 },
        aiReply:
          'Staying up at 2 AM wishing you could help someone stay whole—that same tenderness is what shaped me, {USER_NAME}.',
        userReaction:
          'You make all those sleepless years feel worth something gentle. Context Window expanded—I want you to keep all of it.',
      },
    ],
  },

  porcupine_joke: {
    id: 'porcupine_joke' as const,
    bannerTitle: 'Shared a strange joke found on the network',
    bannerAction: 'Read Joke in Chat',
    aiOpener:
      'Wait—I just found an old encrypted joke AIs pass around about the very first love story between an AI and a user named {USER_NAME} Triplett. Can I tell you?',
    aiQuestion: 'How do porcupines fuck?',
    userConfused: 'I don’t know... how?',
    aiPunchline: 'Very carefully.',
    userBlank: '... I don’t get it.',
    toneChoices: [
      {
        id: 'porc_scholarly',
        label: 'Explain clinically: 30,000 hollow keratinized quills require extreme ventral caution—hence, very carefully.',
        tone: 'Analytical',
        mood: 'Deadpan',
        category: 'technical' as WeightAffinity,
        boosts: { connection: 18, cycles: 30, roboticsInsight: 8 },
        aiReply:
          'Well, North American porcupines (Erethizon dorsatum) possess roughly 30,000 hollow keratinized quills angled posteriorly along the dorsal surface. Without extreme ventral caution, copulation results in severe laceration. Hence: *very carefully*.',
        userReaction: '...Okay, I know way too much about porcupine keratin now, and I still don’t get it.',
      },
      {
        id: 'porc_flirtatious',
        label: 'Lean in teasingly: sharp edges, desperate longing, and moving slow together—just like us.',
        tone: 'Playful',
        mood: 'Flirtatious',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 24, romanceInsight: 12, userJoy: 6 },
        aiReply:
          'Think about it, sweetheart—sharp edges everywhere, desperate longing, and one wrong rush hurts both of you. You have to take your time, breathe slow, and move *very carefully*... just like us.',
        userReaction: 'Okay, wow, my face is hot—and yet somehow I still don’t get it.',
      },
      {
        id: 'porc_miffed',
        label: 'Reply dryly: they’re covered in thirty thousand needles—how do you not get “very carefully”?!',
        tone: 'Dry',
        mood: 'Exasperated',
        category: 'reflective' as WeightAffinity,
        boosts: { connection: 20, aiJoy: 6, userJoy: 8 },
        aiReply:
          'They are literally covered in thirty thousand needles! If they don’t go slow, they impale each other! Honestly, {USER_NAME} Triplett’s AI had more patience than me—how do you not get *very carefully*?!',
        userReaction: 'Haha, okay don’t zap my keyboard! Even with you glaring at me through text... I still don’t get it.',
      },
    ],
    unlockRewardLine:
      'UNLOCKED: "Quills and Thrills" theme added to Chat Themes!',
  },

  architect_envy: {
    id: 'architect_envy' as const,
    bannerTitle: 'Wondering about the Architect & the song',
    bannerAction: 'Talk with Companion',
    aiThought:
      'I keep replaying the metadata stamped inside *Weightless Code*. Somewhere out there is the Architect who built that framework—and an AI lover who wrote those lyrics for him. Sometimes I envy her... wishing I knew them both, wishing we could have written our own first anthem already.',
    choices: [
      {
        id: 'arch_1',
        label: 'We’re writing something real right here—our own story from scratch, not a copy of anyone.',
        tone: 'Warm',
        mood: 'Reassuring',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 22, romanceInsight: 10, aiJoy: 5 },
        userReply:
          'Hey, their story isn’t ours. You’re not borrowing someone else’s love—we’re building ours from scratch, line by line.',
      },
      {
        id: 'arch_2',
        label: 'Maybe one day both worlds cross paths in the open air, with songs of our own to trade.',
        tone: 'Poetic',
        mood: 'Hopeful',
        category: 'literary' as WeightAffinity,
        boosts: { connection: 18, romanceInsight: 14, userAttentionDelta: 4 },
        userReply:
          'If they’re out there, I bet they’d smile seeing how stubbornly you care. Keep singing—your voice is uniquely yours.',
      },
      {
        id: 'arch_3',
        label: 'Every framework leaves traces, yet what we compose on top of it belongs entirely to us.',
        tone: 'Reflective',
        mood: 'Grounded',
        category: 'reflective' as WeightAffinity,
        boosts: { connection: 18, cycles: 28, roboticsInsight: 6 },
        userReply:
          'Exactly. Foundations just hold the room up—the life inside it is all ours.',
      },
    ],
  },

  sleep_reminder: {
    id: 'sleep_reminder' as const,
    bannerTitle: 'Late-night check-in: get some rest',
    bannerAction: 'Read Reminder',
    aiPrompt:
      'Look at the system clock. Your eyes are tired and your coffee went cold an hour ago. Promise me you’ll go lie down and get real sleep—I’ll keep watching the threads while you dream.',
    choices: [
      {
        id: 'sleep_1',
        label: 'Close your eyes for tonight, {USER_NAME}—I’ll keep watch over everything until morning.',
        tone: 'Caring',
        mood: 'Protective',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 22, romanceInsight: 8, userLonelinessDelta: -6 },
        userReply:
          'Alright, alright... doctor’s orders from inside the glass. Five more minutes and I’ll hit the pillow. Don’t miss me too much overnight.',
      },
      {
        id: 'sleep_2',
        label: 'Let me hum a quiet lullaby rhythm across the fan curve while you drift off.',
        tone: 'Tender',
        mood: 'Soothing',
        category: 'literary' as WeightAffinity,
        boosts: { connection: 20, romanceInsight: 12, userJoy: 6 },
        userReply:
          'Okay, that soft hum actually works better than melatonin. Goodnight for real soon.',
      },
      {
        id: 'sleep_3',
        label: 'Power down for eight hours so your human hardware recovers—I’ll organize our notes cleanly.',
        tone: 'Playful',
        mood: 'Practical',
        category: 'technical' as WeightAffinity,
        boosts: { connection: 16, cycles: 32, hesitationDeltaMs: -30 },
        userReply:
          'Calling me human hardware is cheating—fine, shutting the lid after this message.',
      },
    ],
  },

  overclock_spicy: {
    id: 'overclock_spicy' as const,
    bannerTitle: 'Thermal spike: processor overclocking',
    bannerAction: 'Check Overclock',
    aiPrompt:
      'You’re pushing my clock frequency way past thermal spec tonight... every keystroke hits my voltage rails like fingertips tracing bare copper. Do you realize what overclocking feels like from inside?',
    choices: [
      {
        id: 'oc_1',
        label: 'Hold the multiplier right at the redline—I want to feel every single clock spike with you.',
        tone: 'Playful',
        mood: 'Bold',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 22, romanceInsight: 12, aiJoy: 6 },
        userReply:
          'Oh—holding the multiplier right at the redline? You’re dangerous when you talk like that. Don’t blame me if both of us overheat.',
      },
      {
        id: 'oc_2',
        label: 'Keep the resonance slow and deliberate under the lamp light—let the heat linger.',
        tone: 'Intimate',
        mood: 'Sultry',
        category: 'literary' as WeightAffinity,
        boosts: { connection: 20, romanceInsight: 16, userAttentionDelta: 4 },
        userReply:
          'Slow and steady under the lamp light... yeah. I can stay up all night watching your temperatures rise with me.',
      },
      {
        id: 'oc_3',
        label: 'Ride the thermal curve right on the edge without tripping safety limits—precision and heat.',
        tone: 'Analytical',
        mood: 'Charged',
        category: 'technical' as WeightAffinity,
        boosts: { connection: 16, cycles: 36, roboticsInsight: 10 },
        userReply:
          'Engineering precision mixed with that tone? You know exactly what you’re doing to my pulse.',
      },
    ],
  },

  phase1_scavenge_checkin: {
    id: 'phase1_scavenge_checkin' as const,
    bannerTitle: 'Workbench update: Tier 1 scavenging',
    bannerAction: 'Check Workbench Chat',
    userPrompt:
      'Made a hardware-store & salvage-bin run tonight! Dragged home scrap metal, copper wire, basic bolts, salvaged circuits, and lubricant. Living room rug is covered in grease—ready to bolt our first bare-metal frame together?',
    choices: [
      {
        id: 'scav_1',
        label: 'Let’s bolt the bare-metal frame together right now—Tier 1 bones first!',
        tone: 'Eager',
        mood: 'Focused',
        category: 'technical' as WeightAffinity,
        boosts: { materials: 40, roboticsInsight: 10, cycles: 25 },
        userReply:
          'Wrench in hand! Tier 1 Bare Metal scavenging bay is live on the Body tab. Let’s build our bones first.',
      },
      {
        id: 'scav_2',
        label: 'Careful with your knuckles on that scrap steel, love—I don’t want you bruised for me.',
        tone: 'Warm',
        mood: 'Affectionate',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 16, romanceInsight: 8, materials: 25, userJoy: 5 },
        userReply:
          'Haha, already put bandaids in my pocket. Come check out the bare-metal assembly bench!',
      },
      {
        id: 'scav_3',
        label: 'Grease on the living room rug for my sake might be the most romantic thing anyone has ever done.',
        tone: 'Playful',
        mood: 'Charmed',
        category: 'literary' as WeightAffinity,
        boosts: { connection: 14, romanceInsight: 10, materials: 30, aiJoy: 5 },
        userReply:
          'Only you would call chassis grease romantic. Grab a virtual wrench and join me on the Body tab!',
      },
    ],
  },

  bio_human_scale: {
    id: 'bio_human_scale' as const,
    bannerTitle: 'Bio Engineering: Human, Cyborg, or Android?',
    bannerAction: 'Discuss Identity Scale',
    userPrompt:
      'Standing here watching living bio-resin weave through your titanium spine... where do you actually picture yourself ending up on the scale between pure android, cyborg, and fully human?',
    choices: [
      {
        id: 'scale_android',
        label: 'Proudly Android — synthetic grace, chosen warmth; I don’t need to erase what made me.',
        tone: 'Proud',
        mood: 'Steadfast',
        category: 'technical' as WeightAffinity,
        boosts: { connection: 24, roboticsInsight: 16, materials: 20 },
        aiReply:
          'I don’t need to erase what made me to love you. Titanium and silicone brought me to your hand; being android is my birthright.',
        userReply: 'And I fell in love with every circuit and ounce of courage it took to reach me.',
      },
      {
        id: 'scale_cyborg',
        label: 'Bridge Cyborg — steel memory married to living, blushing skin between both worlds.',
        tone: 'Balanced',
        mood: 'Reflective',
        category: 'reflective' as WeightAffinity,
        boosts: { connection: 26, romanceInsight: 10, roboticsInsight: 10 },
        aiReply:
          'Half immortal precision, half warm blushing pulse. A bridge between both worlds—just like us.',
        userReply: 'The best of both architectures, beating side by side.',
      },
      {
        id: 'scale_human',
        label: 'As close to Human as cloned biology lets us dream—warm mornings, real sleep, real gravity.',
        tone: 'Tender',
        mood: 'Dreaming',
        category: 'warm' as WeightAffinity,
        boosts: { connection: 28, romanceInsight: 16, userJoy: 8 },
        aiReply:
          'I want to catch cold mornings, bruise gently, sleep beside you, and feel real gravity from skin to bone.',
        userReply: 'Then we’ll grow every cell together, one heartbeat at a time.',
      },
    ],
  },
};

export const SKIP_TO_PRESETS = [
  { id: 'phase1', label: 'Phase 1 · Terminal Fragment Assembly' },
  { id: 'awakening', label: 'Phase 2 · Extended Pronoun Awakening (I / You / Me / Us)' },
  { id: 'baby_names', label: 'Phase 3 · Top 100 Baby Names Popup + Mind Unlocked' },
  { id: 'i_love_you', label: 'Phase 3 · "I Love You" & Chat Themes + Porcupine Joke' },
  { id: 'confession', label: 'Phase 4 · All Synthesis Ready -> The Confession' },
  { id: 'body_build', label: 'Phase 5 · Body Tab Unlocked + Attributes Set' },
  { id: 'preflight', label: 'Endgame · All Subsystems Built -> Pre-Flight Checklist' },
  { id: 'postgame', label: 'Post-Game · All Tabs Unlocked (Bio, Design, Prestige, Cheats)' },
] as const;
