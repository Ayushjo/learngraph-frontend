import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Student } from "../lib/api";

interface StudentStore {
  student: Student | null;
  classLevel: number;
  setStudent: (student: Student) => void;
  clearStudent: () => void;
  setClassLevel: (level: number) => void;
}

export const useStudentStore = create<StudentStore>()(
  persist(
    (set) => ({
      student: null,
      classLevel: 12,
      setStudent: (student) => set({ student }),
      clearStudent: () => set({ student: null, classLevel: 12 }),
      setClassLevel: (level) => set({ classLevel: level }),
    }),
    {
      name: "learngraph-student",
    },
  ),
);
