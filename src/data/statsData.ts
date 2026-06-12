export type StatStudent = {
  id: string;
  name: string;
  gender: 'male' | 'female';
  groupId: string;
  yearJoined: number;
};

export type StatGroup = {
  id: string;
  name: string;
  color: string;
};

export type MonthlyAttendanceEntry = {
  year: number;
  groupId: string; // 'all' | 'g1' | 'g2' | 'g3' | 'g4'
  rates: number[]; // length 12, index 0 = Jan; 0 means no data yet
};

export const STAT_YEARS = [2023, 2024, 2025, 2026] as const;

export const STAT_GROUPS: StatGroup[] = [
  { id: 'g1', name: 'Year 1', color: '#0a7ea4' },
  { id: 'g2', name: 'Year 2', color: '#FF6B35' },
  { id: 'g3', name: 'Year 3', color: '#28a745' },
  { id: 'g4', name: 'Alumni', color: '#6f42c1' },
];

export const STAT_STUDENTS: StatStudent[] = [
  // Group 1 — Year 1 (2024 cohort): 12 students, 7F 5M
  { id: 's01', name: 'Amal Nasser', gender: 'female', groupId: 'g1', yearJoined: 2024 },
  { id: 's02', name: 'Talia Cohen', gender: 'female', groupId: 'g1', yearJoined: 2024 },
  { id: 's03', name: 'Layan Khalil', gender: 'female', groupId: 'g1', yearJoined: 2024 },
  { id: 's04', name: 'Maya Goldberg', gender: 'female', groupId: 'g1', yearJoined: 2024 },
  { id: 's05', name: 'Rana Haddad', gender: 'female', groupId: 'g1', yearJoined: 2024 },
  { id: 's06', name: 'Noa Shapiro', gender: 'female', groupId: 'g1', yearJoined: 2024 },
  { id: 's07', name: 'Dana Levy', gender: 'female', groupId: 'g1', yearJoined: 2024 },
  { id: 's08', name: 'Yousef Said', gender: 'male', groupId: 'g1', yearJoined: 2024 },
  { id: 's09', name: 'Daniel Ben-David', gender: 'male', groupId: 'g1', yearJoined: 2024 },
  { id: 's10', name: 'Omar Faraj', gender: 'male', groupId: 'g1', yearJoined: 2024 },
  { id: 's11', name: 'Eitan Katz', gender: 'male', groupId: 'g1', yearJoined: 2024 },
  { id: 's12', name: 'Malik Ibrahim', gender: 'male', groupId: 'g1', yearJoined: 2024 },

  // Group 2 — Year 2 (2023 cohort): 10 students, 6F 4M
  { id: 's13', name: 'Salam Abu-Rahma', gender: 'female', groupId: 'g2', yearJoined: 2023 },
  { id: 's14', name: 'Hila Mizrahi', gender: 'female', groupId: 'g2', yearJoined: 2023 },
  { id: 's15', name: 'Ranya Barakat', gender: 'female', groupId: 'g2', yearJoined: 2023 },
  { id: 's16', name: 'Shira Peretz', gender: 'female', groupId: 'g2', yearJoined: 2023 },
  { id: 's17', name: 'Dina Mansour', gender: 'female', groupId: 'g2', yearJoined: 2023 },
  { id: 's18', name: 'Linoy Friedman', gender: 'female', groupId: 'g2', yearJoined: 2023 },
  { id: 's19', name: 'Karim Samara', gender: 'male', groupId: 'g2', yearJoined: 2023 },
  { id: 's20', name: 'Roee Steinberg', gender: 'male', groupId: 'g2', yearJoined: 2023 },
  { id: 's21', name: 'Amer Awad', gender: 'male', groupId: 'g2', yearJoined: 2023 },
  { id: 's22', name: 'Guy Ashkenazi', gender: 'male', groupId: 'g2', yearJoined: 2023 },

  // Group 3 — Year 3 (2022 cohort): 8 students, 4F 4M
  { id: 's23', name: 'Inas Jabali', gender: 'female', groupId: 'g3', yearJoined: 2022 },
  { id: 's24', name: 'Maayan Weiss', gender: 'female', groupId: 'g3', yearJoined: 2022 },
  { id: 's25', name: 'Mais Qasim', gender: 'female', groupId: 'g3', yearJoined: 2022 },
  { id: 's26', name: 'Tamar Ohayon', gender: 'female', groupId: 'g3', yearJoined: 2022 },
  { id: 's27', name: 'Ibrahim Shehada', gender: 'male', groupId: 'g3', yearJoined: 2022 },
  { id: 's28', name: 'Ori Ben-Moshe', gender: 'male', groupId: 'g3', yearJoined: 2022 },
  { id: 's29', name: 'Rami Zakaria', gender: 'male', groupId: 'g3', yearJoined: 2022 },
  { id: 's30', name: 'Nadav Eldar', gender: 'male', groupId: 'g3', yearJoined: 2022 },

  // Group 4 — Alumni (2021 cohort): 6 students, 3F 3M
  { id: 's31', name: 'Samira Taha', gender: 'female', groupId: 'g4', yearJoined: 2021 },
  { id: 's32', name: 'Yulia Borenstein', gender: 'female', groupId: 'g4', yearJoined: 2021 },
  { id: 's33', name: 'Nadia Srour', gender: 'female', groupId: 'g4', yearJoined: 2021 },
  { id: 's34', name: 'Ahmad Suleiman', gender: 'male', groupId: 'g4', yearJoined: 2021 },
  { id: 's35', name: 'Ben Rotenberg', gender: 'male', groupId: 'g4', yearJoined: 2021 },
  { id: 's36', name: 'Ziyad Masri', gender: 'male', groupId: 'g4', yearJoined: 2021 },
];

