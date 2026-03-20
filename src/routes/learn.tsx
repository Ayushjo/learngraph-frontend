import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStudentStore } from "../store/student.store";
import { contentApi, quizApi } from "../lib/api";
import type { Session, QuizResult, Question } from "../lib/api";
import { TOPICS_BY_CLASS, CLASS_LEVELS } from "../lib/topics"
import toast from "react-hot-toast";
import {
  BookOpen,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Brain,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/learn")({
  component: LearnPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenState = "setup" | "loading" | "quiz" | "results";

// ─── Mastery color helper ─────────────────────────────────────────────────────

const masteryColor = (level: string) => {
  switch (level) {
    case "mastered":
      return "text-emerald-600 bg-emerald-50";
    case "proficient":
      return "text-yellow-600 bg-yellow-50";
    case "developing":
      return "text-orange-600 bg-orange-50";
    case "struggling":
      return "text-red-600 bg-red-50";
    default:
      return "text-slate-500 bg-slate-50";
  }
};

const masteryBar = (level: string) => {
  switch (level) {
    case "mastered":
      return "bg-emerald-500";
    case "proficient":
      return "bg-yellow-500";
    case "developing":
      return "bg-orange-500";
    case "struggling":
      return "bg-red-500";
    default:
      return "bg-slate-300";
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

function LearnPage() {
  const student = useStudentStore((s) => s.student);
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!student) navigate({ to: "/" });
  }, [student, navigate]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<ScreenState>("setup");
  const [classLevel, setClassLevel] = useState<number>(9);
  const [topicId, setTopicId] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const topics = TOPICS_BY_CLASS[classLevel] || [];
  const selectedTopic = topics.find((t:any) => t.id === topicId);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!student) return;
    if (!topicId) {
      toast.error("Please select a topic");
      return;
    }

    setScreen("loading");
    try {
      const result = await contentApi.generate({
        studentId: student.id,
        topicId,
        topicName: selectedTopic!.name,
        subject: "Science",
        classLevel,
      });
      setSession(result);
      setSelectedAnswers({});
      setQuizResult(null);
      setScreen("quiz");
    } catch {
      toast.error("Failed to generate content. Try again.");
      setScreen("setup");
    }
  };

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (quizResult) return; // locked after submit
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!student || !session) return;
    if (Object.keys(selectedAnswers).length < 5) {
      toast.error("Please answer all 5 questions before submitting");
      return;
    }
    setSubmitting(true);
    try {
      const answers = [0, 1, 2, 3, 4].map((i) => selectedAnswers[i] ?? 0);
      const result = await quizApi.submit({
        studentId: student.id,
        sessionId: session.sessionId,
        answers,
      });
      setQuizResult(result);
      setScreen("results");
      toast.success(`You scored ${result.score}/${result.total}!`);
    } catch {
      toast.error("Failed to submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setScreen("setup");
    setSession(null);
    setSelectedAnswers({});
    setQuizResult(null);
    setTopicId("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!student) return null;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-[#4F46E5]" />
          <span className="text-sm font-medium text-[#0F172A]">
            {session ? session.title : "Select a topic to begin"}
          </span>
          {session && (
            <>
              <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
              <span className="text-xs text-[#64748B]">
                Class {session.topic.classLevel} · {session.topic.subject}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {screen !== "setup" && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Topic
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* ── SETUP STATE ─────────────────────────────────────────────────── */}
        {screen === "setup" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-lg">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#0F172A]">Start Learning</h2>
                    <p className="text-xs text-[#64748B]">
                      Choose your class and topic
                    </p>
                  </div>
                </div>

                {/* Class selector */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Class
                  </label>
                  <div className="flex gap-2">
                    {CLASS_LEVELS.map((cls:any) => (
                      <button
                        key={cls}
                        onClick={() => {
                          setClassLevel(cls);
                          setTopicId("");
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          classLevel === cls
                            ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                            : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#4F46E5] hover:text-[#4F46E5]"
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Topic
                  </label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent bg-white appearance-none"
                  >
                    <option value="">— Select a topic —</option>
                    {topics.map((t:any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={!topicId}
                  className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Passage & Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── LOADING STATE ────────────────────────────────────────────────── */}
        {screen === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-7 h-7 text-[#4F46E5] animate-pulse" />
              </div>
              <h3 className="font-semibold text-[#0F172A] mb-1">
                Generating your passage...
              </h3>
              <p className="text-sm text-[#64748B]">
                Creating Class {classLevel} content for {selectedTopic?.name}
              </p>
              <div className="flex items-center justify-center gap-1 mt-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-[#4F46E5] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── QUIZ STATE ───────────────────────────────────────────────────── */}
        {(screen === "quiz" || screen === "results") && session && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left — Passage */}
            <div className="flex-[6] overflow-y-auto bg-[#F3F4F6] p-8">
              <div
                className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-10"
                style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
              >
                {/* Passage title */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2.5 py-1 rounded-full">
                      Class {session.topic.classLevel}
                    </span>
                    <span className="text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
                      {session.topic.subject}
                    </span>
                    <span className="text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
                      {session.topic.name}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-[#0F172A] leading-snug">
                    {session.title}
                  </h1>
                </div>

                {/* Divider */}
                <div className="border-t border-[#E2E8F0] mb-6" />

                {/* Passage text */}
                <p className="text-[#0F172A] text-base leading-8 tracking-normal">
                  {session.passage}
                </p>
              </div>
            </div>

            {/* Right — Quiz panel */}
            <div className="flex-[4] flex flex-col border-l border-[#E2E8F0] bg-white overflow-hidden">
              {/* Quiz header */}
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between flex-shrink-0">
                <div>
                  <span className="text-sm font-bold text-[#0F172A]">
                    5 questions
                  </span>
                  <span className="text-xs text-[#64748B] ml-2">
                    {Object.keys(selectedAnswers).length}/5 answered
                  </span>
                </div>
                {screen === "results" && quizResult && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${masteryColor(quizResult.mastery.masteryLevel)}`}
                  >
                    {quizResult.grade}
                  </span>
                )}
              </div>

              {/* Questions list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {session.questions.map((q: Question, qi: number) => (
                  <QuestionCard
                    key={qi}
                    question={q}
                    questionIndex={qi}
                    selectedAnswer={selectedAnswers[qi]}
                    result={quizResult?.answerResults[qi]}
                    onSelect={handleSelectAnswer}
                    showResult={screen === "results"}
                  />
                ))}

                {/* Results panel — shown below questions */}
                {screen === "results" && quizResult && (
                  <ResultsPanel result={quizResult} onReset={handleReset} />
                )}
              </div>

              {/* Submit button — only in quiz state */}
              {screen === "quiz" && (
                <div className="p-4 border-t border-[#E2E8F0] flex-shrink-0">
                  <button
                    onClick={handleSubmit}
                    disabled={
                      submitting || Object.keys(selectedAnswers).length < 5
                    }
                    className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Submit Answers
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question Card Component ──────────────────────────────────────────────────

function QuestionCard({
  question,
  questionIndex,
  selectedAnswer,
  result,
  onSelect,
  showResult,
}: {
  question: Question;
  questionIndex: number;
  selectedAnswer: number | undefined;
  result: any;
  onSelect: (qi: number, oi: number) => void;
  showResult: boolean;
}) {
  const cognitiveLabels: Record<string, string> = {
    recall: "Recall",
    vocabulary: "Vocabulary",
    cause_and_effect: "Cause & Effect",
    inference: "Inference",
    application: "Application",
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        showResult
          ? result?.isCorrect
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-red-200 bg-red-50/30"
          : "border-[#E2E8F0] bg-white"
      }`}
    >
      {/* Meta */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
          {questionIndex + 1}. MULTIPLE CHOICE
        </span>
        <span className="text-xs text-[#94A3B8]">·</span>
        <span className="text-xs text-[#64748B]">
          {cognitiveLabels[question.cognitiveLevel] || question.cognitiveLevel}
        </span>
        {showResult &&
          (result?.isCorrect ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />
          ))}
      </div>

      {/* Question text */}
      <p className="text-sm font-semibold text-[#0F172A] mb-3 leading-relaxed">
        {question.question}
      </p>

      {/* Options — 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option, oi) => {
          const isSelected = selectedAnswer === oi;
          const isCorrect = question.correctIndex === oi;
          const isWrong = showResult && isSelected && !isCorrect;

          let optionClass =
            "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F1F5F9]";
          if (showResult && isCorrect) {
            optionClass = "border-emerald-400 bg-emerald-50 text-emerald-700";
          } else if (isWrong) {
            optionClass = "border-red-400 bg-red-50 text-red-700";
          } else if (!showResult && isSelected) {
            optionClass = "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]";
          }

          return (
            <button
              key={oi}
              onClick={() => onSelect(questionIndex, oi)}
              disabled={showResult}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${optionClass}`}
            >
              {/* Radio circle */}
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  showResult && isCorrect
                    ? "border-emerald-500 bg-emerald-500"
                    : isWrong
                      ? "border-red-400 bg-red-400"
                      : !showResult && isSelected
                        ? "border-[#4F46E5] bg-[#4F46E5]"
                        : "border-[#CBD5E1]"
                }`}
              >
                {(showResult && isCorrect) ||
                (!showResult && isSelected) ||
                isWrong ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                ) : null}
              </div>
              <span
                className={`leading-tight ${showResult && isCorrect ? "font-semibold" : ""}`}
              >
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explanation — shown after submit */}
      {showResult && (
        <div
          className={`mt-3 p-3 rounded-lg text-xs leading-relaxed ${
            result?.isCorrect
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span className="font-semibold">Explanation: </span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}

// ─── Results Panel Component ──────────────────────────────────────────────────

function ResultsPanel({
  result,
  onReset,
}: {
  result: QuizResult;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-4">
      {/* Score */}
      <div className="text-center py-2">
        <div className="text-4xl font-bold text-[#0F172A] mb-1">
          {result.score}
          <span className="text-xl text-[#94A3B8]">/{result.total}</span>
        </div>
        <div className="text-sm text-[#64748B]">{result.message}</div>
      </div>

      {/* Mastery update */}
      <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#4F46E5]" />
          <span className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide">
            Mastery Update
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#0F172A] font-medium truncate pr-2">
            {result.mastery.topicName}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${masteryColor(result.mastery.masteryLevel)}`}
          >
            {result.mastery.masteryLevel}
          </span>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#E2E8F0] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${masteryBar(result.mastery.masteryLevel)}`}
              style={{ width: `${result.mastery.newMastery * 100}%` }}
            />
          </div>
          <span className="text-xs text-[#64748B] flex-shrink-0">
            {Math.round(result.mastery.newMastery * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs text-[#94A3B8]">
            {Math.round(result.mastery.previousMastery * 100)}% →
          </span>
          <span className="text-xs font-medium text-[#4F46E5]">
            {Math.round(result.mastery.newMastery * 100)}%
          </span>
          <span
            className={`text-xs ml-1 ${
              result.mastery.trend === "improving"
                ? "text-emerald-600"
                : result.mastery.trend === "declining"
                  ? "text-red-500"
                  : "text-[#64748B]"
            }`}
          >
            · {result.mastery.trend}
          </span>
        </div>
      </div>

      {/* Knowledge gaps */}
      {result.knowledgeGaps.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
              Knowledge Gaps
            </span>
          </div>
          <p className="text-xs text-amber-700 mb-2">
            Strengthen these prerequisite topics:
          </p>
          <div className="space-y-1.5">
            {result.knowledgeGaps.map((gap) => (
              <div
                key={gap.topicId}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-amber-800 font-medium">
                  {gap.topicName}
                </span>
                <span className="text-xs text-amber-600">
                  {Math.round(gap.mastery * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisite boosts */}
      {result.prerequisiteBoosts.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
              Related Topics Boosted
            </span>
          </div>
          <div className="space-y-1.5">
            {result.prerequisiteBoosts.map((boost) => (
              <div
                key={boost.topicId}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-blue-800 font-medium">
                  {boost.topicName}
                </span>
                <span className="text-xs text-blue-600">
                  +
                  {Math.round((boost.newMastery - boost.previousMastery) * 100)}
                  %
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Try another topic */}
      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        <RotateCcw className="w-4 h-4" />
        Try Another Topic
      </button>
    </div>
  );
}
