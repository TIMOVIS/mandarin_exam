import React, { useEffect } from 'react';
import { LearningPoint, AssessmentLog, Skill } from '../types';
import { Printer, X, CheckCircle, XCircle } from 'lucide-react';

interface ReportTemplateProps {
  studentName: string;
  studentAge: string;
  points: LearningPoint[];
  logs: AssessmentLog[];
  onClose: () => void;
  autoPrint?: boolean;
  isTutorMode: boolean;
}

const ReportTemplate: React.FC<ReportTemplateProps> = ({ studentName, studentAge, points, logs, onClose, autoPrint, isTutorMode }) => {
  const handlePrint = () => { window.print(); };
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => { window.print(); }, 500); 
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const summary = Object.values(Skill).map(skill => {
    const skillPoints = points.filter(p => p.skill === skill && p.stage <= 6);
    const mastered = skillPoints.filter(p => p.status === 'mastered').length;
    const total = skillPoints.length;
    const avgScore = Math.round(skillPoints.reduce((acc, curr) => acc + (curr.score || 0), 0) / (total || 1));
    return { skill, mastered, total, avgScore };
  });

  return (
    <div className="fixed inset-0 bg-slate-100 z-[100] overflow-y-auto print-container">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm no-print">
        <h2 className="font-bold text-lg text-slate-700">Report Preview</h2>
        <div className="flex gap-3">
          {isTutorMode && (
            <button onClick={handlePrint} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium transition-colors"><Printer size={18} /> Print / Save as PDF</button>
          )}
          <button onClick={onClose} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 font-medium transition-colors"><X size={18} /> Close</button>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white min-h-screen p-[15mm] shadow-xl my-8 print:shadow-none print:my-0 print:p-0 print:max-w-none">
        <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
          <div><h1 className="text-3xl font-bold text-slate-900 mb-2">Mandarin Exam Practice Report</h1><p className="text-slate-500">Generated on {new Date().toLocaleDateString()}</p></div>
          <div className="text-right"><p className="text-lg font-bold">{studentName}</p><p className="text-slate-600">Age: {studentAge}</p></div>
        </div>

        <section className="mb-10 break-inside-avoid">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Proficiency Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            {summary.map(s => (
              <div key={s.skill} className="border border-slate-200 p-4 rounded-lg bg-slate-50 print:bg-white print:border-slate-300">
                <div className="flex justify-between items-center mb-2"><span className="font-bold text-slate-700">{s.skill}</span><span className="text-sm font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{s.avgScore}%</span></div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-2"><div className="bg-brand-600 h-2 rounded-full" style={{ width: `${s.avgScore}%` }}></div></div>
                <p className="text-xs text-slate-500">{s.mastered} of {s.total} topics mastered</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Assessment Logs</h3>
          <div className="space-y-4">
            {logs.length === 0 ? <p className="text-slate-500 italic">No assessment data recorded yet.</p> : (
              logs.map((log, index) => (
                <div key={index} className="break-inside-avoid border border-slate-200 rounded-lg p-6 mb-4 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2"><span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{log.skill}</span><span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span></div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${log.evaluation.isCorrect ? 'text-green-600' : 'text-red-600'}`}>{log.evaluation.isCorrect ? 'PASS' : 'FAIL'}</span>
                      <span className="text-xs text-slate-400">Score: {log.evaluation.score}%</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Question</p><p className="text-slate-800 font-medium text-sm">{log.questionContent}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Student Answer</p><p className="text-slate-700 italic text-sm">"{log.studentAnswer}"</p></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">AI Feedback</p><p className="text-slate-600 text-xs">"{log.evaluation.feedback}"</p></div>
                      {log.evaluation.tutorFeedback && (
                        <div><p className="text-[10px] font-bold text-purple-400 uppercase mb-1">Tutor Feedback</p><p className="text-purple-800 text-xs font-bold">"{log.evaluation.tutorFeedback}"</p></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-slate-400 text-sm"><p>Mandarin Exam Practice • Adaptive Learning Platform</p></div>
      </div>
    </div>
  );
};

export default ReportTemplate;