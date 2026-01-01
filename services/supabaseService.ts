
import { createClient } from '@supabase/supabase-js';
import { LearningPoint, AssessmentLog, AssignedTest } from '../types';

// Supabase credentials from environment variables
// For Netlify: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize the Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export interface StudentProfile {
  id?: string;
  name: string;
  age: string;
  comments?: string;
  points: LearningPoint[];
  logs: AssessmentLog[];
  tests: AssignedTest[];
}

/**
 * SQL Schema Reference:
 * 
 * create table students (
 *   id uuid primary key default gen_random_uuid(),
 *   name text unique not null,
 *   age text,
 *   comments text,
 *   points jsonb default '[]',
 *   logs jsonb default '[]',
 *   tests jsonb default '[]',
 *   updated_at timestamp with time zone default now()
 * );
 */

export const dbService = {
  async getRoster(): Promise<{ name: string; age: string; testsCount: number; comments: string }[]> {
    if (!supabase) {
      // Fallback roster logic using localStorage if Supabase is unavailable
      const roster: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('mandarin_mastery_data_')) {
          const studentName = key.substring('mandarin_mastery_data_'.length);
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const tests = JSON.parse(localStorage.getItem(`test_plans_${studentName}`) || '[]');
          roster.push({ name: studentName, age: data.studentAge || "14", testsCount: tests.length, comments: data.comments || "" });
        }
      }
      return roster;
    }

    const { data, error } = await supabase.from('students').select('name, age, comments, tests');
    if (error) throw error;
    return data.map(s => ({
      name: s.name,
      age: s.age,
      comments: s.comments || "",
      testsCount: s.tests?.length || 0
    }));
  },

  async getStudentData(name: string): Promise<StudentProfile | null> {
    if (!supabase) {
      const savedData = localStorage.getItem(`mandarin_mastery_data_${name}`);
      const savedPlans = localStorage.getItem(`test_plans_${name}`);
      if (!savedData) return null;
      const parsed = JSON.parse(savedData);
      return {
        name,
        age: parsed.studentAge || "14",
        comments: parsed.comments || "",
        points: parsed.points || [],
        logs: parsed.assessmentLogs || [],
        tests: savedPlans ? JSON.parse(savedPlans) : []
      };
    }

    const { data, error } = await supabase.from('students').select('*').eq('name', name).single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return data;
  },

  async saveStudentData(profile: StudentProfile): Promise<void> {
    if (!supabase) {
      localStorage.setItem(`mandarin_mastery_data_${profile.name}`, JSON.stringify({
        studentName: profile.name,
        studentAge: profile.age,
        points: profile.points,
        assessmentLogs: profile.logs,
        comments: profile.comments
      }));
      localStorage.setItem(`test_plans_${profile.name}`, JSON.stringify(profile.tests));
      return;
    }

    const { error } = await supabase.from('students').upsert({
      name: profile.name,
      age: profile.age,
      comments: profile.comments,
      points: profile.points,
      logs: profile.logs,
      tests: profile.tests,
      updated_at: new Date().toISOString()
    }, { onConflict: 'name' });

    if (error) throw error;
  },

  async deleteStudent(name: string): Promise<void> {
    if (!supabase) {
      localStorage.removeItem(`test_plans_${name}`);
      localStorage.removeItem(`mandarin_mastery_data_${name}`);
      return;
    }
    const { error } = await supabase.from('students').delete().eq('name', name);
    if (error) throw error;
  }
};
