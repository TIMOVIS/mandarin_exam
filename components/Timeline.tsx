import React, { useState } from 'react';
import { LearningPoint, Skill } from '../types';
import { ChevronRight, AlertCircle, CheckCircle, Lock, Edit2 } from 'lucide-react';

interface TimelineProps {
  points: LearningPoint[];
  onAppeal: (id: string) => void;
  isTutorMode: boolean;
  onTutorEdit: (id: string, newScore: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ points, onAppeal, isTutorMode, onTutorEdit }) => {
  const [filter, setFilter] = useState<Skill | 'All'>('All');

  const filteredPoints = filter === 'All' 
    ? points 
    : points.filter(p => p.skill === filter);

  // Group by Stage
  const stages = Array.from(new Set(points.map(p => p.stage))).sort();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': return 'bg-green-100 border-green-300 text-green-800';
      case 'weak': return 'bg-red-50 border-red-200 text-red-800';
      case 'in-progress': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-400';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header Filters */}
      <div className="flex flex-wrap gap-2 mb-8 items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Progression Map</h2>
        <div className="flex gap-2">
          {['All', ...Object.values(Skill)].map((skill) => (
            <button
              key={skill}
              onClick={() => setFilter(skill as Skill | 'All')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === skill 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stages */}
      <div className="space-y-12 relative pl-8 border-l-2 border-slate-200 ml-4">
        {stages.map(stage => {
          const stagePoints = filteredPoints.filter(p => p.stage === stage);
          if (stagePoints.length === 0) return null;

          return (
            <div key={stage} className="relative">
              {/* Stage Marker */}
              <div className="absolute -left-[41px] top-0 bg-white border-2 border-slate-800 w-5 h-5 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
              </div>
              
              <div className="flex items-baseline gap-4 mb-4">
                <h3 className="text-lg font-semibold text-slate-500 uppercase tracking-wider">
                  Stage {stage}
                </h3>
                <span className="text-sm text-slate-400">
                  {stage === 1 ? 'Foundations (A1.1)' : 
                   stage === 2 ? 'Daily Language (A1.2)' :
                   stage === 3 ? 'Context Communication (A2)' :
                   stage === 4 ? 'Range Expansion (B1)' :
                   stage === 5 ? 'Accuracy & Style (B1+)' : 'Mastery (B2)'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stagePoints.map(point => (
                  <div 
                    key={point.id}
                    className={`p-4 rounded-xl border ${getStatusColor(point.status)} shadow-sm transition-all relative group`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold uppercase opacity-70">{point.skill}</span>
                      {point.status === 'locked' ? <Lock size={14} /> : <ChevronRight size={16} />}
                    </div>
                    <h4 className="font-bold text-lg mb-1">{point.topic}</h4>
                    <p className="text-sm opacity-80 mb-4">{point.description}</p>
                    
                    {point.status !== 'locked' && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/10">
                        <span className="text-sm font-bold">
                          Score: {point.score}%
                        </span>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          {isTutorMode ? (
                            <button 
                              onClick={() => {
                                const newScore = prompt("Enter new score (0-100):", point.score?.toString());
                                if (newScore && !isNaN(Number(newScore))) {
                                  onTutorEdit(point.id, Number(newScore));
                                }
                              }}
                              className="p-1 hover:bg-black/10 rounded"
                              title="Edit Result"
                            >
                              <Edit2 size={14} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => onAppeal(point.id)}
                              className={`p-1 rounded hover:bg-black/10 ${point.appealActive ? 'text-orange-600' : ''}`}
                              title={point.appealActive ? "Appeal Pending" : "Appeal Result"}
                            >
                              <AlertCircle size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {point.appealActive && (
                      <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                        Appeal Pending
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