// Monthly attendance rates (%) per year + group. Seasonal pattern: peaks spring/fall, dip summer.
export const MONTHLY_ATTENDANCE: MonthlyAttendanceEntry[] = [
  // ── 2023 ──────────────────────────────────────────────────────────────────
  { year: 2023, groupId: 'all', rates: [67, 71, 82, 86, 84, 63, 50, 47, 78, 84, 80, 67] },
  { year: 2023, groupId: 'g1',  rates: [64, 68, 79, 83, 81, 60, 47, 44, 75, 81, 77, 64] },
  { year: 2023, groupId: 'g2',  rates: [70, 74, 85, 89, 87, 66, 53, 50, 81, 87, 83, 70] },
  { year: 2023, groupId: 'g3',  rates: [72, 76, 87, 91, 89, 68, 55, 52, 83, 89, 85, 72] },
  { year: 2023, groupId: 'g4',  rates: [58, 62, 73, 77, 75, 54, 41, 38, 69, 75, 71, 58] },

  // ── 2024 ──────────────────────────────────────────────────────────────────
  { year: 2024, groupId: 'all', rates: [70, 74, 84, 88, 86, 66, 54, 50, 80, 86, 82, 70] },
  { year: 2024, groupId: 'g1',  rates: [68, 72, 82, 86, 84, 64, 52, 48, 78, 84, 80, 68] },
  { year: 2024, groupId: 'g2',  rates: [73, 77, 87, 91, 89, 69, 57, 53, 83, 89, 85, 73] },
  { year: 2024, groupId: 'g3',  rates: [74, 78, 88, 92, 90, 70, 58, 54, 84, 90, 86, 74] },
  { year: 2024, groupId: 'g4',  rates: [61, 65, 75, 79, 77, 57, 44, 40, 71, 77, 73, 61] },

  // ── 2025 ──────────────────────────────────────────────────────────────────
  { year: 2025, groupId: 'all', rates: [73, 76, 85, 88, 86, 68, 56, 52, 81, 87, 83, 71] },
  { year: 2025, groupId: 'g1',  rates: [71, 74, 83, 86, 84, 66, 54, 50, 79, 85, 81, 69] },
  { year: 2025, groupId: 'g2',  rates: [76, 79, 88, 91, 89, 71, 59, 55, 84, 90, 86, 74] },
  { year: 2025, groupId: 'g3',  rates: [77, 80, 89, 92, 90, 72, 60, 56, 85, 91, 87, 75] },
  { year: 2025, groupId: 'g4',  rates: [63, 66, 75, 78, 76, 58, 46, 42, 71, 77, 73, 61] },

  // ── 2026 (Jan–May recorded so far) ────────────────────────────────────────
  { year: 2026, groupId: 'all', rates: [74, 78, 87, 91, 89, 0, 0, 0, 0, 0, 0, 0] },
  { year: 2026, groupId: 'g1',  rates: [72, 76, 85, 89, 87, 0, 0, 0, 0, 0, 0, 0] },
  { year: 2026, groupId: 'g2',  rates: [77, 81, 90, 94, 92, 0, 0, 0, 0, 0, 0, 0] },
  { year: 2026, groupId: 'g3',  rates: [78, 82, 91, 95, 93, 0, 0, 0, 0, 0, 0, 0] },
  { year: 2026, groupId: 'g4',  rates: [64, 68, 77, 81, 79, 0, 0, 0, 0, 0, 0, 0] },
];

// Cumulative program totals per year
export const YEARLY_TOTALS: Record<number, { students: number; hours: number }> = {
  2023: { students: 18, hours: 864 },
  2024: { students: 24, hours: 1152 },
  2025: { students: 30, hours: 1560 },
  2026: { students: 36, hours: 720 }, // mid-year
};

// Rehearsal/session count per month (index 0 = Jan). 0 = not yet recorded.
export const SESSIONS_PER_MONTH: Record<number, number[]> = {
  2023: [6, 7, 9, 11, 10, 7, 4, 3, 8, 11, 10, 6],
  2024: [7, 8, 11, 13, 12, 8, 5, 4, 10, 13, 11, 7],
  2025: [8, 9, 12, 14, 13, 9, 5, 4, 11, 15, 12, 8],
  2026: [9, 10, 13, 15, 14, 0, 0, 0, 0, 0, 0, 0],
};
