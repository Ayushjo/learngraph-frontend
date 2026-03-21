import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useStudentStore } from "../store/student.store";
import { subtopicApi, contentApi, quizApi, graphApi } from "../lib/api";
import type {
  Session,
  QuizResult,
  Question,
  ChapterProgress,
  TopicSummary,
  Recommendation,
} from "../lib/api";
import { redirect } from "@tanstack/react-router";
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
  Clock,
  Zap,
  Lock,
  FlaskConical,
  ChevronLeft,
  CheckCheck,
} from "lucide-react";
import { ChemPassage, ChemText } from "../lib/chemNotation";

export const Route = createFileRoute("/learn")({
  beforeLoad: () => {
    const student = useStudentStore.getState().student;
    if (!student) throw redirect({ to: "/" });
  },
  component: LearnPage,
});

type ScreenState = "setup" | "chapter" | "loading" | "quiz" | "results";

const MASTERY_COLORS: Record<string, string> = {
  mastered: "#059669",
  proficient: "#D97706",
  developing: "#2563EB",
  struggling: "#DC2626",
  not_started: "#9CA3AF",
};

const MASTERY_BG: Record<string, string> = {
  mastered: "#ECFDF5",
  proficient: "#FFFBEB",
  developing: "#EFF6FF",
  struggling: "#FEF2F2",
  not_started: "#F9FAFB",
};

