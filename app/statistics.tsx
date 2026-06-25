import { COLORS } from "@/src/data/mockData";
import {
  MONTHLY_ATTENDANCE,
  SESSIONS_PER_MONTH,
  STAT_GROUPS,
  STAT_STUDENTS,
  STAT_YEARS,
  YEARLY_TOTALS,
} from "@/src/data/statsData";
import {
  type FormMeta,
  type FormQuestionResult,
  type FormResult,
  getAttendanceStats,
  getFormResults,
  getForms,
  getProgramStudents,
} from "@/src/data/statsService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

// ── Constants ──────────────────────────────────────────────────────────────────
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Original chart palette (preserved from pre-brand version)
const F_COLOR = "#ec4899"; // pink  — female
const M_COLOR = "#3b82f6"; // blue  — male
const C_TEAL = "#0a7ea4"; // chart line / YoY bars
const C_ORA = "#FF6B35"; // sessions bars (orange)

// ── SVG helpers ────────────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const sweep = Math.min(endDeg - startDeg, 359.99);
  const end = startDeg + sweep;
  const large = sweep > 180 ? 1 : 0;
  const o1 = polar(cx, cy, outerR, startDeg);
  const o2 = polar(cx, cy, outerR, end);
  const i1 = polar(cx, cy, innerR, end);
  const i2 = polar(cx, cy, innerR, startDeg);
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y} Z`;
}

// ── Chart: Area / Line trend ───────────────────────────────────────────────────
function AreaTrendChart({
  values,
  labels,
  color,
  chartWidth,
}: {
  values: number[];
  labels: string[];
  color: string;
  chartWidth: number;
}) {
  const H = 175;
  const PL = 30,
    PR = 8,
    PT = 10,
    PB = 32;
  const PW = chartWidth - PL - PR;
  const PH = H - PT - PB;

  if (values.length < 2) {
    return (
      <View
        style={{ height: H, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: COLORS.muted, fontSize: 13 }}>
          Not enough data
        </Text>
      </View>
    );
  }

  const pts = values.map((v, i) => ({
    x: PL + (i / (values.length - 1)) * PW,
    y: PT + PH - (v / 100) * PH,
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${PT + PH} L ${pts[0].x} ${PT + PH} Z`;

  return (
    <Svg width={chartWidth} height={H}>
      <Defs>
        <LinearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = PT + PH - (v / 100) * PH;
        return (
          <G key={v}>
            <Line
              x1={PL}
              y1={y}
              x2={chartWidth - PR}
              y2={y}
              stroke={COLORS.border}
              strokeWidth="1"
            />
            <SvgText
              x={PL - 4}
              y={y + 4}
              fontSize="9"
              fill={COLORS.muted}
              textAnchor="end"
            >
              {v}
            </SvgText>
          </G>
        );
      })}

      <Path d={areaPath} fill="url(#aG)" />
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {pts.map((p, i) => (
        <G key={i}>
          <Circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill={COLORS.card}
            stroke={color}
            strokeWidth="2"
          />
          <SvgText
            x={p.x}
            y={H - 6}
            fontSize="9"
            fill={COLORS.muted}
            textAnchor="middle"
          >
            {labels[i]}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ── Chart: Vertical bar ────────────────────────────────────────────────────────
function BarChart({
  values,
  labels,
  color,
  accentMax = false,
  accentColor,
  chartWidth,
  chartHeight = 140,
}: {
  values: number[];
  labels: string[];
  color: string;
  accentMax?: boolean;
  accentColor?: string;
  chartWidth: number;
  chartHeight?: number;
}) {
  const PL = 26,
    PR = 6,
    PT = 10,
    PB = 26;
  const PW = chartWidth - PL - PR;
  const PH = chartHeight - PT - PB;
  const n = values.length;
  const maxV = Math.max(...values, 1);
  const step = PW / n;
  const barW = Math.max(step * 0.56, 4);
  const maxIdx = values.indexOf(Math.max(...values));

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {[0, 50, 100].map((pct) => {
        const y = PT + PH - (pct / 100) * PH;
        const v = Math.round((pct / 100) * maxV);
        return (
          <G key={pct}>
            <Line
              x1={PL}
              y1={y}
              x2={chartWidth - PR}
              y2={y}
              stroke={COLORS.border}
              strokeWidth="1"
            />
            <SvgText
              x={PL - 3}
              y={y + 4}
              fontSize="8"
              fill={COLORS.muted}
              textAnchor="end"
            >
              {v}
            </SvgText>
          </G>
        );
      })}
      {values.map((v, i) => {
        const barH = Math.max((v / maxV) * PH, 1);
        const x = PL + i * step + (step - barW) / 2;
        const y = PT + PH - barH;
        const c = accentMax && i === maxIdx ? (accentColor ?? C_TEAL) : color;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx="3" fill={c} />
            {barH > 14 && (
              <SvgText
                x={x + barW / 2}
                y={y - 3}
                fontSize="8"
                fill={COLORS.sub}
                textAnchor="middle"
              >
                {v}
              </SvgText>
            )}
            {(n <= 7 || i % 2 === 0) && (
              <SvgText
                x={x + barW / 2}
                y={chartHeight - 4}
                fontSize="8"
                fill={COLORS.muted}
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ── Chart: Donut ───────────────────────────────────────────────────────────────
function DonutChart({
  female,
  male,
  size = 120,
}: {
  female: number;
  male: number;
  size?: number;
}) {
  const total = female + male;
  if (total === 0) return null;
  const cx = size / 2,
    cy = size / 2;
  const outerR = size / 2 - 6,
    innerR = outerR * 0.6;
  const fDeg = (female / total) * 360;
  return (
    <Svg width={size} height={size}>
      <Path d={donutArc(cx, cy, outerR, innerR, 0, fDeg)} fill={F_COLOR} />
      <Path d={donutArc(cx, cy, outerR, innerR, fDeg, 360)} fill={M_COLOR} />
      <SvgText
        x={cx}
        y={cy - 4}
        fontSize="17"
        fontWeight="bold"
        fill={COLORS.text}
        textAnchor="middle"
      >
        {Math.round((female / total) * 100)}%
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 13}
        fontSize="10"
        fill={COLORS.muted}
        textAnchor="middle"
      >
        Female
      </SvgText>
    </Svg>
  );
}

// ── Chart: Form question result ────────────────────────────────────────────────
function FormQuestionChart({
  result,
  chartWidth,
}: {
  result: FormQuestionResult;
  chartWidth: number;
}) {
  const { answerType, counts, totalResponses } = result;

  if (answerType === "text") {
    return (
      <View style={{ alignItems: "center", paddingVertical: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: COLORS.text }}>
          {totalResponses}
        </Text>
        <Text style={{ fontSize: 11, color: COLORS.muted }}>
          text responses
        </Text>
      </View>
    );
  }

  const entries =
    answerType === "range"
      ? Object.entries(counts).sort((a, b) => Number(a[0]) - Number(b[0]))
      : Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <Text
        style={{
          color: COLORS.muted,
          fontSize: 12,
          textAlign: "center",
          paddingVertical: 8,
        }}
      >
        No responses yet
      </Text>
    );
  }

  const truncate = (s: string) => (s.length > 10 ? s.slice(0, 9) + "…" : s);
  const labels = entries.map(([k]) => truncate(k));
  const values = entries.map(([, v]) => v);
  const barColor = answerType === "yes_no" ? C_TEAL : C_ORA;

  return (
    <BarChart
      values={values}
      labels={labels}
      color={barColor}
      accentMax
      accentColor={COLORS.teal}
      chartWidth={chartWidth}
      chartHeight={130}
    />
  );
}

// ── Brand Card ─────────────────────────────────────────────────────────────────
function BrandCard({
  barColor = COLORS.teal,
  title,
  children,
  style,
}: {
  barColor?: string;
  title?: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[bc.shadow, style]}>
      <View style={bc.outer}>
        <View style={[bc.bar, { backgroundColor: barColor }]} />
        <View style={bc.pad}>
          {title ? <Text style={bc.title}>{title.toUpperCase()}</Text> : null}
          {children}
        </View>
      </View>
    </View>
  );
}
const bc = StyleSheet.create({
  shadow: {
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    borderRadius: 16,
  },
  outer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  bar: { height: 4 },
  pad: { padding: 16 },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 12,
  },
});

// ── KPI card (no inner title) ──────────────────────────────────────────────────
function KpiCard({
  icon,
  accent,
  label,
  main,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  accent: string;
  label: string;
  main: string;
  sub?: string;
}) {
  return (
    <View style={[kp.shadow, { flex: 1 }]}>
      <View style={kp.outer}>
        <View style={[kp.bar, { backgroundColor: accent }]} />
        <View style={kp.pad}>
          <View style={[kp.icon, { backgroundColor: accent + "22" }]}>
            <Ionicons name={icon} size={17} color={accent} />
          </View>
          <Text style={kp.label}>{label}</Text>
          <Text style={kp.main}>{main}</Text>
          {sub ? <Text style={kp.sub}>{sub}</Text> : null}
        </View>
      </View>
    </View>
  );
}
const kp = StyleSheet.create({
  shadow: {
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderRadius: 16,
  },
  outer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  bar: { height: 4 },
  pad: { padding: 16 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 4,
  },
  main: { fontSize: 22, fontWeight: "900", color: COLORS.text },
  sub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
});

// ── Filter chips ───────────────────────────────────────────────────────────────
function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[fc.chip, opt.value === value && fc.active]}
        >
          <Text style={[fc.text, opt.value === value && fc.textActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const fc = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: "#edf2f5",
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  active: { backgroundColor: COLORS.teal + "15", borderColor: COLORS.teal },
  text: { fontSize: 13, color: COLORS.muted, fontWeight: "600" },
  textActive: { color: COLORS.teal, fontWeight: "700" },
});

// ── Filter types ───────────────────────────────────────────────────────────────
type YearFilter = "all" | "2023" | "2024" | "2025" | "2026";
type GroupFilter = "all" | "g1" | "g2" | "g3" | "g4";

const YEAR_OPTS: { value: YearFilter; label: string }[] = [
  { value: "all", label: "All Years" },
  { value: "2023", label: "2023" },
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
];
const GROUP_OPTS: { value: GroupFilter; label: string }[] = [
  { value: "all", label: "All Groups" },
  ...STAT_GROUPS.map((g) => ({ value: g.id as GroupFilter, label: g.name })),
];

// ── Main screen ────────────────────────────────────────────────────────────────
export default function StatisticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [selYear, setSelYear] = useState<YearFilter>("2026");
  const [selGroup, setSelGroup] = useState<GroupFilter>("all");

  // ── Real-data state (initialised to mock so charts never render blank) ─────
  const [loading, setLoading] = useState(true);
  const [monthlyAttendance, setMonthlyAttendance] =
    useState(MONTHLY_ATTENDANCE);
  const [yearlyTotals, setYearlyTotals] = useState(YEARLY_TOTALS);
  const [sessionsPerMonth, setSessionsPerMonth] = useState(SESSIONS_PER_MONTH);
  const [statStudents, setStatStudents] = useState(STAT_STUDENTS);
  const [forms, setForms] = useState<FormMeta[]>([]);
  const [selFormId, setSelFormId] = useState<string>("");
  const [formResult, setFormResult] = useState<FormResult | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Load Firestore data on mount ──────────────────────────────────────────
  useEffect(() => {
    Promise.all([getAttendanceStats(), getProgramStudents(), getForms()])
      .then(([att, students, formList]) => {
        setMonthlyAttendance(att.monthlyAttendance);
        setYearlyTotals(att.yearlyTotals);
        setSessionsPerMonth(att.sessionsPerMonth);
        setStatStudents(students);
        setForms(formList);
        if (formList.length > 0) setSelFormId(formList[0].id);
      })
      .catch((e) => console.error("[stats] load error:", e))
      .finally(() => setLoading(false));
  }, []);

  // ── Load form results when selected form changes ──────────────────────────
  useEffect(() => {
    if (!selFormId) return;
    setFormLoading(true);
    setFormResult(null);
    getFormResults(selFormId)
      .then(setFormResult)
      .catch((e) => console.error("[stats] form results:", e))
      .finally(() => setFormLoading(false));
  }, [selFormId]);

  const fullW = width - 32;
  const halfW = (width - 40) / 2;

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (selGroup === "all") return statStudents;
    return statStudents.filter((s) => s.groupId === selGroup);
  }, [selGroup, statStudents]);

  const genderData = useMemo(() => {
    const f = filteredStudents.filter((s) => s.gender === "female").length;
    const m = filteredStudents.filter((s) => s.gender === "male").length;
    return { female: f, male: m, total: f + m };
  }, [filteredStudents]);

  const groupGenderData = useMemo(
    () =>
      STAT_GROUPS.map((g) => {
        const gs = statStudents.filter((s) => s.groupId === g.id);
        return {
          ...g,
          female: gs.filter((s) => s.gender === "female").length,
          male: gs.filter((s) => s.gender === "male").length,
          total: gs.length,
        };
      }),
    [statStudents],
  );

  const { trendValues, trendLabels } = useMemo(() => {
    const gKey = selGroup === "all" ? "all" : selGroup;
    if (selYear === "all") {
      const vals = Array.from(STAT_YEARS).map((y) => {
        const e = monthlyAttendance.find(
          (m) => m.year === y && m.groupId === gKey,
        );
        if (!e) return 0;
        const active = e.rates.filter((r) => r > 0);
        return active.length
          ? Math.round(active.reduce((a, b) => a + b, 0) / active.length)
          : 0;
      });
      return {
        trendValues: vals,
        trendLabels: Array.from(STAT_YEARS).map(String),
      };
    }
    const y = parseInt(selYear, 10);
    const e = monthlyAttendance.find(
      (m) => m.year === y && m.groupId === gKey,
    );
    const rates = e ? e.rates : new Array(12).fill(0);
    return {
      trendValues: rates.filter((r) => r > 0),
      trendLabels: MONTH_SHORT.filter((_, i) => rates[i] > 0),
    };
  }, [selYear, selGroup, monthlyAttendance]);

  const avgAttendance = useMemo(() => {
    if (!trendValues.length) return 0;
    return Math.round(
      trendValues.reduce((a, b) => a + b, 0) / trendValues.length,
    );
  }, [trendValues]);

  const yoyData = useMemo(
    () => ({
      values: Array.from(STAT_YEARS).map(
        (y) => yearlyTotals[y]?.students ?? 0,
      ),
      labels: Array.from(STAT_YEARS).map(String),
    }),
    [yearlyTotals],
  );

  const sessionData = useMemo(() => {
    const y = selYear === "all" ? 2025 : parseInt(selYear, 10);
    const raw =
      sessionsPerMonth[y] ?? sessionsPerMonth[2025] ?? new Array(12).fill(0);
    return {
      values: (raw as number[]).filter((v) => v > 0),
      labels: MONTH_SHORT.filter((_, i) => (raw as number[])[i] > 0),
    };
  }, [selYear, sessionsPerMonth]);

  const totalHours = useMemo(() => {
    if (selYear === "all")
      return Object.values(yearlyTotals).reduce((acc, v) => acc + v.hours, 0);
    return yearlyTotals[parseInt(selYear, 10)]?.hours ?? 0;
  }, [selYear, yearlyTotals]);

  const fPct =
    genderData.total > 0
      ? Math.round((genderData.female / genderData.total) * 100)
      : 0;
  const mPct = genderData.total > 0 ? 100 - fPct : 0;

  return (
    <View style={s.screen}>
      {/* ── Teal Brand Header ──────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <View>
          <Text style={s.headerSub}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.headerTitle}>Our Statistics</Text>
        </View>
      </View>

      {/* ── Sticky filter bar ─────────────────────────────────────────────── */}
      <View style={s.filterBar}>
        <FilterChips
          options={YEAR_OPTS}
          value={selYear}
          onChange={setSelYear}
        />
        <View style={{ height: 8 }} />
        <FilterChips
          options={GROUP_OPTS}
          value={selGroup}
          onChange={setSelGroup}
        />
      </View>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.teal} />
          </View>
        ) : (
          <>
            {/* KPI row A */}
            <View style={s.row}>
              <KpiCard
                icon="people"
                accent={COLORS.teal}
                label="Total Students"
                main={String(genderData.total)}
                sub={`${totalHours.toLocaleString()} mentoring hrs`}
              />
              <KpiCard
                icon="checkmark-circle"
                accent={COLORS.teal}
                label="Avg Attendance"
                main={`${avgAttendance}%`}
                sub={selYear === "all" ? "all years" : selYear}
              />
            </View>

            {/* KPI row B */}
            <View style={[s.row, { marginTop: 8 }]}>
              <KpiCard
                icon="female"
                accent={F_COLOR}
                label="Female"
                main={String(genderData.female)}
                sub={`${fPct}% of group`}
              />
              <KpiCard
                icon="male"
                accent={M_COLOR}
                label="Male"
                main={String(genderData.male)}
                sub={`${mPct}% of group`}
              />
            </View>

            {/* Attendance Trend */}
            <View style={{ marginTop: 16 }}>
              <BrandCard
                barColor={COLORS.teal}
                title={
                  selYear === "all"
                    ? "Yearly avg attendance (%)"
                    : `Monthly attendance — ${selYear} (%)`
                }
              >
                <AreaTrendChart
                  values={trendValues}
                  labels={trendLabels}
                  color={COLORS.teal}
                  chartWidth={fullW - 32}
                />
              </BrandCard>
            </View>

            {/* Demographics row */}
            <View style={[s.row, { marginTop: 8 }]}>
              <BrandCard
                barColor={COLORS.teal}
                title="Gender Split"
                style={{ width: halfW }}
              >
                <View style={{ alignItems: "center" }}>
                  <DonutChart
                    female={genderData.female}
                    male={genderData.male}
                    size={108}
                  />
                  <View style={s.legend}>
                    <View style={s.lgItem}>
                      <View style={[s.lgDot, { backgroundColor: F_COLOR }]} />
                      <Text style={s.lgTxt}>F · {genderData.female}</Text>
                    </View>
                    <View style={s.lgItem}>
                      <View style={[s.lgDot, { backgroundColor: M_COLOR }]} />
                      <Text style={s.lgTxt}>M · {genderData.male}</Text>
                    </View>
                  </View>
                </View>
              </BrandCard>

              <BrandCard
                barColor={COLORS.yellow}
                title="By Group"
                style={{ width: halfW }}
              >
                {groupGenderData.map((g) => {
                  const frac = g.total > 0 ? g.female / g.total : 0;
                  return (
                    <View key={g.id} style={{ marginBottom: 8 }}>
                      <Text style={s.gLabel}>{g.name}</Text>
                      <View style={s.gBar}>
                        <View
                          style={[
                            s.gSeg,
                            { flex: frac || 0.01, backgroundColor: F_COLOR },
                          ]}
                        />
                        <View
                          style={[
                            s.gSeg,
                            {
                              flex: 1 - frac || 0.01,
                              backgroundColor: M_COLOR,
                            },
                          ]}
                        />
                      </View>
                      <Text style={s.gSub}>
                        {g.female}F · {g.male}M
                      </Text>
                    </View>
                  );
                })}
              </BrandCard>
            </View>

            {/* Growth & Engagement row */}
            <View style={[s.row, { marginTop: 8 }]}>
              <BrandCard
                barColor={COLORS.teal}
                title="YoY Growth"
                style={{ width: halfW }}
              >
                <BarChart
                  values={yoyData.values}
                  labels={yoyData.labels}
                  color={COLORS.teal}
                  chartWidth={halfW - 32}
                  chartHeight={130}
                />
              </BrandCard>

              <BrandCard
                barColor={COLORS.yellow}
                title="Sessions / Month"
                style={{ width: halfW }}
              >
                {sessionData.values.length > 0 ? (
                  <BarChart
                    values={sessionData.values}
                    labels={sessionData.labels}
                    color={C_ORA}
                    accentMax
                    accentColor={C_TEAL}
                    chartWidth={halfW - 32}
                    chartHeight={130}
                  />
                ) : (
                  <View
                    style={{
                      height: 100,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                      No data
                    </Text>
                  </View>
                )}
              </BrandCard>
            </View>

            {/* ── Form Responses section (new) ────────────────────────────── */}
            {forms.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <BrandCard barColor={COLORS.yellow} title="Form Responses">
                  <FilterChips
                    options={forms.map((f) => ({
                      value: f.id,
                      label: f.title,
                    }))}
                    value={selFormId}
                    onChange={setSelFormId}
                  />
                  {formLoading ? (
                    <View
                      style={{
                        alignItems: "center",
                        paddingTop: 20,
                        paddingBottom: 8,
                      }}
                    >
                      <ActivityIndicator size="small" color={COLORS.teal} />
                    </View>
                  ) : formResult ? (
                    formResult.questions.map((q) => (
                      <View key={q.questionId} style={{ marginTop: 16 }}>
                        <Text style={s.qText}>{q.questionText}</Text>
                        <FormQuestionChart
                          result={q}
                          chartWidth={fullW - 64}
                        />
                      </View>
                    ))
                  ) : (
                    <Text
                      style={{
                        color: COLORS.muted,
                        fontSize: 12,
                        marginTop: 12,
                        textAlign: "center",
                      }}
                    >
                      No submissions yet for this form.
                    </Text>
                  )}
                </BrandCard>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  // Teal header
  header: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  backBtn: { padding: 4, marginBottom: 4 },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
  },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 4 },

  // Filter bar
  filterBar: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  scroll: { padding: 16 },
  row: { flexDirection: "row", gap: 8 },

  // Legend
  legend: { flexDirection: "row", gap: 12, marginTop: 8 },
  lgItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  lgDot: { width: 8, height: 8, borderRadius: 4 },
  lgTxt: { fontSize: 11, color: COLORS.sub },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
  },

  // Form question label
  qText: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "600",
    marginBottom: 4,
  },

  // Group bars
  gLabel: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 3,
  },
  gBar: {
    flexDirection: "row",
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: COLORS.border,
    marginBottom: 2,
  },
  gSeg: { height: 7 },
  gSub: { fontSize: 10, color: COLORS.muted },
});
