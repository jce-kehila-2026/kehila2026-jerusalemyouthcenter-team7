// src/data/mockData.js

export const COLORS = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  black: "#000000",
  charcoal: "#353535",
  white: "#ffffff",
  bluishWhite: "#f5fafe",
};

export const events = [
  {
    event_id: 1,
    title: "Workshop — Voice Training",
    description:
      "Weekly voice training session with all groups. Please bring your music booklet and water bottle.",
    date: "2026-05-10",
    time: "16:00",
    location: "Jerusalem Youth Center — Hall A",
    group_id: 1,
    group_name: "Year 1",
  },
  {
    event_id: 2,
    title: "Spring Concert Rehearsal",
    description:
      "Full rehearsal for the upcoming Spring Concert. All students must attend. Wear the chorus uniform.",
    date: "2026-05-14",
    time: "15:30",
    location: "Jerusalem Youth Center — Main Stage",
    group_id: null,
    group_name: "All Groups",
  },
  {
    event_id: 3,
    title: "Music Theory Class",
    description:
      "Introduction to harmony and rhythm. Bring your notebook. Materials will be provided.",
    date: "2026-05-17",
    time: "14:00",
    location: "Jerusalem Youth Center — Room 3",
    group_id: 2,
    group_name: "Year 2",
  },
  {
    event_id: 4,
    title: "Spring Concert — Public Performance",
    description:
      "Our annual Spring Concert open to families and the public. Students must arrive 1 hour early.",
    date: "2026-05-22",
    time: "19:00",
    location: "Jerusalem YMCA — Theatre",
    group_id: null,
    group_name: "All Groups",
  },
  {
    event_id: 5,
    title: "School Trip — Rehearsal Day",
    description:
      "Special rehearsal day combined with a cultural visit. Bring lunch and comfortable shoes.",
    date: "2026-05-28",
    time: "09:00",
    location: "Old City Jerusalem",
    group_id: 3,
    group_name: "Year 3",
  },
];

export const students = [
  { student_id: 1, full_name: "Rania Sh", group_id: 1, year: 1 },
  { student_id: 2, full_name: "Ahmed K", group_id: 1, year: 1 },
  { student_id: 3, full_name: "Noa L", group_id: 2, year: 2 },
  { student_id: 4, full_name: "Omar M", group_id: 3, year: 3 },
];

export const eventStudents = [
  { event_id: 1, student_id: 1 },
  { event_id: 1, student_id: 2 },
  { event_id: 2, student_id: 1 },
  { event_id: 2, student_id: 3 },
  { event_id: 2, student_id: 4 },
];

export const attendance = [];
export const forms = [];
export const messages = [];
export const notifications = [];
