import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Student } from "../lib/api";

interface StudentStore {
  student: Student | null;
  preferredClassLevel: number;
  setStudent: (student: Student) => void;
  clearStudent: () => void;
  setPreferredClassLevel: (level: number) => void;
}

export const useStudentStore = create<StudentStore>()(
  persist(
    (set) => ({
      student: null,
      preferredClassLevel: 9, // default to class 9
      setStudent: (student) => set({ student }),
      clearStudent: () => set({ student: null, preferredClassLevel: 9 }),
      setPreferredClassLevel: (level) => set({ preferredClassLevel: level }),
    }),
    {
      name: "learngraph-student",
    },
  ),
);
