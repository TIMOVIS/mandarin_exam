
import React, { useState, useRef } from 'react';
import { Question, Skill, QuestionMode, LearningPoint, AssignedTest, AssessmentLog } from '../types';
import { SYLLABUS_roadmap } from '../constants';
import { generateBulkQuestions } from '../services/geminiService';
import Timeline from './Timeline';
import { Loader2, Send, Play, CheckCircle, ArrowLeft, Users, Filter, Check, History, Plus, Trash2, ClipboardList, Clock, BarChart3, CheckCircle2, XCircle, ArrowRight, LayoutDashboard, Edit3, Save, RotateCcw, Download, AlertTriangle, Layers, Settings2, Sparkles, StopCircle, Pencil } from 'lucide-react';

interface TestPlannerProps {
  studentName: string;
  onSaveTests: (tests: AssignedTest[]) => void;
  existingTests: AssignedTest[];
  onBackToRoster: () => void;
  assessmentLogs: AssessmentLog[];
  points: LearningPoint[];
  onTutorEdit: (id: string, newScore: number) => void;
  onUpdateLog: (logId: string, updates: Partial<AssessmentLog['evaluation']>) => void;
  onGenerateReport: (action: 'view' | 'download') => void;
}

const SKILLS_LIST = Object.values(Skill);
const STAGES_LIST = [1, 2, 3, 4, 5, 6];
const DIFFICULTIES: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];

const REASSURING_MESSAGES = [
  "Bulk-processing IGCSE-aligned reading passages...",
  "Synthesizing custom audio scripts for listening tasks...",
  "Generating context-aware grammar challenges...",
  "Filtering vocabulary for Year 9 proficiency levels...",
  "Optimizing question difficulty mix...",
  "Constructing multi-modal assessment tasks...",
  "Finalizing Chinese-English bilingual instructions..."
];

