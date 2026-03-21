import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3700",
  headers: { "Content-Type": "application/json" },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Student = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type SubtopicInfo = {
  id: string;
  name: string;
  order: number;
  topicId: string;
  classLevel: number;
  subject: string;
};

export type SubtopicProgress = {
  subtopicId: string;
  subtopicName: string;
  order: number;
  mastery: number;
  attempts: number;
  isComplete: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  trend: string | null;
  lastAttempted: string | null;
};

export type ChapterProgress = {
  topicId: string;
  topicName: string;
  classLevel: number;
  subject: string;
  totalSubtopics: number;
  completedSubtopics: number;
  currentSubtopicId: string | null;
  chapterMastery: number;
  subtopics: SubtopicProgress[];
};

export type TopicSummary = {
  id: string;
  name: string;
  classLevel: number;
  subject: string;
  totalSubtopics: number;
};

export type Question = {
  index: number;
  cognitiveLevel: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Session = {
  sessionId: string;
  title: string;
  passage: string;
  questions: Question[];
  subtopic: SubtopicInfo;
};

export type AnswerResult = {
  questionIndex: number;
  cognitiveLevel: string;
  question: string;
  chosen: number;
  correct: number;
  isCorrect: boolean;
  explanation: string;
};

export type SubtopicResult = {
  subtopicId: string;
  subtopicName: string;
  subtopicOrder: number;
  previousMastery: number;
  newMastery: number;
  isComplete: boolean;
  justCompleted: boolean;
  trend: string;
  nextSubtopicId: string | null;
  chapterMastery: number;
};

export type QuizResult = {
  score: number;
  total: number;
  percentage: number;
  grade: string;
  answerResults: AnswerResult[];
  subtopicResult: SubtopicResult;
  knowledgeGaps: Array<{
    topicId: string;
    topicName: string;
    mastery: number;
  }>;
  message: string;
};

export type GraphNode = {
  id: string;
  name: string;
  subject: string;
  classLevel: number;
  mastery: number;
  attempts: number;
  trend: string | null;
  lastAttempted: string | null;
  masteryLevel:
    | "not_started"
    | "struggling"
    | "developing"
    | "proficient"
    | "mastered";
};

export type GraphEdge = {
  source: string;
  target: string;
  type: "REQUIRES" | "RELATED_TO";
};

export type StudentGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalTopics: number;
    attempted: number;
    mastered: number;
    struggling: number;
    averageMastery: number;
  };
};

export type Recommendation = {
  id: string;
  name: string;
  classLevel: number;
  mastery: number;
  attempts: number;
  masteryLevel: string;
};

// ─── API calls ────────────────────────────────────────────────────────────────

export const studentApi = {
  findOrCreate: async (name: string): Promise<Student> => {
    const res = await api.post("/api/students", { name });
    return res.data.data;
  },
  getById: async (id: string): Promise<Student> => {
    const res = await api.get(`/api/students/${id}`);
    return res.data.data;
  },
};

export const subtopicApi = {
  getTopics: async (
    subject: string,
    classLevel: number,
  ): Promise<TopicSummary[]> => {
    const res = await api.get("/api/subtopics/topics", {
      params: { subject, classLevel },
    });
    return res.data.data;
  },
  getChapterProgress: async (
    topicId: string,
    studentId: string,
  ): Promise<ChapterProgress> => {
    const res = await api.get(`/api/subtopics/${topicId}/progress`, {
      params: { studentId },
    });
    return res.data.data;
  },
  getCurrentSubtopic: async (topicId: string, studentId: string) => {
    const res = await api.get(`/api/subtopics/${topicId}/current`, {
      params: { studentId },
    });
    return res.data.data;
  },
  getAllChaptersProgress: async (
    studentId: string,
    subject: string,
    classLevel?: number,
  ): Promise<ChapterProgress[]> => {
    const res = await api.get("/api/subtopics/all-progress", {
      params: { studentId, subject, classLevel },
    });
    return res.data.data;
  },
};

export const contentApi = {
  generate: async (params: {
    studentId: string;
    subtopicId: string;
  }): Promise<Session> => {
    const res = await api.post("/api/content/generate", params);
    return res.data.data;
  },
};

export const quizApi = {
  submit: async (params: {
    studentId: string;
    sessionId: string;
    answers: number[];
  }): Promise<QuizResult> => {
    const res = await api.post("/api/quiz/submit", params);
    return res.data.data;
  },
};

export const graphApi = {
  getStudentGraph: async (studentId: string): Promise<StudentGraph> => {
    const res = await api.get(`/api/graph/${studentId}`);
    return res.data.data;
  },
  getRecommendations: async (
    studentId: string,
    subject: string,
    classLevel: number,
  ): Promise<Recommendation[]> => {
    const res = await api.get(`/api/graph/${studentId}/recommendations`, {
      params: { subject, classLevel },
    });
    return res.data.data;
  },
};
