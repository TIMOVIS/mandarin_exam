
import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionMode, Skill, AssessmentLog } from '../types';
import { generateDiagnosticQuestion, evaluateStudentResponse } from '../services/geminiService';
import { Volume2, Loader2, Image as ImageIcon, Mic, Upload, Type as TypeIcon, Square, RefreshCw, Clock } from 'lucide-react';

interface BaselineTestProps {
  onComplete: (results: Record<string, number>, logs: AssessmentLog[]) => void;
  targetSkill?: Skill;
  tutorContext?: string;
  testPlan?: Question[];
}

const QUESTIONS_PER_SKILL = 6;

const ALL_SKILLS = [
  Skill.Listening,
  Skill.Speaking,
  Skill.Reading,
  Skill.Writing,
  Skill.Vocabulary,
  Skill.Grammar
];

const BaselineTest: React.FC<BaselineTestProps> = ({ onComplete, targetSkill, tutorContext, testPlan }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [initialTime, setInitialTime] = useState<number>(0);
  const timerRef = useRef<any>(null);

  const [skillScores, setSkillScores] = useState<Record<string, { correct: number; total: number }>>({});
  const [assessmentLogs, setAssessmentLogs] = useState<AssessmentLog[]>([]);

  const [inputMode, setInputMode] = useState<'text' | 'audio' | 'image'>('text');
  const [textAnswer, setTextAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaData, setMediaData] = useState<{ mimeType: string; data: string } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeSkills = targetSkill ? [targetSkill] : ALL_SKILLS;
  const totalQuestions = testPlan ? testPlan.length : activeSkills.length * QUESTIONS_PER_SKILL;

  const skillIndex = Math.floor(step / QUESTIONS_PER_SKILL);
  const currentSkill = activeSkills[Math.min(skillIndex, activeSkills.length - 1)];

  useEffect(() => {
    loadNextQuestion();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  useEffect(() => {
    if (timeLeft > 0 && !evaluating) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, evaluating]);

  const handleTimeOut = () => {
    if (evaluating) return;
    let autoAnswer = "";
    if (inputMode === 'text' && textAnswer) autoAnswer = textAnswer;
    else if (mediaData) {
      handleAnswer(mediaData, 'confident');
      return;
    }
    handleAnswer(autoAnswer || "[Time Out - No Answer]", 'none');
  };

  const getAllowedInputs = (skill: Skill): ('text' | 'audio' | 'image')[] => {
    switch (skill) {
      case Skill.Speaking: return ['audio'];
      case Skill.Writing: return ['text', 'image'];
      default: return ['text', 'audio', 'image'];
    }
  };

  const allowedInputs = getAllowedInputs(currentSkill);

  useEffect(() => {
    if (currentQuestion && !currentQuestion.options) {
        const allowed = getAllowedInputs(currentSkill);
        if (!allowed.includes(inputMode)) {
            setInputMode(allowed[0]);
        }
    }
  }, [currentQuestion, currentSkill, inputMode]);

  const loadNextQuestion = async () => {
    if (step >= totalQuestions) {
      finishTest();
      return;
    }

    setLoading(true);
    resetInput();
    
    if (testPlan && testPlan.length > step) {
        const q = testPlan[step];
        setCurrentQuestion(q);
        const limit = q.timeLimit || 60;
        setTimeLeft(limit);
        setInitialTime(limit);
        setLoading(false);
        return;
    }
    
    const questionIndexInSkill = step % QUESTIONS_PER_SKILL;
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';
    if (questionIndexInSkill >= 2 && questionIndexInSkill < 4) difficulty = 'Medium';
    if (questionIndexInSkill >= 4) difficulty = 'Hard';

    const q = await generateDiagnosticQuestion("General IGCSE Assessment", currentSkill, difficulty, tutorContext);
    const limit = q.timeLimit || 60;
    setTimeLeft(limit);
    setInitialTime(limit);
    setCurrentQuestion({ ...q, learningPointId: currentSkill });
    setLoading(false);
  };

  const resetInput = () => {
    setTextAnswer("");
    setMediaData(null);
    setEvaluating(false);
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const finishTest = () => {
    const results: Record<string, number> = {};
    activeSkills.forEach(skill => {
      const s = skillScores[skill];
      if (s && s.total > 0) results[skill] = Math.round((s.correct / s.total) * 100);
      else results[skill] = 0;
    });
    onComplete(results, assessmentLogs);
  };

  const handleAnswer = async (
    answerInput: string | { mimeType: string; data: string }, 
    confidence: 'confident' | 'partial' | 'none'
  ) => {
    if (!currentQuestion || evaluating) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setEvaluating(true);
    const qSkill = currentQuestion.learningPointId;
    let isCorrect = false;
    let aiScore = 0;
    let feedbackText = "";
    let storedAnswer = "";

    if (typeof answerInput === 'string') storedAnswer = answerInput;
    else storedAnswer = `[Media Uploaded: ${answerInput.mimeType}]`;

    if (confidence === 'none' && !answerInput.toString().includes("[Time Out]")) {
        feedbackText = "Student indicated they did not understand the question.";
        isCorrect = false;
        storedAnswer = "[Skipped] " + storedAnswer;
    } else if (confidence === 'partial') {
        feedbackText = "Student partially understood but did not know the answer.";
        isCorrect = false;
        aiScore = 20; 
        storedAnswer = "[Partial] " + storedAnswer;
    } else {
        if (typeof answerInput === 'string' && currentQuestion.options) {
           isCorrect = answerInput === currentQuestion.correctAnswer;
           aiScore = isCorrect ? 100 : 0;
           feedbackText = isCorrect ? "Correct selection." : `Incorrect. Correct answer: ${currentQuestion.correctAnswer}`;
        } else {
           const evalResult = await evaluateStudentResponse(currentQuestion.content, answerInput, currentQuestion.correctAnswer || "");
           feedbackText = evalResult.feedback;
           aiScore = evalResult.score;
           isCorrect = evalResult.isCorrect || evalResult.score > 60;
        }
    }

    setSkillScores(prev => {
      const current = prev[qSkill] || { correct: 0, total: 0 };
      const scoreToAdd = confidence === 'none' ? 0 
        : confidence === 'partial' ? 0.2
        : (currentQuestion.options ? (isCorrect ? 1 : 0) : (aiScore / 100));
      return { ...prev, [qSkill]: { correct: current.correct + scoreToAdd, total: current.total + 1 } };
    });

    setAssessmentLogs(prev => [...prev, {
        id: crypto.randomUUID(),
        questionId: currentQuestion.id,
        questionContent: currentQuestion.content,
        skill: currentQuestion.learningPointId as Skill,
        studentAnswer: storedAnswer,
        evaluation: { isCorrect, score: aiScore, feedback: feedbackText },
        timestamp: new Date().toISOString()
    }]);

    setStep(prev => prev + 1);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          setMediaData({ mimeType: 'audio/webm', data: base64Data });
        };
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setMediaData({ mimeType: file.type, data: base64Data });
      };
      reader.readAsDataURL(file);
    }
  };

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin w-12 h-12 text-brand-500 mb-4" />
        <p className="text-slate-500">Preparing question {step + 1} of {totalQuestions}...</p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const progress = ((step + 1) / totalQuestions) * 100;
  const timePercentage = initialTime > 0 ? (timeLeft / initialTime) * 100 : 0;
  const displayContent = currentQuestion.mode === QuestionMode.Audio ? (currentQuestion.content || "请听录音 - Listen to the audio") : currentQuestion.content;
  const audioToPlay = currentQuestion.audioScript || currentQuestion.content;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6">
        <div className="flex justify-between text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-bold">
          <span>Overall Assessment Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-slate-800 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
           <div className={`h-full transition-all duration-1000 linear ${timePercentage < 20 ? 'bg-red-500' : timePercentage < 50 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${timePercentage}%` }} />
        </div>

        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center mt-1.5">
          <div className="flex items-center gap-4">
            <span className="bg-brand-900 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{currentQuestion.learningPointId}</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${timeLeft < 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
              <Clock size={12} /> {timeLeft}s
            </div>
          </div>
          <span className="text-slate-400 font-mono text-xs">Task {step + 1} of {totalQuestions}</span>
        </div>

        <div className="p-10">
          <div className="mb-10 text-center">
            {currentQuestion.mode === QuestionMode.Audio && (
              <button onClick={() => playAudio(audioToPlay)} className="flex items-center justify-center gap-3 bg-brand-50 hover:bg-brand-100 text-brand-700 px-8 py-6 rounded-2xl w-full transition-all group mb-6 border border-brand-100">
                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><Volume2 size={24} /></div>
                <span className="font-bold text-lg">播放录音 / Play Audio</span>
              </button>
            )}
            {currentQuestion.mode === QuestionMode.Image && (
              <div className="bg-slate-50 rounded-2xl h-64 flex flex-col items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-slate-400 font-medium px-8 text-center text-sm">[Image Content: {currentQuestion.content.replace(/\[.*?\]/g, '')}]</p>
              </div>
            )}
            <h2 className="text-2xl font-bold text-slate-800 leading-tight whitespace-pre-line">{currentQuestion.mode === QuestionMode.Image ? "请描述这张图片 / Describe the image" : displayContent}</h2>
          </div>

          {!currentQuestion.options && (
            <div className="flex justify-center mb-8 p-1 bg-slate-100 rounded-xl w-fit mx-auto">
              {allowedInputs.includes('text') && <button onClick={() => setInputMode('text')} className={`px-6 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${inputMode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><TypeIcon size={14} /> TEXT</button>}
              {allowedInputs.includes('audio') && <button onClick={() => setInputMode('audio')} className={`px-6 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${inputMode === 'audio' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Mic size={14} /> AUDIO</button>}
              {allowedInputs.includes('image') && <button onClick={() => setInputMode('image')} className={`px-6 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${inputMode === 'image' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ImageIcon size={14} /> IMAGE</button>}
            </div>
          )}

          <div className="space-y-6 max-w-xl mx-auto">
            {currentQuestion.options ? (
              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((opt, idx) => (
                  <button key={idx} onClick={() => handleAnswer(opt, 'confident')} disabled={evaluating} className="p-5 text-left rounded-2xl border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50/50 transition-all font-bold text-slate-700 disabled:opacity-50 flex justify-between items-center group">
                    <span>{opt}</span>
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-brand-500 transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="relative">
                {inputMode === 'text' && allowedInputs.includes('text') && (
                  <div className="space-y-4">
                    <textarea className="w-full p-6 rounded-2xl border-2 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none min-h-[160px] text-lg resize-none disabled:opacity-50 transition-all font-medium" placeholder="Type your Chinese response here..." disabled={evaluating} value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} />
                    <button onClick={() => handleAnswer(textAnswer, 'confident')} disabled={evaluating || !textAnswer.trim()} className="w-full py-4 bg-slate-900 text-white rounded-2xl hover:bg-brand-600 font-bold shadow-xl shadow-slate-900/10 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95">{evaluating ? <Loader2 className="animate-spin" size={20} /> : "Submit Answer"}</button>
                  </div>
                )}
                {inputMode === 'audio' && allowedInputs.includes('audio') && (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    {!mediaData ? (
                      <button onClick={isRecording ? stopRecording : startRecording} disabled={evaluating} className={`p-10 rounded-full transition-all shadow-xl ${isRecording ? 'bg-red-500 animate-pulse text-white shadow-red-500/30' : 'bg-slate-900 text-white hover:bg-brand-600 shadow-slate-900/20 disabled:opacity-50 active:scale-95'}`}>{isRecording ? <Square size={40} /> : <Mic size={40} />}</button>
                    ) : (
                      <div className="flex flex-col items-center gap-6 w-full">
                        <div className="px-6 py-3 bg-brand-50 text-brand-700 rounded-2xl border border-brand-100 font-bold flex items-center gap-2"><Volume2 size={18} /> Recording Captured</div>
                        <div className="flex gap-4 w-full">
                          <button onClick={() => setMediaData(null)} disabled={evaluating} className="flex-1 px-4 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-800 bg-slate-100 transition-colors flex items-center justify-center gap-2"><RefreshCw size={16} /> REDO</button>
                          <button onClick={() => handleAnswer(mediaData, 'confident')} disabled={evaluating} className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95">{evaluating ? <Loader2 className="animate-spin" size={20} /> : "Submit Recording"}</button>
                        </div>
                      </div>
                    )}
                    <p className="mt-6 text-slate-400 text-xs font-bold uppercase tracking-widest">{isRecording ? "Listening..." : !mediaData ? "Record your answer" : ""}</p>
                  </div>
                )}
                {inputMode === 'image' && allowedInputs.includes('image') && (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    {!mediaData ? (
                      <label className={`cursor-pointer flex flex-col items-center ${evaluating ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm mb-4 hover:shadow-md hover:border-brand-500 transition-all group"><Upload size={40} className="text-slate-400 group-hover:text-brand-500 transition-colors" /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upload your writing</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={evaluating} />
                      </label>
                    ) : (
                      <div className="flex flex-col items-center gap-6 w-full">
                        <div className="relative group w-full max-w-[200px] aspect-square overflow-hidden rounded-2xl border border-slate-200"><img src={`data:${mediaData.mimeType};base64,${mediaData.data}`} alt="Answer preview" className="w-full h-full object-cover"/></div>
                        <div className="flex gap-4 w-full">
                          <button onClick={() => setMediaData(null)} disabled={evaluating} className="flex-1 px-4 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-800 bg-slate-100 transition-colors flex items-center justify-center gap-2"><RefreshCw size={16} /> REPLACE</button>
                          <button onClick={() => handleAnswer(mediaData, 'confident')} disabled={evaluating} className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95">{evaluating ? <Loader2 className="animate-spin" size={20} /> : "Submit Image"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100">
            {evaluating ? (
              <div className="p-5 rounded-2xl text-center font-bold text-brand-600 bg-brand-50 animate-pulse uppercase tracking-widest text-xs">AI Evaluating proficiency...</div>
            ) : (
              <div className="flex gap-4 justify-center">
                <button onClick={() => handleAnswer("", "partial")} className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all">Uncertain Answer</button>
                <button onClick={() => handleAnswer("", "none")} className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">Skip Task</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaselineTest;