const TestPlanner: React.FC<TestPlannerProps> = ({ 
  studentName, 
  onSaveTests, 
  existingTests, 
  onBackToRoster, 
  assessmentLogs,
  points,
  onTutorEdit,
  onUpdateLog,
  onGenerateReport
}) => {
  const [activeTab, setActiveTab] = useState<'manager' | 'results'>('manager');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [testTitle, setTestTitle] = useState(`${studentName}'s Diagnostic Test`);
  const [noTopicsFound, setNoTopicsFound] = useState(false);
  const abortControllerRef = useRef<boolean>(false);

  // Manual Override State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState<string>("");

  // Generation Config State
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>(SKILLS_LIST);
  const [selectedStages, setSelectedStages] = useState<number[]>(STAGES_LIST);
  const [tasksPerTopic, setTasksPerTopic] = useState<number>(1);
  const [selectedDifficulties, setSelectedDifficulties] = useState<('Easy' | 'Medium' | 'Hard')[]>(['Medium', 'Hard']);

  const toggleSkill = (skill: Skill) => {
    setNoTopicsFound(false);
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };
  const toggleStage = (stage: number) => {
    setNoTopicsFound(false);
    setSelectedStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  };
  const toggleDifficulty = (diff: 'Easy' | 'Medium' | 'Hard') => {
    setSelectedDifficulties(prev => prev.includes(diff) ? (prev.length > 1 ? prev.filter(d => d !== diff) : prev) : [...prev, diff]);
  };

  const generateFullTest = async () => {
    setNoTopicsFound(false);
    abortControllerRef.current = false;
    setEditingTestId(null);

    if (selectedSkills.length === 0 || selectedStages.length === 0) {
      alert("Please select at least one skill and one stage.");
      return;
    }

    const targetPoints = SYLLABUS_roadmap.filter(p => 
      selectedSkills.includes(p.skill) && 
      selectedStages.includes(p.stage)
    );

    if (targetPoints.length === 0) {
      setNoTopicsFound(true);
      return;
    }

    setIsGenerating(true);
    setIsAssigned(false);
    setQuestions([]);
    setProgress(0);

    const tasks: { topic: string; skill: Skill; difficulty: 'Easy' | 'Medium' | 'Hard'; stage: number }[] = [];
    targetPoints.forEach(point => {
      for (let i = 0; i < tasksPerTopic; i++) {
        tasks.push({ 
          topic: point.topic,
          skill: point.skill,
          stage: point.stage,
          difficulty: selectedDifficulties[i % selectedDifficulties.length] 
        });
      }
    });

    const total = tasks.length;
    const chunkSize = 5; 
    const questionsBuffer: Question[] = [];
    let completedCount = 0;

    try {
      for (let i = 0; i < tasks.length; i += chunkSize) {
        if (abortControllerRef.current) break;

        const currentChunk = tasks.slice(i, i + chunkSize);
        setStatusMessage(REASSURING_MESSAGES[Math.floor(Math.random() * REASSURING_MESSAGES.length)]);

        const chunkResults = await generateBulkQuestions(currentChunk, studentName);
        questionsBuffer.push(...chunkResults);
        completedCount += chunkResults.length;
        
        setQuestions([...questionsBuffer]);
        setProgress(Math.round((completedCount / total) * 100));
      }

      if (abortControllerRef.current) {
        setStatusMessage("Generation cancelled.");
        setIsGenerating(false);
        return;
      }
      
      setStatusMessage("Generation Complete!");
    } catch (error) {
      console.error(error);
      setStatusMessage("Generation encountered an error. The model might be busy.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleAssign = () => {
    if (editingTestId) {
      const updatedTests = existingTests.map(t => 
        t.id === editingTestId 
          ? { ...t, title: testTitle, questions: [...questions] }
          : t
      );
      onSaveTests(updatedTests);
      setEditingTestId(null);
    } else {
      const newTest: AssignedTest = { id: crypto.randomUUID(), title: testTitle || "Untitled Test", createdAt: new Date().toISOString(), questions: [...questions] };
      onSaveTests([...existingTests, newTest]);
    }
    setIsAssigned(true);
    setQuestions([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startNewTestDraft = () => {
    setQuestions([]); setIsAssigned(false); setIsGenerating(false); setProgress(0); setEditingTestId(null);
    setTestTitle(`${studentName}'s Diagnostic Test #${existingTests.length + 1}`);
  };

  const handleEditUntakenTest = (test: AssignedTest) => {
    setQuestions(test.questions);
    setTestTitle(test.title);
    setEditingTestId(test.id);
    setIsAssigned(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryTest = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("Permanently delete this test assignment? This cannot be undone.")) {
      const updatedList = existingTests.filter(t => t.id !== id);
      onSaveTests(updatedList);
      if (editingTestId === id) {
        setQuestions([]);
        setEditingTestId(null);
      }
    }
  };

  const handleCancelGeneration = () => {
    abortControllerRef.current = true;
    setStatusMessage("Cancelling...");
  };

  const completedTests = existingTests.filter(t => t.completedAt);
  const selectedTest = completedTests.find(t => t.id === selectedTestId);
  const filteredLogs = selectedTestId ? assessmentLogs.filter(l => l.testId === selectedTestId) : assessmentLogs;

  const startEditingLog = (log: AssessmentLog) => {
    setEditingLogId(log.id);
    setEditScore(log.evaluation.score);
    setEditFeedback(log.evaluation.tutorFeedback || "");
  };

  const saveLogEdit = () => {
    if (editingLogId) {
      onUpdateLog(editingLogId, {
        score: editScore,
        isCorrect: editScore >= 60,
        tutorFeedback: editFeedback
      });
      setEditingLogId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBackToRoster} className="flex items-center gap-2 text-slate-500 hover:text-purple-600 font-medium transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Tutor Studio</span>
        </button>
        <div className="flex items-center gap-4">
           <span className="text-slate-400 text-sm font-medium flex items-center gap-1.5"><History size={16} /> {existingTests.length} Tests Assigned</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-200 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-700 font-bold text-2xl shadow-sm border border-purple-200">{studentName.charAt(0).toUpperCase()}</div>
          <div className="flex-1">
             <h1 className="text-3xl font-bold text-slate-900">{studentName}</h1>
             <p className="text-slate-500 mt-0.5 flex items-center gap-1.5"><Users size={14} /> Student Dashboard & Planner</p>
          </div>
        </div>
        <div className="bg-slate-100 p-1 rounded-xl flex self-end md:self-auto">
          <button onClick={() => setActiveTab('manager')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'manager' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ClipboardList size={18} /> Test Manager</button>
          <button onClick={() => setActiveTab('results')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'results' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><BarChart3 size={18} /> Student Results</button>
        </div>
      </div>

      {activeTab === 'manager' ? (
        <div className="animate-in fade-in duration-300">
          {isAssigned && (
            <div className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl mb-8 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Check size={28} strokeWidth={3} /></div>
                  <div>
                    <h3 className="text-xl font-bold text-green-900">Assigned Successfully!</h3>
                    <p className="text-green-700"><b>{studentName}</b> now has updated tests ready to take.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={startNewTestDraft} className="bg-white border-2 border-green-600 text-green-600 px-6 py-2.5 rounded-xl font-bold hover:bg-green-50 transition-colors">Create Another Test</button>
                  <button onClick={onBackToRoster} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20">Return to Roster</button>
                </div>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="bg-white rounded-3xl border-2 border-purple-100 p-10 mb-8 shadow-xl shadow-purple-200/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1.5 bg-slate-100 w-full">
                <div className="h-full bg-purple-600 transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-purple-50 border-t-purple-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-purple-600" size={32} />
                  </div>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Accelerated Generation</span>
                    <span className="text-purple-600 font-bold text-xl">{progress}%</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Bulk-Processing Tasks</h3>
                  <p className="text-slate-500 font-medium italic min-h-[1.5em]">{statusMessage}</p>
                  <div className="mt-6 flex items-center justify-center md:justify-start gap-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {questions.length} / {SYLLABUS_roadmap.filter(p => selectedSkills.includes(p.skill) && selectedStages.includes(p.stage)).length * tasksPerTopic} Tasks Curated
                    </div>
                    <button 
                      onClick={handleCancelGeneration}
                      className="flex items-center gap-1.5 text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                      <StopCircle size={14} /> Stop
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Assigned Test Library</h2>
            <div className="flex gap-3">
              {questions.length === 0 && !isGenerating && (
                <button 
                  onClick={generateFullTest} 
                  disabled={isGenerating} 
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50 font-bold shadow-md transition-all text-sm ${noTopicsFound ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                >
                  <Plus size={18} /> 
                  {noTopicsFound ? 'Try Different Filters' : 'Generate New Test'}
                </button>
              )}
              {questions.length > 0 && !isAssigned && !isGenerating && (
                <>
                  <button onClick={() => { setQuestions([]); setEditingTestId(null); }} className="flex-shrink-0 flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-4 py-3 rounded-xl hover:bg-slate-200 font-bold transition-all text-sm">Cancel</button>
                  <button onClick={handleAssign} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 font-bold shadow-md transition-all text-sm"><Send size={18} /> {editingTestId ? 'Update Assignment' : 'Assign to Student'}</button>
                </>
              )}
            </div>
          </div>

          {noTopicsFound && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in shake duration-300">
               <AlertTriangle size={20} />
               <p className="text-sm font-medium">
                  <b>No topics found!</b> Try adding more Skills or selecting a different Stage below.
               </p>
            </div>
          )}

          {!isGenerating && questions.length === 0 && (
            <div className="mb-10">
               {existingTests.length === 0 ? (
                 <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                    <ClipboardList className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-400 font-medium">No tests assigned yet.</p>
                    <button onClick={generateFullTest} className="mt-4 text-purple-600 font-bold hover:underline">Click here to generate the first diagnostic.</button>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {existingTests.map(test => (
                      <div key={test.id} onClick={() => !test.completedAt && handleEditUntakenTest(test)} className={`bg-white border rounded-2xl p-5 flex items-center justify-between group transition-all cursor-pointer ${test.completedAt ? 'border-green-100 bg-green-50/20' : 'border-slate-200 hover:border-purple-300 hover:shadow-md'}`}>
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${test.completedAt ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}><ClipboardList size={24} /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800">{test.title}</p>
                                {test.completedAt ? (
                                  <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded font-black uppercase">Completed</span>
                                ) : (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black uppercase">Pending</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-medium">{test.questions.length} Questions • {new Date(test.createdAt).toLocaleDateString()}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            {!test.completedAt && (
                              <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEditUntakenTest(test); }} className="p-2 text-slate-400 hover:text-purple-600 bg-slate-50 rounded-lg transition-colors border border-slate-100">
                                <Pencil size={16} />
                              </button>
                            )}
                            <button onClick={(e) => handleDeleteHistoryTest(e, test.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg transition-colors border border-slate-100">
                               <Trash2 size={16} />
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {questions.length > 0 && (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border mb-6 ${editingTestId ? 'bg-amber-50 border-amber-200' : 'bg-purple-50 border-purple-100'}`}>
                 <div className="flex justify-between items-center mb-2">
                    <label className={`block text-xs font-bold uppercase tracking-widest ${editingTestId ? 'text-amber-600' : 'text-purple-600'}`}>
                      {editingTestId ? 'Editing Assigned Test' : 'New Test Title'}
                    </label>
                    {editingTestId && <span className="text-[10px] font-black text-amber-500 uppercase">Changes will update the student's dashboard</span>}
                 </div>
                 <input type="text" className={`text-2xl font-bold bg-transparent border-b-2 outline-none w-full transition-colors ${editingTestId ? 'text-amber-900 border-amber-200 focus:border-amber-600' : 'text-purple-900 border-purple-200 focus:border-purple-600'}`} value={testTitle} onChange={(e) => setTestTitle(e.target.value)} placeholder="Name this test..." />
              </div>
              {questions.map((q, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-600 font-mono text-sm px-2 py-1 rounded">Q{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-brand-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Stage {q.stage || '?' }</span>
                        <span className="font-bold text-brand-700 uppercase text-sm tracking-wide">{q.learningPointId}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{q.difficulty}</span>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                        <Clock size={12} className="text-slate-400" />
                        <input type="number" className="w-12 bg-transparent text-xs font-bold text-slate-700 outline-none focus:text-purple-600" value={q.timeLimit || 60} onChange={(e) => handleUpdateQuestion(idx, 'timeLimit', parseInt(e.target.value) || 0)} />
                        <span className="text-[10px] text-slate-400 font-medium">sec</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Question Content</label>
                        <textarea className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none" rows={3} value={q.content} onChange={(e) => handleUpdateQuestion(idx, 'content', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase text-green-700">Ideal Answer</label>
                        <input type="text" className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:border-green-500 outline-none" value={q.correctAnswer || ''} onChange={(e) => handleUpdateQuestion(idx, 'correctAnswer', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-center pt-4">
                 <button onClick={handleAssign} className="bg-green-600 text-white px-12 py-4 rounded-2xl font-black hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 flex items-center gap-3 active:scale-95">
                    <Send size={24} /> {editingTestId ? 'UPDATE ASSIGNMENT' : 'ASSIGN TO STUDENT'}
                 </button>
              </div>
            </div>
          )}

          {questions.length === 0 && !isGenerating && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-10 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-slate-800"><Settings2 size={24} className="text-purple-600" /><h3 className="text-xl font-bold">Diagnostic Generation Strategy</h3></div>
              
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-slate-100 pb-10">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Syllabus Skills / 技能选择</label>
                    <div className="grid grid-cols-2 gap-3">
                      {SKILLS_LIST.map(skill => (
                        <button key={skill} onClick={() => toggleSkill(skill)} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selectedSkills.includes(skill) ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}><span>{skill}</span>{selectedSkills.includes(skill) && <CheckCircle size={14} />}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Proficiency Stages / 等级阶段</label>
                    <div className="grid grid-cols-3 gap-3">
                      {STAGES_LIST.map(stage => (
                        <button key={stage} onClick={() => toggleStage(stage)} className={`p-3 rounded-xl border-2 transition-all ${selectedStages.includes(stage) ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}>Stage {stage}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tasks per Topic / 每个主题的任务数</label>
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black">{tasksPerTopic} tasks</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        step="1" 
                        value={tasksPerTopic} 
                        onChange={(e) => setTasksPerTopic(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold">
                        <span>1 (Quick)</span>
                        <span>5 (Deep Dive)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Difficulty Mix / 难度组合</label>
                    <div className="flex gap-2">
                      {DIFFICULTIES.map(diff => (
                        <button 
                          key={diff} 
                          onClick={() => toggleDifficulty(diff)} 
                          className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedDifficulties.includes(diff) ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold shadow-md shadow-purple-200/50' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                        >
                          <div className={`p-2 rounded-lg ${selectedDifficulties.includes(diff) ? 'bg-purple-100' : 'bg-slate-200'}`}>
                            {diff === 'Easy' ? <Layers size={16} /> : diff === 'Medium' ? <BarChart3 size={16} /> : <AlertTriangle size={16} />}
                          </div>
                          <span className="text-xs uppercase tracking-widest">{diff}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm"><ClipboardList className="text-purple-600" size={24} /></div>
                        <div>
                          <p className="font-bold text-slate-800">Accelerated Generation</p>
                          <p className="text-sm text-slate-500">Generating <span className="text-purple-600 font-bold">{SYLLABUS_roadmap.filter(p => selectedSkills.includes(p.skill) && selectedStages.includes(p.stage)).length * tasksPerTopic}</span> tasks in high-speed batches.</p>
                        </div>
                      </div>
                      <button 
                        onClick={generateFullTest} 
                        disabled={isGenerating}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-purple-700 transition-all flex items-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
                      >
                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} fill="currentColor" />}
                        GENERATE DIAGNOSTIC
                      </button>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in duration-300 space-y-10">
           <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-700 rounded-lg"><CheckCircle2 size={24} /></div>
                    <div><h3 className="text-2xl font-bold text-slate-800">Completed Diagnostic Tests</h3><p className="text-slate-500 text-sm">Review performance for each assigned diagnostic session.</p></div>
                 </div>
                 <button onClick={() => onGenerateReport('download')} className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-purple-200">
                    <Download size={18} /> Export Full PDF Report
                 </button>
              </div>
              {completedTests.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><ClipboardList className="mx-auto text-slate-300 mb-3" size={32} /><p className="text-slate-400 italic">No tests have been completed yet.</p></div>
              ) : (
                <div className="space-y-4">
                  {completedTests.map((test) => (
                    <div key={test.id} className={`flex flex-col md:flex-row items-center justify-between p-5 rounded-2xl border transition-all ${selectedTestId === test.id ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-100' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><ClipboardList size={24} /></div>
                        <div>
                          <div className="flex items-center gap-2"><h4 className="font-bold text-slate-800">{test.title}</h4><span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Completed</span></div>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(test.completedAt!).toLocaleDateString()} • {test.questions.length} Tasks</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Aggregate Accuracy</p><p className={`text-2xl font-black ${test.overallScore! >= 80 ? 'text-green-600' : test.overallScore! >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{test.overallScore}%</p></div>
                        <button onClick={() => setSelectedTestId(selectedTestId === test.id ? null : test.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${selectedTestId === test.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>{selectedTestId === test.id ? 'Hide Details' : 'View Results'}<ArrowRight size={18} className={`${selectedTestId === test.id ? 'rotate-90' : ''} transition-transform`} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>

           {selectedTest && (
             <div className="animate-in slide-in-from-top-6 duration-400">
                <div className="flex items-center justify-between mb-6 px-2">
                   <div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg text-purple-700"><LayoutDashboard size={20} /></div><h3 className="text-2xl font-bold text-slate-800">Task-by-Task Analysis: {selectedTest.title}</h3></div>
                   <button onClick={() => setSelectedTestId(null)} className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl transition-colors shadow-sm"><XCircle size={16} /> Close Preview</button>
                </div>
                <div className="space-y-4">
                   {filteredLogs.length === 0 ? (
                      <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl text-slate-400"><History className="mx-auto mb-2 opacity-20" size={48} /><p className="italic font-medium">No activity logs found for this session ID.</p></div>
                   ) : (
                     filteredLogs.map((log, idx) => (
                        <div key={idx} className={`bg-white border rounded-2xl transition-all shadow-sm overflow-hidden ${editingLogId === log.id ? 'border-purple-500 ring-2 ring-purple-100' : 'border-slate-200'}`}>
                           <div className="p-6 border-b border-slate-50 flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                 <span className="bg-brand-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{log.skill}</span>
                                 <div className="h-1 w-1 bg-slate-300 rounded-full" />
                                 <span className="text-xs text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                 {log.evaluation.isOverridden && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">Tutor Overridden</span>}
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black border ${log.evaluation.isCorrect ? 'text-green-700 bg-green-50 border-green-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
                                    {log.evaluation.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                    {log.evaluation.score}%
                                 </div>
                                 {editingLogId !== log.id && (
                                   <button onClick={() => startEditingLog(log)} className="p-2 text-slate-400 hover:text-purple-600 bg-slate-50 rounded-lg transition-colors border border-slate-100">
                                      <Edit3 size={18} />
                                   </button>
                                 )}
                              </div>
                           </div>
                           
                           <div className="p-8">
                             {editingLogId === log.id ? (
                               <div className="space-y-6 animate-in fade-in duration-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                     <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Set Manual Score / 设置分数</label>
                                        <div className="flex gap-2">
                                           <button onClick={() => setEditScore(0)} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${editScore === 0 ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>0% (Fail)</button>
                                           <button onClick={() => setEditScore(50)} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${editScore === 50 ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>50% (Partial)</button>
                                           <button onClick={() => setEditScore(100)} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${editScore === 100 ? 'bg-green-50 border-green-500 text-green-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>100% (Correct)</button>
                                        </div>
                                     </div>
                                     <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tutor Additional Feedback / 教师反馈</label>
                                        <textarea value={editFeedback} onChange={(e) => setEditFeedback(e.target.value)} rows={3} className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-purple-500 outline-none text-sm" placeholder="Add specific guidance or correction for the student..."/>
                                     </div>
                                  </div>
                                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                                     <button onClick={() => setEditingLogId(null)} className="px-6 py-2.5 rounded-xl font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2">
                                        <RotateCcw size={18} /> Cancel
                                     </button>
                                     <button onClick={saveLogEdit} className="px-8 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2">
                                        <Save size={18} /> Save Override
                                     </button>
                                  </div>
                               </div>
                             ) : (
                               <>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                    <div>
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Question / Task Content</label>
                                       <p className="text-slate-800 leading-relaxed font-medium">{log.questionContent}</p>
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Student Response</label>
                                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-brand-700 italic font-bold leading-relaxed">"{log.studentAnswer}"</p></div>
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-5 bg-slate-900 text-slate-100 rounded-xl shadow-inner">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">AI Diagnostic Feedback</label>
                                       <p className="text-sm leading-relaxed text-slate-300">"{log.evaluation.feedback}"</p>
                                    </div>
                                    {log.evaluation.tutorFeedback && (
                                       <div className="p-5 bg-purple-50 text-purple-900 rounded-xl border border-purple-100">
                                          <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-2">Tutor Feedback Override</label>
                                          <p className="text-sm leading-relaxed font-bold">"{log.evaluation.tutorFeedback}"</p>
                                       </div>
                                    )}
                                 </div>
                               </>
                             )}
                           </div>
                        </div>
                     ))
                   )}
                   <div className="flex justify-center py-6"><button onClick={() => { setSelectedTestId(null); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="text-slate-400 hover:text-slate-600 font-bold text-sm uppercase tracking-widest">Back to Test List</button></div>
                </div>
             </div>
           )}

           {!selectedTestId && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div><h3 className="text-2xl font-bold text-slate-800">Longitudinal Mastery</h3><p className="text-slate-500">Historical progression for {studentName} across all learning points.</p></div>
                      <div className="flex gap-4">
                          <div className="text-center bg-green-50 px-5 py-3 rounded-2xl border border-green-100 shadow-sm">
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Mastered</p>
                            <p className="text-3xl font-black text-green-700">{points.filter(p => p.status === 'mastered').length}</p>
                          </div>
                          <div className="text-center bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 shadow-sm">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Learning</p>
                            <p className="text-3xl font-black text-amber-700">{points.filter(p => p.status === 'in-progress').length}</p>
                          </div>
                      </div>
                    </div>
                    <Timeline points={points} onAppeal={() => {}} isTutorMode={true} onTutorEdit={onTutorEdit} />
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-6"><History size={24} className="text-purple-600" /><h3 className="text-2xl font-bold text-slate-800">All Historical Activity</h3></div>
                    {assessmentLogs.length === 0 ? (
                      <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl shadow-sm"><p className="text-slate-400 italic">No historical activity recorded yet.</p></div>
                    ) : (
                      <div className="space-y-3">
                        {[...assessmentLogs].reverse().slice(0, 20).map((log, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl hover:border-slate-200 transition-colors flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                  <div className={`w-2 h-2 rounded-full ${log.evaluation.isCorrect ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <div>
                                    <p className="text-sm font-bold text-slate-800 truncate max-w-[400px]">{log.questionContent}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{log.skill} • {new Date(log.timestamp).toLocaleDateString()}</p>
                                  </div>
                              </div>
                              <span className="text-sm font-black text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{log.evaluation.score}%</span>
                            </div>
                        ))}
                      </div>
                    )}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default TestPlanner;
