"use client";

import { useCallback } from "react";

const HEALTH_LOG_KEY = "regulate-health-log";
const HEALTH_ENABLED_KEY = "regulate-health-enabled";

export interface SessionData {
  type: string;
  startDate: string;
  endDate: string;
  durationSeconds: number;
  technique: string;
  nsStateBefore?: string;
  nsStateAfter?: string;
  aftercareResponse?: string;
}

interface HealthSample {
  type: "MindfulSession";
  startDate: string;
  endDate: string;
  duration: number;
  metadata: {
    technique: string;
    nsStateBefore?: string;
    nsStateAfter?: string;
    aftercareResponse?: string;
  };
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HEALTH_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function loadSamples(): HealthSample[] {
  try {
    const raw = localStorage.getItem(HEALTH_LOG_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return data.samples || [];
    }
  } catch { /* */ }
  return [];
}

function saveSamples(samples: HealthSample[]) {
  localStorage.setItem(HEALTH_LOG_KEY, JSON.stringify({ samples }));
}

export function useHealthLog() {
  const logSession = useCallback((data: SessionData) => {
    if (!isEnabled()) return;

    const sample: HealthSample = {
      type: "MindfulSession",
      startDate: data.startDate,
      endDate: data.endDate,
      duration: data.durationSeconds,
      metadata: {
        technique: data.technique,
        nsStateBefore: data.nsStateBefore,
        nsStateAfter: data.nsStateAfter,
        aftercareResponse: data.aftercareResponse,
      },
    };

    const samples = loadSamples();
    samples.push(sample);
    saveSamples(samples);
  }, []);

  return { logSession };
}
