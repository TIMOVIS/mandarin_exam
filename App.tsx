import React, { useState, useReducer, useEffect, useCallback } from 'react';
import { LearningPoint, AppState, Skill, AssessmentLog, Question, AssignedTest } from './types';
import { SYLLABUS_roadmap } from './constants';
import Timeline from './components/Timeline';
import BaselineTest from './components/BaselineTest';
import LandingPage from './components/LandingPage';
import ReportTemplate from './components/ReportTemplate';
import TestPlanner from './components/TestPlanner';
import { dbService } from './services/supabaseService';
import { UserCircle, Settings, Play, Eye, Download, ClipboardList, Clock, CheckCircle, BarChart3, ChevronRight, History, Cloud, CloudOff, RefreshCw, Sparkles, Zap } from 'lucide-react';

type Action = 
  | { type: 'UPDATE_SCORE'; id: string; score: number }
  | { type: 'UPDATE_BY_SKILL'; skill: string; score: number }
  | { type: 'APPEAL'; id: string }
  | { type: 'UNLOCK_ALL' }
  | { type: 'LOAD_DATA'; data: LearningPoint[] }
  | { type: 'RESET_POINTS' };

const pointsReducer = (state: LearningPoint[], action: Action): LearningPoint[] => {
  switch (action.type) {
    case 'UPDATE_SCORE':
      return state.map(p => {
        if (p.id === action.id) {
          let status: LearningPoint['status'] = 'in-progress';
          if (action.score >= 80) status = 'mastered';
          else if (action.score < 40) status = 'weak';
          return { ...p, score: action.score, status, appealActive: false };
        }
        return p;
      });
    case 'UPDATE_BY_SKILL':
      return state.map(p => {
        if (p.skill === action.skill) {
           let status: LearningPoint['status'] = 'in-progress';
           const currentScore = p.score || 0;
           const newScore = Math.max(currentScore, action.score);
           if (newScore >= 80) status = 'mastered';
           else if (newScore >= 50) status = 'in-progress';
           else status = 'weak';
           return { ...p, score: newScore, status, appealActive: false };
        }
        return p;
      });
    case 'APPEAL':
      return state.map(p => p.id === action.id ? { ...p, appealActive: true } : p);
    case 'UNLOCK_ALL':
      return state.map(p => ({ ...p, status: 'in-progress', score: 50 }));
    case 'LOAD_DATA':
      return action.data;
    case 'RESET_POINTS':
      return SYLLABUS_roadmap;
    default:
      return state;
  }
};

