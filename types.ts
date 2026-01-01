
export enum Skill {
  Listening = 'Listening',
  Speaking = 'Speaking',
  Reading = 'Reading',
  Writing = 'Writing',
  Vocabulary = 'Vocabulary',
  Grammar = 'Grammar'
}

export enum QuestionMode {
  Text = 'Text',
  Audio = 'Audio',
  Image = 'Image'
}

export interface LearningPoint {
  id: string;
  stage: number;
  skill: Skill;
  topic: string;
  description: string;
  status: 'locked' | 'unlocked' | 'in-progress' | 'weak' | 'mastered';
  score?: number;
  appealActive?: boolean;
}

export interface Question {
  id: string;
  learningPointId: string;
  mode: QuestionMode;
  content: string;
  audioScript?: string;
  mediaUrl?: string;
  options?: string[];
  correctAnswer?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeLimit?: number;
}

export interface AssignedTest {
  id: string;
  title: string;
  createdAt: string;
  completedAt?: string;
  questions: Question[];
  overallScore?: number;
}

export interface StudentResponse {
  questionId: string;
  answer: string;
  confidenceLevel: 'confident' | 'understand-question-only' | 'lost';
}

export interface AssessmentLog {
  id: string; // Unique ID for each log entry
  testId?: string;
  questionId: string;
  questionContent: string;
  skill: Skill;
  studentAnswer: string;
  evaluation: {
    isCorrect: boolean;
    score: number;
    feedback: string;
    tutorFeedback?: string; // Optional manual feedback from tutor
    isOverridden?: boolean; // Flag to indicate manual override
  };
  timestamp: string;
}

export enum AppState {
  Landing = 'Landing',
  TutorPlanning = 'TutorPlanning',
  Welcome = 'Welcome',
  Dashboard = 'Dashboard',
  Baseline = 'Baseline',
  Tutor = 'Tutor'
}