const MASTERY_LABEL: Record<string, string> = {
  mastered: "Mastered",
  proficient: "Proficient",
  developing: "Developing",
  struggling: "Struggling",
  not_started: "Not Started",
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const getMasteryLevel = (mastery: number, attempts: number) => {
  if (attempts === 0) return "not_started";
  if (mastery < 0.4) return "struggling";
  if (mastery < 0.6) return "developing";
  if (mastery < 0.8) return "proficient";
  return "mastered";
};

// ─── Main Component ───────────────────────────────────────────────────────────

function LearnPage() {
  const student = useStudentStore((s) => s.student);
  const classLevel = useStudentStore((s) => s.classLevel);

  const [screen, setScreen] = useState<ScreenState>("setup");

  // Dashboard data
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [allProgress, setAllProgress] = useState<ChapterProgress[]>([]);
  const [dashLoading, setDashLoading] = useState(true);

  // Chapter view
  const [selectedTopic, setSelectedTopic] = useState<TopicSummary | null>(null);
  const [chapterProgress, setChapterProgress] =
    useState<ChapterProgress | null>(null);

  // Quiz state
  const [currentSubtopicId, setCurrentSubtopicId] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!student) return;
    setDashLoading(true);
    try {
      const [topicsData, recs, progress] = await Promise.all([
        subtopicApi.getTopics("Chemistry", classLevel),
        graphApi.getRecommendations(student.id, "Chemistry", classLevel),
        subtopicApi.getAllChaptersProgress(student.id, "Chemistry", classLevel),
      ]);
      setTopics(topicsData);
      setRecommendations(recs.slice(0, 3));
      setAllProgress(progress);
    } catch {
      // silent
    } finally {
      setDashLoading(false);
    }
  }, [student, classLevel]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  useEffect(() => {
    if (screen === "setup") fetchDashboard();
  }, [screen]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectChapter = async (topic: TopicSummary) => {
    if (!student) return;
    setSelectedTopic(topic);
    try {
      const progress = await subtopicApi.getChapterProgress(
        topic.id,
        student.id,
      );
      setChapterProgress(progress);
      setScreen("chapter");
    } catch {
      toast.error("Failed to load chapter");
    }
  };

  const handleStartSubtopic = async (subtopicId: string) => {
    if (!student) return;
    setCurrentSubtopicId(subtopicId);
    setScreen("loading");
    try {
      const result = await contentApi.generate({
        studentId: student.id,
        subtopicId,
      });
      setSession(result);
      setSelectedAnswers({});
      setQuizResult(null);
      setUnansweredQuestions([]);
      setScreen("quiz");
    } catch {
      toast.error("Failed to generate content. Try again.");
      setScreen("chapter");
    }
  };

  const handleSelectAnswer = (qi: number, oi: number) => {
    if (quizResult) return;
    setSelectedAnswers((prev) => ({ ...prev, [qi]: oi }));
    setUnansweredQuestions((prev) => prev.filter((i) => i !== qi));
  };

  const handleSubmit = async () => {
    if (!student || !session) return;
    const unanswered = [0, 1, 2, 3, 4].filter(
      (i) => selectedAnswers[i] === undefined,
    );
    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered);
      toast.error(
        `Please answer question${unanswered.length > 1 ? "s" : ""} ${unanswered.map((i) => i + 1).join(", ")}`,
      );
      document
        .getElementById(`question-${unanswered[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setUnansweredQuestions([]);
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
      toast.success(`${result.score}/${result.total} — ${result.grade}!`);
    } catch {
      toast.error("Failed to submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextSubtopic = async () => {
    if (!quizResult?.subtopicResult.nextSubtopicId || !student) return;
    await handleStartSubtopic(quizResult.subtopicResult.nextSubtopicId);
  };

  const handleBackToChapter = async () => {
    if (!student || !selectedTopic) return;
    const progress = await subtopicApi.getChapterProgress(
      selectedTopic.id,
      student.id,
    );
    setChapterProgress(progress);
    setScreen("chapter");
    setSession(null);
    setQuizResult(null);
    setSelectedAnswers({});
  };

  const handleBackToSetup = () => {
    setScreen("setup");
    setSelectedTopic(null);
    setChapterProgress(null);
    setSession(null);
    setQuizResult(null);
    setSelectedAnswers({});
    fetchDashboard();
  };

  if (!student) return null;

  // Get last attempted chapter for "Continue" card
  const inProgressChapters = allProgress
    .filter(
      (p) => p.chapterMastery > 0 && p.completedSubtopics < p.totalSubtopics,
    )
    .sort((a, b) => b.chapterMastery - a.chapterMastery);
  const continueChapter = inProgressChapters[0] ?? null;

  return (
    <div
      style={{
        height: "calc(100vh - 52px)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* ── Breadcrumb bar ── */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FlaskConical size={14} color="var(--accent)" strokeWidth={2} />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: screen === "setup" ? "var(--dark)" : "var(--muted)",
              cursor: screen !== "setup" ? "pointer" : "default",
            }}
            onClick={screen !== "setup" ? handleBackToSetup : undefined}
          >
            Chemistry · Class {classLevel}
          </span>
          {selectedTopic && (
            <>
              <ChevronRight size={12} color="var(--muted)" />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: screen === "chapter" ? "var(--dark)" : "var(--muted)",
                  cursor: screen !== "chapter" ? "pointer" : "default",
                }}
                onClick={screen !== "chapter" ? handleBackToChapter : undefined}
              >
                {selectedTopic.name}
              </span>
            </>
          )}
          {session && (
            <>
              <ChevronRight size={12} color="var(--muted)" />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--dark)",
                }}
              >
                {session.subtopic.name}
              </span>
            </>
          )}
        </div>
        {screen !== "setup" && (
          <button
            onClick={handleBackToSetup}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--muted)",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
            }}
          >
            <ChevronLeft size={12} strokeWidth={2} />
            All Chapters
          </button>
        )}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* ════ SETUP — Dashboard ════ */}
        {screen === "setup" && (
          <div
            style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}
            className="slide-up"
          >
            <div style={{ maxWidth: "900px", margin: "0 auto" }}>
              {/* Greeting */}
              <div style={{ marginBottom: "28px" }}>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "var(--dark)",
                    margin: "0 0 4px",
                    letterSpacing: "-0.4px",
                  }}
                >
                  {getGreeting()},{" "}
                  <span
                    style={{
                      color: "var(--accent)",
                      textTransform: "capitalize",
                    }}
                  >
                    {student.name}
                  </span>{" "}
                  👋
                </h1>
                <p
                  style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}
                >
                  Class {classLevel} Chemistry ·{" "}
                  {allProgress.filter((p) => p.completedSubtopics > 0).length}{" "}
                  chapters started
                </p>
              </div>

              {/* Top row — Continue + Recommended */}
              {dashLoading ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginBottom: "28px",
                  }}
                >
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        className="skeleton"
                        style={{ height: "12px", width: "40%" }}
                      />
                      <div
                        className="skeleton"
                        style={{ height: "80px", borderRadius: "12px" }}
                      />
                      <div
                        className="skeleton"
                        style={{ height: "40px", borderRadius: "10px" }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginBottom: "28px",
                  }}
                >
                  {/* Continue learning */}
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      padding: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "14px",
                      }}
                    >
                      <Clock size={13} color="var(--accent)" strokeWidth={2} />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--accent)",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                        }}
                      >
                        Continue Learning
                      </span>
                    </div>
                    {continueChapter ? (
                      <>
                        <div
                          style={{
                            background: "var(--bg)",
                            borderRadius: "12px",
                            padding: "14px",
                            marginBottom: "12px",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "var(--dark)",
                              margin: "0 0 8px",
                              lineHeight: 1.3,
                            }}
                          >
                            {continueChapter.topicName}
                          </p>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "var(--muted)",
                              margin: "0 0 8px",
                            }}
                          >
                            {continueChapter.completedSubtopics}/
                            {continueChapter.totalSubtopics} subtopics complete
                          </p>
                          <div
                            style={{
                              background: "var(--border)",
                              borderRadius: "99px",
                              height: "5px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${(continueChapter.completedSubtopics / continueChapter.totalSubtopics) * 100}%`,
                                background: "var(--accent)",
                                borderRadius: "99px",
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const topic = topics.find(
                              (t) => t.id === continueChapter.topicId,
                            );
                            if (topic) handleSelectChapter(topic);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            padding: "11px",
                            borderRadius: "10px",
                            border: "none",
                            background: "var(--accent)",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "var(--font-ui)",
                            boxShadow: "0 2px 10px rgba(232,68,106,0.25)",
                          }}
                        >
                          Continue <ArrowRight size={13} strokeWidth={2.5} />
                        </button>
                      </>
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "20px 0",
                          color: "var(--muted)",
                          fontSize: "13px",
                        }}
                      >
                        <BookOpen
                          size={28}
                          color="var(--border)"
                          style={{ margin: "0 auto 8px", display: "block" }}
                        />
                        <p style={{ margin: 0 }}>
                          No chapters started yet.
                          <br />
                          Pick one below to begin!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Recommended */}
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      padding: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "14px",
                      }}
                    >
                      <Zap size={13} color="#D97706" strokeWidth={2} />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#D97706",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                        }}
                      >
                        Recommended Next
                      </span>
                    </div>
                    {recommendations.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {recommendations.map((rec) => {
                          const topic = topics.find((t) => t.id === rec.id);
                          return (
                            <button
                              key={rec.id}
                              onClick={() =>
                                topic && handleSelectChapter(topic)
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 12px",
                                borderRadius: "10px",
                                border: "1px solid var(--border)",
                                background: "var(--bg)",
                                cursor: "pointer",
                                fontFamily: "var(--font-ui)",
                                textAlign: "left",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.borderColor = "var(--accent)";
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = "var(--accent-light)";
                              }}
                              onMouseLeave={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.borderColor = "var(--border)";
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = "var(--bg)";
                              }}
                            >
                              <div>
                                <p
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: "var(--dark)",
                                    margin: "0 0 2px",
                                  }}
                                >
                                  {rec.name}
                                </p>
                                <p
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--muted)",
                                    margin: 0,
                                  }}
                                >
                                  {
                                    topics.find((t) => t.id === rec.id)
                                      ?.totalSubtopics
                                  }{" "}
                                  subtopics
                                </p>
                              </div>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  borderRadius: "99px",
                                  color: MASTERY_COLORS[rec.masteryLevel],
                                  background: MASTERY_BG[rec.masteryLevel],
                                  flexShrink: 0,
                                }}
                              >
                                {MASTERY_LABEL[rec.masteryLevel]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "20px 0",
                          color: "var(--muted)",
                          fontSize: "13px",
                        }}
                      >
                        <Sparkles
                          size={28}
                          color="var(--border)"
                          style={{ margin: "0 auto 8px", display: "block" }}
                        />
                        <p style={{ margin: 0 }}>
                          Start learning to get recommendations
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All chapters grid */}
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: "12px",
                  }}
                >
                  All Chapters — Class {classLevel} Chemistry
                </div>

                {dashLoading ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                    }}
                  >
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "14px",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div
                          className="skeleton"
                          style={{ height: "13px", width: "80%" }}
                        />
                        <div
                          className="skeleton"
                          style={{ height: "13px", width: "55%" }}
                        />
                        <div
                          className="skeleton"
                          style={{ height: "4px", borderRadius: "99px" }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            className="skeleton"
                            style={{ height: "11px", width: "28%" }}
                          />
                          <div
                            className="skeleton"
                            style={{ height: "11px", width: "22%" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                    }}
                  >
                    {topics.map((topic) => {
                      const progress = allProgress.find(
                        (p) => p.topicId === topic.id,
                      );
                      const completed = progress?.completedSubtopics ?? 0;
                      const total = topic.totalSubtopics;
                      const mastery = progress?.chapterMastery ?? 0;
                      const masteryLevel = getMasteryLevel(
                        mastery,
                        mastery > 0 ? 1 : 0,
                      );
                      const pct = Math.round((completed / total) * 100);

                      return (
                        <button
                          key={topic.id}
                          onClick={() => handleSelectChapter(topic)}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "14px",
                            padding: "16px",
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: "var(--font-ui)",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.borderColor = "var(--accent)";
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.transform = "translateY(-1px)";
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.boxShadow =
                              "0 4px 16px rgba(232,68,106,0.1)";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.borderColor = "var(--border)";
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.transform = "none";
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.boxShadow = "none";
                          }}
                        >
                          <p
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--dark)",
                              margin: "0 0 10px",
                              lineHeight: 1.4,
                            }}
                          >
                            {topic.name}
                          </p>
                          <div
                            style={{
                              background: "var(--border)",
                              borderRadius: "99px",
                              height: "4px",
                              overflow: "hidden",
                              marginBottom: "8px",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                background:
                                  completed === total && total > 0
                                    ? "#059669"
                                    : "var(--accent)",
                                borderRadius: "99px",
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--muted)",
                              }}
                            >
                              {completed}/{total} done
                            </span>
                            {completed === total && total > 0 ? (
                              <CheckCheck
                                size={13}
                                color="#059669"
                                strokeWidth={2.5}
                              />
                            ) : (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  padding: "2px 7px",
                                  borderRadius: "99px",
                                  color: MASTERY_COLORS[masteryLevel],
                                  background: MASTERY_BG[masteryLevel],
                                }}
                              >
                                {MASTERY_LABEL[masteryLevel]}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ CHAPTER VIEW — Subtopic roadmap ════ */}
        {screen === "chapter" && chapterProgress && selectedTopic && (
          <div
            style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}
            className="slide-up"
          >
            <div style={{ maxWidth: "680px", margin: "0 auto" }}>
              {/* Chapter header */}
              <div style={{ marginBottom: "28px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "99px",
                      color: "var(--accent)",
                      background: "var(--accent-light)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    Class {selectedTopic.classLevel}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--muted)",
                    }}
                  >
                    {chapterProgress.completedSubtopics}/
                    {chapterProgress.totalSubtopics} subtopics complete
                  </span>
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--dark)",
                    margin: "0 0 12px",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {chapterProgress.topicName}
                </h2>

                {/* Chapter progress bar */}
                <div
                  style={{
                    background: "var(--border)",
                    borderRadius: "99px",
                    height: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(chapterProgress.completedSubtopics / chapterProgress.totalSubtopics) * 100}%`,
                      background: "var(--accent)",
                      borderRadius: "99px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>

              {/* Subtopic roadmap */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {chapterProgress.subtopics.map((sub, index) => {
                  const isLocked = !sub.isUnlocked;
                  const isCurrent = sub.isCurrent;
                  const isComplete = sub.isComplete;

                  return (
                    <div
                      key={sub.subtopicId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "16px",
                        borderRadius: "14px",
                        border: "1.5px solid",
                        borderColor: isComplete
                          ? "#BBF7D0"
                          : isCurrent
                            ? "var(--accent)"
                            : "var(--border)",
                        background: isComplete
                          ? "#F0FDF4"
                          : isCurrent
                            ? "var(--accent-light)"
                            : isLocked
                              ? "var(--bg)"
                              : "var(--surface)",
                        opacity: isLocked ? 0.6 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {/* Step indicator */}
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isComplete
                            ? "#059669"
                            : isCurrent
                              ? "var(--accent)"
                              : "var(--border)",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: 700,
                        }}
                      >
                        {isComplete ? (
                          <CheckCheck size={16} strokeWidth={2.5} />
                        ) : isLocked ? (
                          <Lock size={14} strokeWidth={2} />
                        ) : (
                          sub.order
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: isLocked ? "var(--muted)" : "var(--dark)",
                            margin: "0 0 4px",
                          }}
                        >
                          {sub.subtopicName}
                        </p>
                        {sub.attempts > 0 && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                background: "var(--border)",
                                borderRadius: "99px",
                                height: "4px",
                                overflow: "hidden",
                                maxWidth: "120px",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${sub.mastery * 100}%`,
                                  background: isComplete
                                    ? "#059669"
                                    : "var(--accent)",
                                  borderRadius: "99px",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--muted)",
                              }}
                            >
                              {Math.round(sub.mastery * 100)}% · {sub.attempts}{" "}
                              attempt{sub.attempts !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        {isCurrent && sub.attempts === 0 && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--accent)",
                              fontWeight: 600,
                            }}
                          >
                            Ready to start
                          </span>
                        )}
                        {isCurrent && sub.attempts > 0 && !sub.isComplete && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--accent)",
                              fontWeight: 600,
                            }}
                          >
                            Keep practicing to complete
                          </span>
                        )}
                        {isLocked && (
                          <span
                            style={{ fontSize: "11px", color: "var(--muted)" }}
                          >
                            Complete subtopic {sub.order - 1} to unlock
                          </span>
                        )}
                      </div>

                      {/* Action button */}
                      {!isLocked && (
                        <button
                          onClick={() => handleStartSubtopic(sub.subtopicId)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "8px 14px",
                            borderRadius: "9px",
                            border: "none",
                            background: isComplete
                              ? "#059669"
                              : "var(--accent)",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "var(--font-ui)",
                            flexShrink: 0,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                        >
                          {isComplete
                            ? "Retry"
                            : isCurrent && sub.attempts > 0
                              ? "Try Again"
                              : "Start"}
                          <ArrowRight size={12} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════ LOADING ════ */}
        {screen === "loading" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  background: "var(--accent-light)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <FlaskConical size={28} color="var(--accent)" strokeWidth={2} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--dark)",
                  margin: "0 0 6px",
                }}
              >
                Generating your passage...
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--muted)",
                  margin: "0 0 20px",
                }}
              >
                Creating Class {classLevel} content
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  justifyContent: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ QUIZ + RESULTS ════ */}
        {(screen === "quiz" || screen === "results") && session && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Left — Passage */}
            <div
              style={{
                flex: "0 0 60%",
                overflowY: "auto",
                background: "#FFF0F3",
                padding: "32px",
              }}
            >
              <div
                style={{
                  maxWidth: "680px",
                  margin: "0 auto",
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  padding: "40px",
                  boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
                }}
              >
                {/* Tags */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    {
                      text: `S${session.subtopic.order} of ${selectedTopic?.totalSubtopics ?? "?"}`,
                      color: "var(--accent)",
                      bg: "var(--accent-light)",
                    },
                    {
                      text: session.subtopic.name,
                      color: "var(--muted)",
                      bg: "var(--bg)",
                    },
                  ].map((tag) => (
                    <span
                      key={tag.text}
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: "99px",
                        color: tag.color,
                        background: tag.bg,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {tag.text}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--dark)",
                    margin: "0 0 20px",
                    lineHeight: 1.3,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {session.title}
                </h1>

                <div
                  style={{
                    height: "1px",
                    background: "var(--border)",
                    margin: "0 0 24px",
                  }}
                />

                {/* Passage */}
                {/* Passage */}
                <ChemPassage
                  text={session.passage}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "16px",
                    lineHeight: 1.95,
                    color: "#2D1B22",
                    margin: 0,
                    fontWeight: 400,
                  }}
                />
              </div>
            </div>

            {/* Right — Quiz */}
            <div
              style={{
                flex: "0 0 40%",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid var(--border)",
                background: "var(--surface)",
                overflow: "hidden",
              }}
            >
              {/* Quiz header */}
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--dark)",
                    }}
                  >
                    5 questions
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--muted)",
                      marginLeft: "8px",
                    }}
                  >
                    {Object.keys(selectedAnswers).length}/5 answered
                  </span>
                </div>
                {screen === "results" && quizResult && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "99px",
                      color:
                        MASTERY_COLORS[
                          quizResult.subtopicResult.isComplete
                            ? "mastered"
                            : "struggling"
                        ],
                      background:
                        MASTERY_BG[
                          quizResult.subtopicResult.isComplete
                            ? "mastered"
                            : "struggling"
                        ],
                    }}
                  >
                    {quizResult.grade}
                  </span>
                )}
              </div>

              {/* Questions */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {session.questions.map((q: Question, qi: number) => (
                  <QuestionCard
                    key={qi}
                    question={q}
                    questionIndex={qi}
                    selectedAnswer={selectedAnswers[qi]}
                    result={quizResult?.answerResults[qi]}
                    onSelect={handleSelectAnswer}
                    showResult={screen === "results"}
                    isUnanswered={unansweredQuestions.includes(qi)}
                  />
                ))}

                {screen === "results" && quizResult && (
                  <ResultsPanel
                    result={quizResult}
                    onNextSubtopic={
                      quizResult.subtopicResult.nextSubtopicId
                        ? handleNextSubtopic
                        : undefined
                    }
                    onRetry={() => handleStartSubtopic(currentSubtopicId)}
                    onBackToChapter={handleBackToChapter}
                  />
                )}
              </div>

              {/* Submit */}
              {screen === "quiz" && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderTop: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "7px",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      background: "var(--accent)",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: submitting ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-ui)",
                      boxShadow: "0 2px 10px rgba(232,68,106,0.3)",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? (
                      <div
                        style={{
                          width: "15px",
                          height: "15px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    ) : (
                      <>
                        <span>Submit Answers</span>
                        <ArrowRight size={14} strokeWidth={2.5} />
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

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  questionIndex,
  selectedAnswer,
  result,
  onSelect,
  showResult,
  isUnanswered,
}: {
  question: Question;
  questionIndex: number;
  selectedAnswer: number | undefined;
  result: any;
  onSelect: (qi: number, oi: number) => void;
  showResult: boolean;
  isUnanswered: boolean;
}) {
  const cogLabels: Record<string, string> = {
    recall: "Recall",
    vocabulary: "Vocabulary",
    cause_and_effect: "Cause & Effect",
    inference: "Inference",
    application: "Application",
  };

  const cardBorder = isUnanswered
    ? "#DC2626"
    : showResult
      ? result?.isCorrect
        ? "#BBF7D0"
        : "#FECACA"
      : "var(--border)";

  const cardBg = isUnanswered
    ? "#FEF2F2"
    : showResult
      ? result?.isCorrect
        ? "#F0FDF4"
        : "#FEF2F2"
      : "var(--surface)";

  return (
    <div
      id={`question-${questionIndex}`}
      className={isUnanswered ? "shake" : ""}
      style={{
        borderRadius: "12px",
        border: `1.5px solid ${cardBorder}`,
        background: cardBg,
        padding: "14px",
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {questionIndex + 1}.{" "}
          {cogLabels[question.cognitiveLevel] ?? question.cognitiveLevel}
        </span>
        {showResult && (
          <div style={{ marginLeft: "auto" }}>
            {result?.isCorrect ? (
              <CheckCircle2 size={14} color="#059669" strokeWidth={2} />
            ) : (
              <XCircle size={14} color="#DC2626" strokeWidth={2} />
            )}
          </div>
        )}
      </div>

      <ChemText
        text={question.question}
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--dark)",
          display: "block",
          margin: "0 0 12px",
          lineHeight: 1.5,
        }}
      />

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}
      >
        {question.options.map((option, oi) => {
          const isSelected = selectedAnswer === oi;
          const isCorrect = question.correctIndex === oi;
          const isWrong = showResult && isSelected && !isCorrect;

          let border = "var(--border)";
          let bg = "var(--bg)";
          let color = "var(--dark)";
          let radioBorder = "#D1D5DB";
          let radioFill = "transparent";

          if (showResult && isCorrect) {
            border = "#059669";
            bg = "#F0FDF4";
            color = "#065F46";
            radioBorder = "#059669";
            radioFill = "#059669";
          } else if (isWrong) {
            border = "#DC2626";
            bg = "#FEF2F2";
            color = "#991B1B";
            radioBorder = "#DC2626";
            radioFill = "#DC2626";
          } else if (!showResult && isSelected) {
            border = "var(--accent)";
            bg = "var(--accent-light)";
            color = "var(--accent)";
            radioBorder = "var(--accent)";
            radioFill = "var(--accent)";
          }

          return (
            <button
              key={oi}
              onClick={() => onSelect(questionIndex, oi)}
              disabled={showResult}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "7px",
                padding: "9px 10px",
                borderRadius: "9px",
                border: `1.5px solid ${border}`,
                background: bg,
                color,
                fontSize: "11px",
                textAlign: "left",
                cursor: showResult ? "default" : "pointer",
                fontFamily: "var(--font-ui)",
                lineHeight: 1.4,
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  border: `2px solid ${radioBorder}`,
                  background: radioFill,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "1px",
                }}
              >
                {(isSelected || (showResult && isCorrect)) && (
                  <div
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                )}
              </div>
              <ChemText
                text={option}
                style={{ fontWeight: showResult && isCorrect ? 600 : 400 }}
              />
            </button>
          );
        })}
      </div>

      {showResult && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            borderRadius: "9px",
            background: result?.isCorrect ? "#F0FDF4" : "#FEF2F2",
            border: `1px solid ${result?.isCorrect ? "#BBF7D0" : "#FECACA"}`,
            fontSize: "11px",
            color: result?.isCorrect ? "#065F46" : "#991B1B",
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontWeight: 700 }}>Explanation: </span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────

