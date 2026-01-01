
import { LearningPoint, Skill } from './types';

// Expanded Syllabus Roadmap to ensure coverage for all Skill/Stage combinations
export const SYLLABUS_roadmap: LearningPoint[] = [
  // Stage 1: Foundations (A1.1)
  { id: 'lp-1-1', stage: 1, skill: Skill.Listening, topic: 'Pinyin & Tones', description: 'Identify 4 tones and neutral tone.', status: 'unlocked', score: 0 },
  { id: 'lp-1-2', stage: 1, skill: Skill.Grammar, topic: 'Word Order', description: 'Subject-Verb-Object (SVO) basics.', status: 'unlocked', score: 0 },
  { id: 'lp-1-3', stage: 1, skill: Skill.Vocabulary, topic: 'Greetings', description: 'Survival vocabulary and self-intro.', status: 'unlocked', score: 0 },
  { id: 'lp-1-4', stage: 1, skill: Skill.Writing, topic: 'Strokes', description: '8 basic strokes and sequence.', status: 'unlocked', score: 0 },
  { id: 'lp-1-5', stage: 1, skill: Skill.Speaking, topic: 'Self-Introduction', description: 'Speaking clearly about your name, age, and nationality.', status: 'unlocked', score: 0 },
  { id: 'lp-1-6', stage: 1, skill: Skill.Reading, topic: 'Basic Characters', description: 'Recognizing numbers 1-100 and basic radicals.', status: 'unlocked', score: 0 },

  // Stage 2: Daily Language (A1.2)
  { id: 'lp-2-1', stage: 2, skill: Skill.Vocabulary, topic: 'School & Hobbies', description: 'Daily life, classroom items, meals.', status: 'locked', score: 0 },
  { id: 'lp-2-2', stage: 2, skill: Skill.Grammar, topic: 'Measure Words', description: '个, 本, 张, 辆, 件 basics.', status: 'locked', score: 0 },
  { id: 'lp-2-3', stage: 2, skill: Skill.Speaking, topic: 'Daily Routine', description: 'Simple descriptions of your day.', status: 'locked', score: 0 },
  { id: 'lp-2-4', stage: 2, skill: Skill.Reading, topic: 'Short Passages', description: 'Reading 80-100 character paragraphs.', status: 'locked', score: 0 },
  { id: 'lp-2-5', stage: 2, skill: Skill.Writing, topic: 'Simple Sentences', description: 'Constructing complete SVO sentences using common verbs.', status: 'locked', score: 0 },
  { id: 'lp-2-6', stage: 2, skill: Skill.Listening, topic: 'Classroom Instructions', description: 'Understanding teacher commands in Mandarin.', status: 'locked', score: 0 },

  // Stage 3: Context Communication (A2)
  { id: 'lp-3-1', stage: 3, skill: Skill.Listening, topic: 'Short Dialogues', description: 'Everyday scenarios: shopping, travel.', status: 'locked', score: 0 },
  { id: 'lp-3-2', stage: 3, skill: Skill.Speaking, topic: 'Directions', description: 'Locations and transportation terms.', status: 'locked', score: 0 },
  { id: 'lp-3-3', stage: 3, skill: Skill.Grammar, topic: 'Comparatives', description: 'Comparison with 比, 一样, 没有.', status: 'locked', score: 0 },
  { id: 'lp-3-4', stage: 3, skill: Skill.Writing, topic: 'Narrative', description: '150-character compositions about events.', status: 'locked', score: 0 },
  { id: 'lp-3-5', stage: 3, skill: Skill.Vocabulary, topic: 'Shopping', description: 'Currency, price negotiation, and clothing items.', status: 'locked', score: 0 },
  { id: 'lp-3-6', stage: 3, skill: Skill.Reading, topic: 'Public Signs', description: 'Understanding signs in subways, malls, and streets.', status: 'locked', score: 0 },

  // Stage 4: Range Expansion (B1)
  { id: 'lp-4-1', stage: 4, skill: Skill.Reading, topic: 'Context Clues', description: 'Skimming for gist in articles.', status: 'locked', score: 0 },
  { id: 'lp-4-2', stage: 4, skill: Skill.Grammar, topic: 'Ba/Bei Structures', description: 'Advanced object manipulation (把/被).', status: 'locked', score: 0 },
  { id: 'lp-4-3', stage: 4, skill: Skill.Listening, topic: 'Main Points', description: 'Key word extraction from longer audio.', status: 'locked', score: 0 },
  { id: 'lp-4-4', stage: 4, skill: Skill.Vocabulary, topic: 'Environment', description: 'Pollution, recycling, and technology.', status: 'locked', score: 0 },
  { id: 'lp-4-5', stage: 4, skill: Skill.Writing, topic: 'Letter Writing', description: 'Writing informal letters to friends about holidays.', status: 'locked', score: 0 },
  { id: 'lp-4-6', stage: 4, skill: Skill.Speaking, topic: 'Past Events', description: 'Narrating a story using proper time markers.', status: 'locked', score: 0 },

  // Stage 5: Accuracy & Style (B1+)
  { id: 'lp-5-1', stage: 5, skill: Skill.Writing, topic: 'Register & Style', description: 'Formal vs informal (Email vs Text).', status: 'locked', score: 0 },
  { id: 'lp-5-2', stage: 5, skill: Skill.Grammar, topic: 'Complex Conjunctions', description: '尽管...但是..., 不但...而且...', status: 'locked', score: 0 },
  { id: 'lp-5-3', stage: 5, skill: Skill.Speaking, topic: 'Debate', description: 'Expressing contrasting opinions.', status: 'locked', score: 0 },
  { id: 'lp-5-4', stage: 5, skill: Skill.Reading, topic: 'Paraphrasing', description: 'Recognizing reworded synonyms in text.', status: 'locked', score: 0 },
  { id: 'lp-5-5', stage: 5, skill: Skill.Vocabulary, topic: 'Media', description: 'Vocabulary for news, social media, and advertising.', status: 'locked', score: 0 },
  { id: 'lp-5-6', stage: 5, skill: Skill.Listening, topic: 'Radio Programs', description: 'Extracting specific details from fast-paced audio.', status: 'locked', score: 0 },

  // Stage 6: Mastery (B2 - IGCSE Readiness)
  { id: 'lp-6-1', stage: 6, skill: Skill.Reading, topic: 'Authentic Texts', description: 'Full IGCSE past paper reading texts.', status: 'locked', score: 0 },
  { id: 'lp-6-2', stage: 6, skill: Skill.Writing, topic: 'Long Composition', description: '250-300 character balanced essays.', status: 'locked', score: 0 },
  { id: 'lp-6-3', stage: 6, skill: Skill.Listening, topic: 'Exam Strategies', description: 'Predictive listening and inference.', status: 'locked', score: 0 },
  { id: 'lp-6-4', stage: 6, skill: Skill.Vocabulary, topic: 'Stylistic Variety', description: 'Idioms and high-level connectors.', status: 'locked', score: 0 },
  { id: 'lp-6-5', stage: 6, skill: Skill.Speaking, topic: 'Topic Presentation', description: '5-minute sustained talk on a chosen topic.', status: 'locked', score: 0 },
  { id: 'lp-6-6', stage: 6, skill: Skill.Grammar, topic: 'Advanced Particles', description: 'Nuanced use of 了, 着, 过 in complex contexts.', status: 'locked', score: 0 }
];
