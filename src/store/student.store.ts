import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Student } from "../lib/api";

interface StudentStore {
  student: Student | null;
  setStudent: (student: Student) => void;
  clearStudent: () => void;
}

export const useStudentStore = create<StudentStore>()(
  persist(
    (set) => ({
      student: null,
      setStudent: (student) => set({ student }),
      clearStudent: () => set({ student: null }),
    }),
    {
      name: "learngraph-student",
    },
  ),
);
