import { useState, useCallback } from 'react';
import type { SavedJob, HistoryEntry } from '../types';
import { uuid } from '../lib/uuid';

const KEY = 'setout_jobs';

function load(): SavedJob[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(jobs: SavedJob[]) {
  localStorage.setItem(KEY, JSON.stringify(jobs));
}

export function useJobs(
  history: HistoryEntry[],
  updateEntry: (id: string, patch: Partial<HistoryEntry>) => void,
) {
  const [jobs, setJobs] = useState<SavedJob[]>(load);

  const createJob = useCallback((name: string): SavedJob => {
    const now = new Date().toISOString();
    const job: SavedJob = {
      id: uuid(),
      name: name.trim(),
      notes: '',
      createdAt: now,
      updatedAt: now,
      calculationIds: [],
    };
    setJobs(prev => {
      const next = [job, ...prev];
      persist(next);
      return next;
    });
    return job;
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<SavedJob>): void => {
    setJobs(prev => {
      const next = prev.map(j =>
        j.id === id ? { ...j, ...updates, updatedAt: new Date().toISOString() } : j,
      );
      persist(next);
      return next;
    });
  }, []);

  const deleteJob = useCallback((id: string): void => {
    const job = jobs.find(j => j.id === id);
    if (job) {
      job.calculationIds.forEach(calcId => updateEntry(calcId, { jobId: undefined }));
    }
    setJobs(prev => {
      const next = prev.filter(j => j.id !== id);
      persist(next);
      return next;
    });
  }, [jobs, updateEntry]);

  const addCalculationToJob = useCallback((jobId: string, calculationId: string): void => {
    setJobs(prev => {
      const next = prev.map(j => {
        if (j.id !== jobId || j.calculationIds.includes(calculationId)) return j;
        return {
          ...j,
          calculationIds: [calculationId, ...j.calculationIds],
          updatedAt: new Date().toISOString(),
        };
      });
      persist(next);
      return next;
    });
    updateEntry(calculationId, { jobId });
  }, [updateEntry]);

  const removeCalculationFromJob = useCallback((jobId: string, calculationId: string): void => {
    setJobs(prev => {
      const next = prev.map(j => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          calculationIds: j.calculationIds.filter(id => id !== calculationId),
          updatedAt: new Date().toISOString(),
        };
      });
      persist(next);
      return next;
    });
    updateEntry(calculationId, { jobId: undefined });
  }, [updateEntry]);

  const getJobCalculations = useCallback((jobId: string): HistoryEntry[] => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return [];
    return history.filter(h => job.calculationIds.includes(h.id));
  }, [jobs, history]);

  return {
    jobs,
    createJob,
    updateJob,
    deleteJob,
    addCalculationToJob,
    removeCalculationFromJob,
    getJobCalculations,
  };
}
