import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useStudentStore } from "../store/student.store";
import { graphApi } from "../lib/api";
import type { StudentGraph, GraphNode } from "../lib/api";
import ForceGraph2D from "react-force-graph-2d";
import {
  Brain,
  TrendingUp,
  BookOpen,
  Target,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";
import { redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/graph")({
  beforeLoad: () => {
    const student = useStudentStore.getState().student;
    if (!student) {
      throw redirect({ to: "/" });
    }
  },
  component: GraphPage,
});

// ─── Color helpers ────────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  not_started: "#94A3B8",
  struggling: "#EF4444",
  developing: "#F97316",
  proficient: "#EAB308",
  mastered: "#059669",
};

const NODE_COLORS_LIGHT: Record<string, string> = {
  not_started: "#F1F5F9",
  struggling: "#FEF2F2",
  developing: "#FFF7ED",
  proficient: "#FEFCE8",
  mastered: "#ECFDF5",
};

const MASTERY_LABELS: Record<string, string> = {
  not_started: "Not Started",
  struggling: "Struggling",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};

const getMasteryColor = (level: string) => NODE_COLORS[level] ?? "#94A3B8";
const getNodeSize = (mastery: number) => 4 + mastery * 8;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color = "text-[#4F46E5]",
  bg = "bg-[#EEF2FF]",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3">
      <div
        className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}
      >
        <div className={color}>{icon}</div>
      </div>
      <div>
        <div className="text-lg font-bold text-[#0F172A] leading-none">
          {value}
        </div>
        <div className="text-xs text-[#64748B] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function GraphPage() {
  const student = useStudentStore((s) => s.student);
  const navigate = useNavigate();
  const graphRef = useRef<any>(null);

  const [graph, setGraph] = useState<StudentGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!student) navigate({ to: "/" });
  }, [student, navigate]);

  // Measure container dimensions
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    try {
      const [graphData, recs] = await Promise.all([
        graphApi.getStudentGraph(student.id),
        graphApi.getRecommendations(student.id, "Science"),
      ]);
      setGraph(graphData);
      setRecommendations(recs);
    } catch {
      console.error("Failed to fetch graph");
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Transform data for react-force-graph
  const graphData = graph
    ? {
        nodes: graph.nodes.map((n) => ({
          ...n,
          // react-force-graph needs id at top level
          label: n.name,
          color: getMasteryColor(n.masteryLevel),
          size: getNodeSize(n.mastery),
        })),
        links: graph.edges.map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type,
          color: e.type === "REQUIRES" ? "#CBD5E1" : "#E2E8F0",
        })),
      }
    : { nodes: [], links: [] };

  // Handle node click
  const handleNodeClick = useCallback(
    (node: any) => {
      // node from force-graph has the original data spread onto it
      // so node.id directly matches our GraphNode id
      const fullNode = graph?.nodes.find((n) => n.id === node.id);
      if (fullNode) {
        setSelectedNode(fullNode);
      } else {
        // fallback — use node data directly
        setSelectedNode(node as GraphNode);
      }
    },
    [graph],
  );

  // Custom node canvas renderer
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      const size = node.size ?? 6;
      const color = node.color ?? "#94A3B8";
      const isSelected = selectedNode?.id === node.id;

      // Outer glow for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
        ctx.fillStyle = color + "33";
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // White border
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? "#0F172A" : "rgba(255,255,255,0.6)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Label for attempted nodes only
      if (node.attempts > 0 || isSelected) {
        const label =
          node.name.length > 20
            ? node.name.substring(0, 18) + "..."
            : node.name;
        ctx.font = `${isSelected ? "bold " : ""}9px Inter, sans-serif`;
        ctx.fillStyle = "#0F172A";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, node.x, node.y + size + 8);
      }
    },
    [selectedNode],
  );

  if (!student) return null;

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* ── Left: Force Graph ──────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-[7] relative bg-[#F8FAFC] overflow-hidden"
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-[#4F46E5] animate-pulse" />
              </div>
              <p className="text-sm font-medium text-[#0F172A]">
                Loading your knowledge graph...
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                Fetching {student.name}'s learning data
              </p>
            </div>
          </div>
        ) : (
          <>
            {dimensions.width > 0 && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                nodeCanvasObject={paintNode}
                nodeCanvasObjectMode={() => "replace"}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                  const size = node.size ?? 6;
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
                  ctx.fill();
                }}
                linkColor={(link: any) => link.color}
                linkWidth={(link: any) =>
                  link.type === "REQUIRES" ? 1.5 : 0.8
                }
                linkDirectionalArrowLength={(link: any) =>
                  link.type === "REQUIRES" ? 4 : 0
                }
                linkDirectionalArrowRelPos={1}
                onNodeClick={handleNodeClick}
                backgroundColor="#F8FAFC"
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                nodeLabel=""
              />
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-xl border border-[#E2E8F0] p-3 shadow-sm">
              <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                Mastery Level
              </div>
              <div className="space-y-1.5">
                {Object.entries(NODE_COLORS).map(([level, color]) => (
                  <div key={level} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-[#0F172A]">
                      {MASTERY_LABELS[level]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#E2E8F0] mt-2 pt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-px bg-[#CBD5E1]" />
                  <span className="text-xs text-[#64748B]">Requires</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-px bg-[#E2E8F0] border-dashed border-t" />
                  <span className="text-xs text-[#64748B]">Related to</span>
                </div>
              </div>
            </div>

            {/* Click hint */}
            {!selectedNode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-[#E2E8F0] shadow-sm">
                <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  Click any node to see topic details
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Right: Stats Sidebar ───────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-l border-[#E2E8F0] bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0F172A] capitalize">
                {student.name}'s Graph
              </h2>
              <p className="text-xs text-[#64748B]">Science · Class 6–10</p>
            </div>
            <button
              onClick={fetchGraph}
              className="p-2 rounded-lg hover:bg-[#F1F5F9] transition-colors text-[#64748B]"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Stats grid */}
          {graph && (
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Total Topics"
                value={graph.stats.totalTopics}
                icon={<BookOpen className="w-4 h-4" />}
                color="text-[#4F46E5]"
                bg="bg-[#EEF2FF]"
              />
              <StatCard
                label="Attempted"
                value={graph.stats.attempted}
                icon={<Target className="w-4 h-4" />}
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <StatCard
                label="Mastered"
                value={graph.stats.mastered}
                icon={<TrendingUp className="w-4 h-4" />}
                color="text-emerald-600"
                bg="bg-emerald-50"
              />
              <StatCard
                label="Avg Mastery"
                value={`${Math.round(graph.stats.averageMastery * 100)}%`}
                icon={<Brain className="w-4 h-4" />}
                color="text-orange-600"
                bg="bg-orange-50"
              />
            </div>
          )}

          {/* Selected node details */}
          {selectedNode && (
            <div>
              <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                Selected Topic
              </div>
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor:
                    getMasteryColor(selectedNode.masteryLevel) + "66",
                  backgroundColor: NODE_COLORS_LIGHT[selectedNode.masteryLevel],
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold text-[#0F172A] leading-snug">
                    {selectedNode.name}
                  </h3>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 text-white"
                    style={{
                      backgroundColor: getMasteryColor(
                        selectedNode.masteryLevel,
                      ),
                    }}
                  >
                    {MASTERY_LABELS[selectedNode.masteryLevel]}
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Mastery bar */}
                  <div>
                    <div className="flex justify-between text-xs text-[#64748B] mb-1">
                      <span>Mastery</span>
                      <span>{Math.round(selectedNode.mastery * 100)}%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 border border-[#E2E8F0]">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${selectedNode.mastery * 100}%`,
                          backgroundColor: getMasteryColor(
                            selectedNode.masteryLevel,
                          ),
                        }}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white rounded-lg p-2 border border-[#E2E8F0]">
                      <div className="text-xs text-[#64748B]">Attempts</div>
                      <div className="text-sm font-bold text-[#0F172A]">
                        {selectedNode.attempts}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-[#E2E8F0]">
                      <div className="text-xs text-[#64748B]">Class</div>
                      <div className="text-sm font-bold text-[#0F172A]">
                        {selectedNode.classLevel}
                      </div>
                    </div>
                  </div>

                  {selectedNode.trend && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <TrendingUp className="w-3 h-3 text-[#64748B]" />
                      <span className="text-[#64748B]">Trend:</span>
                      <span
                        className={`font-semibold ${
                          selectedNode.trend === "improving"
                            ? "text-emerald-600"
                            : selectedNode.trend === "declining"
                              ? "text-red-500"
                              : "text-[#64748B]"
                        }`}
                      >
                        {selectedNode.trend}
                      </span>
                    </div>
                  )}

                  {selectedNode.lastAttempted && (
                    <div className="text-xs text-[#94A3B8]">
                      Last attempted:{" "}
                      {new Date(selectedNode.lastAttempted).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Study Next
                </span>
              </div>
              <div className="space-y-2">
                {recommendations.map((rec: any) => (
                  <div
                    key={rec.id}
                    className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A] truncate">
                        {rec.name}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Class {rec.classLevel}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0"
                      style={{
                        color: getMasteryColor(rec.masteryLevel),
                        backgroundColor:
                          getMasteryColor(rec.masteryLevel) + "20",
                      }}
                    >
                      {MASTERY_LABELS[rec.masteryLevel]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mastery breakdown */}
          {graph && (
            <div>
              <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                Mastery Breakdown
              </div>
              <div className="space-y-2">
                {Object.entries(NODE_COLORS).map(([level, color]) => {
                  const count = graph.nodes.filter(
                    (n) => n.masteryLevel === level,
                  ).length;
                  const pct = Math.round(
                    (count / graph.stats.totalTopics) * 100,
                  );
                  return (
                    <div key={level}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#0F172A] font-medium">
                          {MASTERY_LABELS[level]}
                        </span>
                        <span className="text-[#64748B]">{count}</span>
                      </div>
                      <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
