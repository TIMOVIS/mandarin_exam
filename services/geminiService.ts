
import { Question, QuestionMode, Skill } from "../types";

// All Gemini API calls are now routed through the Netlify function
// This keeps the API key server-side and prevents it from being exposed in the build
const NETLIFY_FUNCTION_URL = '/.netlify/functions/gemini';

/**
 * Bulk generates diagnostic questions in a single LLM pass.
 * This is significantly faster than sequential individual requests.
 */
export const generateBulkQuestions = async (
  tasks: { topic: string; skill: Skill; difficulty: string; stage: number }[],
  studentName: string
): Promise<Question[]> => {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    You are an expert IGCSE Mandarin tutor. 
    Generate ${tasks.length} unique diagnostic questions for a Year 9 student named ${studentName}.

    TASKS TO GENERATE:
    ${tasks.map((t, i) => `${i+1}. Skill: ${t.skill}, Difficulty: ${t.difficulty}, Stage: ${t.stage}, Topic: ${t.topic}`).join('\n')}

    GLOBAL RULES:
    1. **BILINGUAL INSTRUCTIONS**: All instructions and questions must be in BOTH Chinese and English.
    2. **READING**: Passages in CHINESE ONLY. Questions must be bilingual.
    3. **LISTENING**: Mode 'Audio', provide a natural 'audioScript' in Chinese.
    4. **SPEAKING**: Conversational prompt in Chinese & English.
    5. **WRITING/GRAMMAR/VOCAB**: Contextual questions in Chinese & English.
    6. **FORMAT**: 
       - EASY: Multiple choice (provide 4 'options').
       - MEDIUM/HARD: Open-ended (no 'options').
    
    Return a JSON array of objects with this schema:
    {
      "questions": [
        {
          "content": "string (The question text)",
          "audioScript": "string (Optional, only for Listening)",
          "options": ["string"] (Optional, for MCQs),
          "correctAnswer": "string",
          "mode": "Text" | "Audio" | "Image",
          "timeLimit": number,
          "skill": "string",
          "difficulty": "string",
          "stage": number
        }
      ]
    }
  `;

  try {
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generateBulk',
        payload: { prompt }
      })
    });

    if (!response.ok) {
      throw new Error(`Netlify function error: ${response.statusText}`);
    }

    const result = await response.json();
    const data = JSON.parse(result.text || '{"questions":[]}');
    
    return data.questions.map((q: any) => ({
      id: crypto.randomUUID(),
      learningPointId: q.skill,
      mode: q.mode === "Audio" ? QuestionMode.Audio : q.mode === "Image" ? QuestionMode.Image : QuestionMode.Text,
      content: q.content,
      audioScript: q.audioScript,
      options: q.options && q.options.length > 0 ? q.options : undefined,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      timeLimit: q.timeLimit || 60,
      stage: q.stage
    }));
  } catch (error) {
    console.error("Bulk generation error:", error);
    throw error;
  }
};

/**
 * Generates a single diagnostic question (Legacy/Individual use).
 */
export const generateDiagnosticQuestion = async (
  topic: string,
  skill: Skill,
  difficulty: string,
  tutorContext?: string
): Promise<Question> => {
  const results = await generateBulkQuestions([{ topic, skill, difficulty, stage: 1 }], "Student");
  return results[0];
};

/**
 * Evaluates a student response.
 */
export const evaluateStudentResponse = async (
  question: string, 
  answer: string | { mimeType: string; data: string }, 
  correctAnswer: string
) => {
  const isMultimodal = typeof answer !== 'string';
  const model = 'gemini-3-flash-preview';
  
  const promptText = `
    Question: ${question}
    Correct/Ideal Answer: ${correctAnswer}
    Student Response Type: ${isMultimodal ? 'Media' : 'Text'}
    ${!isMultimodal ? `Student Answer: ${answer}` : ''}

    Evaluate this Mandarin response for correctness, grammar, and fluency.
    Return JSON: { "isCorrect": boolean, "score": number, "feedback": "string" }
  `;

  try {
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'evaluate',
        payload: {
          promptText,
          isMultimodal,
          inlineData: isMultimodal ? { 
            data: (answer as any).data, 
            mimeType: (answer as any).mimeType 
          } : undefined
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Netlify function error: ${response.statusText}`);
    }

    const result = await response.json();
    return JSON.parse(result.text || '{}');
  } catch (e) {
    console.error(e);
    return { isCorrect: false, score: 0, feedback: "Evaluation failed due to a connection error." };
  }
};
