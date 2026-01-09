
import { createClient } from '@supabase/supabase-js';
import { LearningPoint, AssessmentLog, AssignedTest } from '../types';

// Supabase credentials from environment variables
// For Netlify: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Initialize the Supabase client only if we have valid credentials
// Check for valid URL format to avoid connection errors
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.includes('.supabase.co');
  } catch {
    return false;
  }
};

export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl))
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

    try {
      const { data, error } = await supabase.from('students').select('name, age, comments, tests');
      if (error) {
        console.warn("Supabase error, falling back to localStorage:", error);
        // Fallback to localStorage on error
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
      return data.map(s => ({
        name: s.name,
        age: s.age,
        comments: s.comments || "",
        testsCount: s.tests?.length || 0
      }));
    } catch (error) {
      console.warn("Supabase connection failed, falling back to localStorage:", error);
      // Fallback to localStorage on connection error
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

    try {
      const { data, error } = await supabase.from('students').select('*').eq('name', name).single();
      if (error && error.code !== 'PGRST116') {
        console.warn("Supabase error, falling back to localStorage:", error);
        // Fallback to localStorage
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
      if (!data) return null;
      return data;
    } catch (error) {
      console.warn("Supabase connection failed, falling back to localStorage:", error);
      // Fallback to localStorage
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
  },

  async saveStudentData(profile: StudentProfile): Promise<void> {
    // Always save to localStorage as backup
    localStorage.setItem(`mandarin_mastery_data_${profile.name}`, JSON.stringify({
      studentName: profile.name,
      studentAge: profile.age,
      points: profile.points,
      assessmentLogs: profile.logs,
      comments: profile.comments
    }));
    localStorage.setItem(`test_plans_${profile.name}`, JSON.stringify(profile.tests));

    if (!supabase) {
      // If Supabase is not available, localStorage is already saved above
      return;
    }

    try {
      const { error } = await supabase.from('students').upsert({
        name: profile.name,
        age: profile.age,
        comments: profile.comments,
        points: profile.points,
        logs: profile.logs,
        tests: profile.tests,
        updated_at: new Date().toISOString()
      }, { onConflict: 'name' });

      if (error) {
        console.warn("Supabase save error, data saved to localStorage:", error);
        // Data is already saved to localStorage, so we don't throw
        // Only throw if it's a unique constraint violation (name already exists)
        if (error.code === '23505') {
          throw new Error("Student name already exists");
        }
      }
    } catch (error: any) {
      // If it's a "name already exists" error, re-throw it
      if (error.message === "Student name already exists") {
        throw error;
      }
      // For other errors (network, etc.), just log and continue
      // Data is already saved to localStorage
      console.warn("Supabase connection failed, data saved to localStorage:", error);
    }
  },

  async deleteStudent(name: string): Promise<void> {
    // Always delete from localStorage
    localStorage.removeItem(`test_plans_${name}`);
    localStorage.removeItem(`mandarin_mastery_data_${name}`);

    if (!supabase) {
      return;
    }

    try {
      const { error } = await supabase.from('students').delete().eq('name', name);
      if (error) {
        console.warn("Supabase delete error, data deleted from localStorage:", error);
        // Data is already deleted from localStorage
      }
    } catch (error) {
      console.warn("Supabase connection failed, data deleted from localStorage:", error);
      // Data is already deleted from localStorage
    }
  }
};
