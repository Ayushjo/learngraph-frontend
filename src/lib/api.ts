import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3700",
  headers: { "Content-Type": "application/json" },
});

export type Student = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Topic = {
  id: string;
  name: string;
  subject: string;
  classLevel: number;
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
  topic: Topic;
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

export type QuizResult = {
  score: number;
  total: number;
  percentage: number;
  grade: string;
  answerResults: AnswerResult[];
  mastery: {
    topicId: string;
    topicName: string;
    previousMastery: number;
    newMastery: number;
    trend: string;
    masteryLevel: string;
    attempts: number;
  };
  prerequisiteBoosts: Array<{
    topicId: string;
    topicName: string;
    previousMastery: number;
    newMastery: number;
  }>;
  knowledgeGaps: Array<{
    topicId: string;
    topicName: string;
    mastery: number;
    masteryLevel: string;
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

export const contentApi = {
  generate: async (params: {
    studentId: string;
    topicId: string;
    topicName: string;
    subject: string;
    classLevel: number;
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
  getFilteredGraph: async (
    studentId: string,
    subject: string,
    classLevel?: number,
  ): Promise<StudentGraph> => {
    const params = classLevel ? { subject, classLevel } : { subject };
    const res = await api.get(`/api/graph/${studentId}/filtered`, { params });
    return res.data.data;
  },
  getRecommendations: async (
    studentId: string,
    subject: string,
    maxClassLevel: number = 10,
  ) => {
    const res = await api.get(`/api/graph/${studentId}/recommendations`, {
      params: { subject, maxClassLevel },
    });
    return res.data.data;
  },
};
