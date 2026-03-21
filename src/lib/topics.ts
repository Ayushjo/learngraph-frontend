// src/lib/topics.ts
export const SUBJECTS = ["Chemistry"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const CLASS_LEVELS = [11, 12] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

// These mirror src/data/subtopics.ts in the backend
// Only the fields needed by the frontend
export interface FrontendTopic {
  id: string;
  name: string;
  classLevel: number;
  subject: string;
  totalSubtopics: number;
}

// We fetch topics from the API instead of hardcoding
// This file just exports constants