function ResultsPanel({
  result,
  onNextSubtopic,
  onRetry,
  onBackToChapter,
}: {
  result: QuizResult;
  onNextSubtopic?: () => void;
  onRetry: () => void;
  onBackToChapter: () => void;
}) {
  const { subtopicResult } = result;

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1.5px solid var(--border)",
        background: "var(--surface)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Score */}
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "42px",
            fontWeight: 700,
            color: "var(--dark)",
            lineHeight: 1,
          }}
        >
          {result.score}
          <span
            style={{ fontSize: "20px", color: "var(--muted)", fontWeight: 400 }}
          >
            /{result.total}
          </span>
        </div>
        <p
          style={{ fontSize: "13px", color: "var(--muted)", margin: "6px 0 0" }}
        >
          {result.message}
        </p>
      </div>

      {/* Subtopic completion banner */}
      {subtopicResult.justCompleted && (
        <div
          className="pop-in"
          style={{
            background: "#ECFDF5",
            border: "1px solid #BBF7D0",
            borderRadius: "10px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCheck size={16} color="#059669" strokeWidth={2.5} />
          <div>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#065F46",
                margin: "0 0 1px",
              }}
            >
              Subtopic Complete! 🎉
            </p>
            <p style={{ fontSize: "11px", color: "#059669", margin: 0 }}>
              {subtopicResult.subtopicName} is now unlocked for the next level
            </p>
          </div>
        </div>
      )}

      {/* Mastery update */}
      <div
        style={{
          background: "var(--bg)",
          borderRadius: "10px",
          padding: "14px",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            marginBottom: "10px",
          }}
        >
          <TrendingUp size={13} color="var(--accent)" strokeWidth={2} />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Mastery Update
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span
            style={{ fontSize: "13px", fontWeight: 600, color: "var(--dark)" }}
          >
            {subtopicResult.subtopicName}
          </span>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            Subtopic {subtopicResult.subtopicOrder}
          </span>
        </div>
        <div
          style={{
            background: "var(--border)",
            borderRadius: "99px",
            height: "6px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${subtopicResult.newMastery * 100}%`,
              background: subtopicResult.isComplete
                ? "#059669"
                : "var(--accent)",
              borderRadius: "99px",
              transition: "width 0.8s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginTop: "6px",
            fontSize: "11px",
          }}
        >
          <span style={{ color: "var(--muted)" }}>
            {Math.round(subtopicResult.previousMastery * 100)}%
          </span>
          <span style={{ color: "var(--muted)" }}>→</span>
          <span
            style={{
              fontWeight: 700,
              color: subtopicResult.isComplete ? "#059669" : "var(--accent)",
            }}
          >
            {Math.round(subtopicResult.newMastery * 100)}%
          </span>
          <span
            style={{
              color:
                subtopicResult.trend === "improving" ? "#059669" : "#DC2626",
              marginLeft: "4px",
            }}
          >
            · {subtopicResult.trend}
          </span>
        </div>
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            gap: "4px",
            fontSize: "11px",
            color: "var(--muted)",
          }}
        >
          <span>Chapter mastery:</span>
          <span style={{ fontWeight: 600, color: "var(--dark)" }}>
            {Math.round(subtopicResult.chapterMastery * 100)}%
          </span>
        </div>
      </div>

      {/* Knowledge gaps */}
      {result.knowledgeGaps.length > 0 && (
        <div
          style={{
            background: "#FFFBEB",
            borderRadius: "10px",
            padding: "12px",
            border: "1px solid #FDE68A",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginBottom: "8px",
            }}
          >
            <AlertTriangle size={13} color="#D97706" strokeWidth={2} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#D97706",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Prerequisite Gaps
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {result.knowledgeGaps.map((gap) => (
              <div
                key={gap.topicId}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#92400E",
                    fontWeight: 500,
                  }}
                >
                  {gap.topicName}
                </span>
                <span style={{ fontSize: "11px", color: "#D97706" }}>
                  {Math.round(gap.mastery * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Next subtopic — only if just completed and next exists */}
        {subtopicResult.justCompleted && onNextSubtopic && (
          <button
            onClick={onNextSubtopic}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: "#059669",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              boxShadow: "0 2px 10px rgba(5,150,105,0.3)",
            }}
          >
            Next Subtopic
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        )}

        {/* Retry — only if not complete */}
        {!subtopicResult.isComplete && (
          <button
            onClick={onRetry}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              boxShadow: "0 2px 10px rgba(232,68,106,0.3)",
            }}
          >
            <RotateCcw size={13} strokeWidth={2} />
            Try Again
          </button>
        )}

        {/* Back to chapter — always shown */}
        <button
          onClick={onBackToChapter}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            padding: "11px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--muted)",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
          }}
        >
          <ChevronLeft size={13} strokeWidth={2} />
          Back to Chapter
        </button>
      </div>
    </div>
  );
}
