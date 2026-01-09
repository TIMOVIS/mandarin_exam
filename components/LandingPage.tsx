import React, { useState, useEffect } from 'react';
import { User, Calendar, GraduationCap, Users, ChevronRight, Trash2, ClipboardList, ArrowLeft, Plus, MessageSquare, Loader2 } from 'lucide-react';
import { dbService } from '../services/supabaseService';
import { Question } from '../types';

interface LandingPageProps {
  onJoin: (name: string, age: string, role: 'student' | 'tutor', loadedPlan?: Question[]) => void;
  initialRole?: 'student' | 'tutor';
}

interface StudentEntry {
  name: string;
  age: string;
  comments?: string;
  testsCount: number;
}

const LandingPage: React.FC<LandingPageProps> = ({ onJoin, initialRole }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [comments, setComments] = useState('');
  const [role, setRole] = useState<'student' | 'tutor' | null>(initialRole || null);
  const [tutorSubView, setTutorSubView] = useState<'list' | 'add'>('list');
  const [savedStudents, setSavedStudents] = useState<StudentEntry[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  useEffect(() => {
    if (role === 'tutor') {
      loadRoster();
    }
  }, [role]);

  const loadRoster = async () => {
    setIsLoadingRoster(true);
    try {
      const roster = await dbService.getRoster();
      setSavedStudents(roster.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName && age) {
      try {
        await dbService.saveStudentData({
          name: trimmedName,
          age: age,
          comments: comments,
          points: [],
          logs: [],
          tests: []
        });
        await loadRoster();
        setTutorSubView('list');
        setName('');
        setAge('');
        setComments('');
      } catch (err: any) {
        console.error("Failed to add student:", err);
        if (err?.message?.includes("already exists")) {
          alert("Student name might already exist.");
        } else {
          alert("Failed to add student. Please check your connection and try again.");
        }
      }
    }
  };

  const handleStudentLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName && age) {
      onJoin(trimmedName, age, 'student');
    }
  };

  const handleSelectManagedStudent = (student: StudentEntry) => {
    if (isDeleting !== null) return;
    onJoin(student.name, student.age, 'tutor');
  };

  const handleDeleteStudent = async (e: React.MouseEvent, studentName: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isDeleting !== null) return;

    if (window.confirm(`Permanently remove all cloud and local records for "${studentName}"?`)) {
      setIsDeleting(studentName);
      try {
        await dbService.deleteStudent(studentName);
        setSavedStudents(prev => prev.filter(s => s.name !== studentName));
      } catch (err) {
        console.error("Deletion failed:", err);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleTutorBack = () => {
    if (tutorSubView === 'add') {
      setTutorSubView('list');
    } else {
      setRole(null);
    }
  };

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-brand-600 rounded-3xl text-white flex items-center justify-center font-black text-4xl shadow-xl mx-auto mb-6">学</div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Mandarin Exam Practice</h1>
          <p className="text-xl text-slate-500 font-medium">Please select your portal to continue.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <button 
            onClick={() => setRole('student')}
            className="group relative bg-white border-2 border-slate-100 p-10 rounded-[2.5rem] text-left hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-100 transition-opacity">
              <User size={120} />
            </div>
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-6 group-hover:bg-brand-600 group-hover:text-white transition-colors duration-300">
              <User size={32} />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-3">I am a Student</h3>
            <p className="text-slate-500 leading-relaxed font-medium">Practice your skills, track your progress, and prepare for your IGCSE exams.</p>
            <div className="mt-8 flex items-center gap-2 text-brand-600 font-bold">
              Enter Student Portal <ChevronRight size={20} />
            </div>
          </button>

          <button 
            onClick={() => {
              setRole('tutor');
              setTutorSubView('list');
            }}
            className="group relative bg-white border-2 border-slate-100 p-10 rounded-[2.5rem] text-left hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-100 transition-opacity">
              <GraduationCap size={120} />
            </div>
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              <GraduationCap size={32} />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-3">I am a Tutor</h3>
            <p className="text-slate-500 leading-relaxed font-medium">Manage student rosters, generate diagnostic tests, and review performance analytics.</p>
            <div className="mt-8 flex items-center gap-2 text-purple-600 font-bold">
              Enter Tutor Studio <ChevronRight size={20} />
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'student') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setRole(null)}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors text-sm uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back to role selection
        </button>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 h-fit">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
                <User size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Student Portal</h2>
              <p className="text-slate-500">Please enter your details to continue.</p>
            </div>
            
            <form onSubmit={handleStudentLoginSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-brand-500 outline-none transition-all font-bold"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Age</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-3.5 text-slate-400" size={20} />
                  <input
                    type="number"
                    required
                    min="5"
                    max="99"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-brand-500 outline-none transition-all font-bold"
                    placeholder="Your Age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="w-full text-white font-black py-4 rounded-2xl transition-all shadow-lg mt-4 active:scale-[0.98] bg-brand-600 hover:bg-brand-700 shadow-brand-500/20">
                START LEARNING
              </button>
            </form>
          </div>
          <div className="bg-brand-900 rounded-[2.5rem] shadow-xl p-10 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <div className="text-[150px] font-black text-white leading-none select-none">学</div>
            </div>
            <h3 className="text-3xl font-bold mb-8 italic">Study Smarter.</h3>
            <div className="space-y-8 relative z-10 text-brand-100">
               <p className="font-medium">Welcome back to your Mandarin learning journey. Your results are synced to the cloud.</p>
               <ul className="space-y-4">
                 <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-brand-500" /> Multi-device Syncing</li>
                 <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-brand-500" /> Persistent Roadmap</li>
                 <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-brand-500" /> Real-time Tutor Insights</li>
               </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={handleTutorBack}
        className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors text-sm uppercase tracking-widest"
      >
        <ArrowLeft size={16} /> Back to {tutorSubView === 'add' ? 'roster' : 'role selection'}
      </button>

      <div className="w-full max-w-4xl">
        {tutorSubView === 'list' ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="bg-purple-600 p-10 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <GraduationCap size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Tutor Studio</h2>
                  <p className="text-purple-100 font-medium">Cloud-synced student roster.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setName('');
                  setAge('');
                  setComments('');
                  setTutorSubView('add');
                }}
                className="bg-white text-purple-600 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-purple-50 transition-colors shadow-lg shadow-black/10"
              >
                <Plus size={18} /> ADD STUDENT
              </button>
            </div>

            <div className="p-10">
              {isLoadingRoster ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                   <Loader2 size={40} className="animate-spin text-purple-600" />
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Cloud Roster...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedStudents.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center">
                      <Users className="text-slate-200 mb-4" size={64} />
                      <p className="text-slate-400 font-bold text-lg">No students found.</p>
                      <p className="text-slate-400 mb-6 italic">Click "Add Student" to start managing your first student.</p>
                    </div>
                  ) : (
                    savedStudents.map((student) => (
                      <div 
                        key={student.name}
                        onClick={() => handleSelectManagedStudent(student)}
                        className={`group flex items-center justify-between p-6 rounded-3xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all cursor-pointer shadow-sm hover:shadow-md ${isDeleting === student.name ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-xl">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg">{student.name}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                               <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase">Age: {student.age}</span>
                               <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                                  <ClipboardList size={10} /> {student.testsCount} Tests
                               </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={(e) => handleDeleteStudent(e, student.name)}
                            className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all relative z-10"
                            title="Delete Student"
                          >
                            {isDeleting === student.name ? (
                              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={20} />
                            )}
                          </button>
                          <ChevronRight className="text-slate-300 group-hover:text-purple-500 transition-colors" size={24} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
                <Plus size={40} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900">Add New Student</h2>
              <p className="text-slate-500 font-medium">Enter details to create a new student context.</p>
            </div>
            
            <form onSubmit={handleAddStudentSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Student Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 outline-none transition-all font-bold"
                    placeholder="Enter student name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Age</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-3.5 text-slate-400" size={20} />
                  <input
                    type="number"
                    required
                    min="5"
                    max="99"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 outline-none transition-all font-bold"
                    placeholder="Student age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Optional Comments / Notes</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 text-slate-400" size={20} />
                  <textarea
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 outline-none transition-all font-bold min-h-[120px] resize-none"
                    placeholder="Specific learning goals, current levels, or focus areas..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setTutorSubView('list')}
                  className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-purple-600 text-white font-black py-4 rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                >
                  CREATE STUDENT CONTEXT
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;