const App = () => {
  const [view, setView] = useState<AppState>(AppState.Landing);
  const [points, dispatch] = useReducer(pointsReducer, SYLLABUS_roadmap);
  const [isTutorMode, setIsTutorMode] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [assessmentLogs, setAssessmentLogs] = useState<AssessmentLog[]>([]);
  const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
  const [activeTest, setActiveTest] = useState<AssignedTest | null>(null);
  const [reportAction, setReportAction] = useState<'view' | 'download' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Sync state to Supabase
  const syncToCloud = useCallback(async (customTests?: AssignedTest[]) => {
    if (!studentName) return;
    setIsSyncing(true);
    try {
      await dbService.saveStudentData({
        name: studentName,
        age: studentAge,
        points,
        logs: assessmentLogs,
        tests: customTests || assignedTests
      });
      setLastSynced(new Date());
    } catch (err) {
      console.error("Cloud sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [studentName, studentAge, points, assessmentLogs, assignedTests]);

  // Load student data on selection
  const loadStudentData = async (name: string) => {
    setStudentName(name);
    setIsSyncing(true);
    try {
      const profile = await dbService.getStudentData(name);
      if (profile) {
        setStudentAge(profile.age);
        if (profile.points && profile.points.length > 0) {
          dispatch({ type: 'LOAD_DATA', data: profile.points });
        } else {
          dispatch({ type: 'RESET_POINTS' });
        }
        setAssessmentLogs(profile.logs || []);
        setAssignedTests(profile.tests || []);
      } else {
        // New student
        dispatch({ type: 'RESET_POINTS' });
        setAssessmentLogs([]);
        setAssignedTests([]);
      }
    } catch (err) {
      console.error("Failed to load student data:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Automated sync on key state changes
  useEffect(() => {
    if (studentName && view !== AppState.Landing) {
      const timer = setTimeout(() => syncToCloud(), 2000); // Debounced auto-save
      return () => clearTimeout(timer);
    }
  }, [points, assessmentLogs, assignedTests, view, studentName, syncToCloud]);

  const handleJoin = async (name: string, age: string, role: 'student' | 'tutor') => {
    setIsTutorMode(role === 'tutor');
    await loadStudentData(name);
    
    if (role === 'tutor') {
      setView(AppState.TutorPlanning);
    } else {
      const profile = await dbService.getStudentData(name);
      const hasResults = profile?.points?.some(p => (p.score || 0) > 0);
      const hasTests = profile?.tests?.some(t => t.completedAt);

      if (hasResults || hasTests || (profile?.tests && profile.tests.length > 0)) {
        setView(AppState.Dashboard);
      } else {
        setView(AppState.Welcome);
      }
    }
  };

  const handleSaveTests = (tests: AssignedTest[]) => {
    setAssignedTests(tests);
    syncToCloud(tests);
  };

  const handleTestComplete = (results: Record<string, number>, logs: AssessmentLog[]) => {
    Object.entries(results).forEach(([skill, score]) => {
        dispatch({ type: 'UPDATE_BY_SKILL', skill: skill as Skill, score });
    });
    const logsWithTestId = logs.map(l => ({ ...l, testId: activeTest?.id }));
    setAssessmentLogs(prev => [...prev, ...logsWithTestId]);
    
    if (activeTest) {
      const updatedTests = assignedTests.map(t => {
        if (t.id === activeTest.id) {
          const avgScore = logs.reduce((acc, l) => acc + l.evaluation.score, 0) / (logs.length || 1);
          return { ...t, completedAt: new Date().toISOString(), overallScore: Math.round(avgScore) };
        }
        return t;
      });
      handleSaveTests(updatedTests);
    }
    setActiveTest(null);
    setView(AppState.Dashboard);
  };

  const handleUpdateAssessmentLog = (logId: string, updates: Partial<AssessmentLog['evaluation']>) => {
    const newLogs = assessmentLogs.map(log => {
      if (log.id === logId) {
        return {
          ...log,
          evaluation: { ...log.evaluation, ...updates, isOverridden: true }
        };
      }
      return log;
    });
    setAssessmentLogs(newLogs);
    setIsSyncing(true);
    dbService.saveStudentData({
      name: studentName,
      age: studentAge,
      points,
      logs: newLogs,
      tests: assignedTests
    }).then(() => {
      setLastSynced(new Date());
      setIsSyncing(false);
    });
  };

  const startTest = (test: AssignedTest | null) => {
    setActiveTest(test);
    setView(AppState.Baseline);
  };

  const completedTests = assignedTests.filter(t => t.completedAt).sort((a, b) => 
    new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
  );

  const pendingTests = assignedTests.filter(t => !t.completedAt).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {reportAction && (
        <ReportTemplate 
          studentName={studentName}
          studentAge={studentAge}
          points={points}
          logs={assessmentLogs}
          onClose={() => setReportAction(null)}
          autoPrint={reportAction === 'download'}
          isTutorMode={isTutorMode}
        />
      )}

      {view !== AppState.Landing && (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView(AppState.Landing)}>
              <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-xl shadow-sm ${isTutorMode ? 'bg-purple-600' : 'bg-brand-600'}`}>
                学
              </div>
              <h1 className="font-bold text-xl tracking-tight">Mandarin Exam<span className={isTutorMode ? 'text-purple-600' : 'text-brand-600'}> Practice</span></h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-2 text-slate-400">
                 {isSyncing ? (
                   <RefreshCw size={14} className="animate-spin text-brand-500" />
                 ) : lastSynced ? (
                   <Cloud size={14} className="text-green-500" />
                 ) : (
                   <CloudOff size={14} />
                 )}
                 <span className="text-[10px] font-black uppercase tracking-tighter">
                   {isSyncing ? 'Syncing...' : lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Not Connected'}
                 </span>
              </div>
              <div className="flex items-center gap-4">
                {view === AppState.Dashboard && <button onClick={() => setView(AppState.Welcome)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Take New Test</button>}
                <div className="h-6 w-px bg-slate-200"></div>
                <button onClick={() => setView(AppState.Landing)} className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${isTutorMode ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}>
                  {isTutorMode ? <Settings size={18} /> : <UserCircle size={18} />}
                  {isTutorMode ? 'Tutor Studio' : studentName || 'Student'}
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className="py-8 no-print">
        {view === AppState.Landing && <LandingPage onJoin={handleJoin} initialRole={isTutorMode ? 'tutor' : undefined} />}
        {view === AppState.TutorPlanning && (
          <TestPlanner 
            studentName={studentName}
            onSaveTests={handleSaveTests}
            existingTests={assignedTests}
            onBackToRoster={() => setView(AppState.Landing)}
            assessmentLogs={assessmentLogs}
            points={points}
            onTutorEdit={(id, score) => dispatch({ type: 'UPDATE_SCORE', id, score })}
            onUpdateLog={handleUpdateAssessmentLog}
            onGenerateReport={(action) => setReportAction(action)}
          />
        )}
        {view === AppState.Welcome && (
          <div className="max-w-4xl mx-auto px-6 pt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-bold text-slate-900 mb-6">Hi {studentName}, let's check your level.</h1>
            <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto">Choose an assessment to start. These help us build your personalized roadmap.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {pendingTests.map((test) => (
                <div key={test.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all group flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors"><ClipboardList size={24} /></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(test.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{test.title}</h3>
                  <p className="text-slate-500 text-sm mb-6 flex-grow">Includes {test.questions.length} diagnostic tasks across multiple skills.</p>
                  <button onClick={() => startTest(test)} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-brand-600 transition-colors flex items-center justify-center gap-2">Start Test <Play size={16} fill="currentColor" /></button>
                </div>
              ))}
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col justify-center items-center text-center">
                  <p className="text-slate-400 text-sm mb-4 italic">Need more practice?</p>
                  <button onClick={() => startTest(null)} className="text-slate-600 font-bold hover:text-brand-600 transition-colors">Generate New Random Baseline</button>
              </div>
            </div>
            {(completedTests.length > 0 || assignedTests.length > 0) && (
               <button onClick={() => setView(AppState.Dashboard)} className="mt-12 text-slate-400 hover:text-brand-600 font-bold flex items-center gap-2 mx-auto">
                 <Eye size={16} /> View your current roadmap
               </button>
            )}
          </div>
        )}
        {view === AppState.Dashboard && (
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-brand-100 rounded-3xl flex items-center justify-center text-brand-600 shadow-inner">
                        <UserCircle size={48} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">Zàijiàn, {studentName}!</h2>
                        <p className="text-slate-500 font-medium text-lg mt-1">You've completed <span className="text-brand-600 font-bold">{completedTests.length}</span> tests. Keep going!</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setReportAction('view')} className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-brand-700 flex items-center gap-2 shadow-xl shadow-brand-500/20 transition-all active:scale-95"><Eye size={20} /> FULL REPORT</button>
                </div>
            </div>

            {/* "Your New Tests" Section */}
            <div>
               <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="text-amber-500" size={24} />
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Your New Tests</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {pendingTests.map((test) => (
                   <div key={test.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl group-hover:bg-brand-600 group-hover:text-white transition-colors">
                            <ClipboardList size={24} />
                          </div>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">New</span>
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">{test.title}</h4>
                        <p className="text-xs text-slate-400 mb-4">{test.questions.length} Diagnostic Tasks</p>
                      </div>
                      <button 
                        onClick={() => startTest(test)} 
                        className="w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
                      >
                        Start Test <Play size={14} fill="currentColor" />
                      </button>
                   </div>
                 ))}
                 
                 {/* Random Baseline Card */}
                 <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center group hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 mb-4 shadow-sm group-hover:text-brand-500 group-hover:rotate-12 transition-all">
                       <Zap size={24} />
                    </div>
                    <h4 className="font-bold text-slate-700 mb-1 text-sm">General Assessment</h4>
                    <p className="text-[10px] text-slate-400 mb-4 font-medium italic">Generate a random baseline</p>
                    <button 
                      onClick={() => startTest(null)} 
                      className="text-xs font-black text-brand-600 hover:text-brand-700 uppercase tracking-widest underline underline-offset-4"
                    >
                      Start Random
                    </button>
                 </div>
               </div>
            </div>

            {/* History Section */}
            <div>
               <div className="flex items-center gap-3 mb-6">
                  <History className="text-brand-600" size={24} />
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Your Test History</h3>
               </div>
               {completedTests.length === 0 ? (
                 <div className="bg-slate-50 border border-slate-200 p-12 rounded-3xl text-center">
                    <p className="text-slate-400 font-medium">You haven't completed any tests yet. Finish a "New Test" to see your history!</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {completedTests.map((test) => (
                     <div key={test.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-colors">
                              <CheckCircle size={24} />
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                              <p className="text-2xl font-black text-slate-800">{test.overallScore}%</p>
                            </div>
                          </div>
                          <h4 className="font-bold text-slate-800 mb-1">{test.title}</h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} /> {new Date(test.completedAt!).toLocaleDateString()}</p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">{test.questions.length} TASKS</span>
                           <button onClick={() => setReportAction('view')} className="text-brand-600 text-sm font-black flex items-center gap-1 hover:underline">REVIEW <ChevronRight size={14} /></button>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            <div>
               <Timeline points={points} onAppeal={(id) => dispatch({ type: 'APPEAL', id })} isTutorMode={isTutorMode} onTutorEdit={(id, score) => dispatch({ type: 'UPDATE_SCORE', id, score })} />
            </div>
          </div>
        )}
        {view === AppState.Baseline && (
          <div className="px-6">
            <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">Baseline Assessment</h1>
              <button onClick={() => setView(AppState.Dashboard)} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Skip to Results</button>
            </div>
            <BaselineTest onComplete={handleTestComplete} testPlan={activeTest ? activeTest.questions : undefined} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;