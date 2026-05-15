export type User = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: "admin" | "student";
};

export type Student = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  group_id: number;
  year_id: number;
  program_id: number;
};

export type Group = {
  id: number;
  name: string;
  year_id: number;
  program_id: number;
};

export type Event = {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  group_ids: number[];
  capacity: number;
  registered: number;
};

export type EventAttendance = {
  event_id: number;
  student_id: number;
  status: "registered" | "attended" | "absent";
};

export type Question = {
  id: number;
  form_id: number;
  text: string;
  type: "text" | "multiple_choice" | "yes_no";
  options?: string[];
};

export type Form = {
  id: number;
  title: string;
  description: string;
  created_at: string;
  questions: Question[];
};

export type Message = {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  timestamp: string;
  is_read: boolean;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  timestamp: string;
  is_read: boolean;
  type: "event" | "message" | "form" | "general";
};

export const currentUser: User = {
  id: 1,
  full_name: "Admin User",
  email: "admin@kehila.org",
  phone: "+972-50-000-0001",
  role: "admin",
};

export const groups: Group[] = [
  { id: 1, name: "Alpha", year_id: 1, program_id: 1 },
  { id: 2, name: "Beta", year_id: 1, program_id: 2 },
  { id: 3, name: "Gamma", year_id: 2, program_id: 1 },
];

export const students: Student[] = [
  {
    id: 1,
    full_name: "Ali Ahmad",
    email: "ali@student.com",
    phone: "+972-50-111-0001",
    group_id: 1,
    year_id: 1,
    program_id: 1,
  },
  {
    id: 2,
    full_name: "Sara Cohen",
    email: "sara@student.com",
    phone: "+972-50-111-0002",
    group_id: 1,
    year_id: 1,
    program_id: 1,
  },
  {
    id: 3,
    full_name: "Omar Nasser",
    email: "omar@student.com",
    phone: "+972-50-111-0003",
    group_id: 2,
    year_id: 1,
    program_id: 2,
  },
  {
    id: 4,
    full_name: "Maya Levi",
    email: "maya@student.com",
    phone: "+972-50-111-0004",
    group_id: 2,
    year_id: 1,
    program_id: 2,
  },
  {
    id: 5,
    full_name: "Yusuf Khalil",
    email: "yusuf@student.com",
    phone: "+972-50-111-0005",
    group_id: 3,
    year_id: 2,
    program_id: 1,
  },
  {
    id: 6,
    full_name: "Noa Ben-David",
    email: "noa@student.com",
    phone: "+972-50-111-0006",
    group_id: 3,
    year_id: 2,
    program_id: 1,
  },
  {
    id: 7,
    full_name: "Kareem Hassan",
    email: "kareem@student.com",
    phone: "+972-50-111-0007",
    group_id: 1,
    year_id: 1,
    program_id: 1,
  },
  {
    id: 8,
    full_name: "Tamar Shapiro",
    email: "tamar@student.com",
    phone: "+972-50-111-0008",
    group_id: 2,
    year_id: 1,
    program_id: 2,
  },
];

export const events: Event[] = [
  {
    id: 1,
    title: "Community Shabbat Dinner",
    description:
      "Join us for our weekly Shabbat dinner gathering. All groups welcome. Bring family and friends for an evening of community and food.",
    date: "2026-05-09T18:00:00",
    location: "Community Center Hall",
    group_ids: [1, 2, 3],
    capacity: 100,
    registered: 42,
  },
  {
    id: 2,
    title: "Leadership Workshop",
    description:
      "An intensive workshop focused on developing leadership skills for young community members.",
    date: "2026-05-12T10:00:00",
    location: "Room 201",
    group_ids: [1, 2],
    capacity: 30,
    registered: 18,
  },
  {
    id: 3,
    title: "Jerusalem Heritage Walk",
    description:
      "Guided tour through the historic quarters of Jerusalem. Learn about the rich history of our city.",
    date: "2026-05-15T09:00:00",
    location: "Jaffa Gate Meeting Point",
    group_ids: [1, 2, 3],
    capacity: 50,
    registered: 35,
  },
  {
    id: 4,
    title: "Art & Culture Evening",
    description:
      "Showcase your talents — music, poetry, visual arts. An evening celebrating community creativity.",
    date: "2026-05-20T17:00:00",
    location: "Main Hall",
    group_ids: [3],
    capacity: 60,
    registered: 22,
  },
];

export const attendance: EventAttendance[] = [
  { event_id: 1, student_id: 1, status: "registered" },
  { event_id: 1, student_id: 2, status: "attended" },
  { event_id: 1, student_id: 3, status: "attended" },
  { event_id: 2, student_id: 4, status: "registered" },
  { event_id: 2, student_id: 5, status: "absent" },
];

export const forms: Form[] = [
  {
    id: 1,
    title: "End of Year Survey",
    description: "Share your experience with us this year.",
    created_at: "2026-04-01",
    questions: [
      {
        id: 1,
        form_id: 1,
        text: "How would you rate your overall experience?",
        type: "multiple_choice",
        options: ["Excellent", "Good", "Average", "Poor"],
      },
      {
        id: 2,
        form_id: 1,
        text: "What was your favorite activity?",
        type: "text",
      },
      {
        id: 3,
        form_id: 1,
        text: "Would you recommend the program to a friend?",
        type: "yes_no",
      },
    ],
  },
  {
    id: 2,
    title: "Event Registration: Shabbat Dinner",
    description: "Register for the upcoming Shabbat dinner.",
    created_at: "2026-04-20",
    questions: [
      {
        id: 4,
        form_id: 2,
        text: "Do you have any dietary restrictions?",
        type: "text",
      },
      { id: 5, form_id: 2, text: "Will you bring a guest?", type: "yes_no" },
    ],
  },
  {
    id: 3,
    title: "Program Feedback - Spring 2026",
    description: "Help us improve our programs.",
    created_at: "2026-04-25",
    questions: [
      {
        id: 6,
        form_id: 3,
        text: "Which sessions did you attend?",
        type: "multiple_choice",
        options: ["Leadership", "Heritage Walk", "Art Evening", "Shabbat"],
      },
      { id: 7, form_id: 3, text: "What can we improve?", type: "text" },
    ],
  },
];

export const messages: Message[] = [
  {
    id: 1,
    sender_id: 2,
    sender_name: "Sara Cohen",
    content: "Hi, I wanted to ask about the upcoming event details.",
    timestamp: "2026-05-03T09:15:00",
    is_read: false,
  },
  {
    id: 2,
    sender_id: 3,
    sender_name: "Omar Nasser",
    content: "Will the workshop include lunch?",
    timestamp: "2026-05-03T10:30:00",
    is_read: false,
  },
  {
    id: 3,
    sender_id: 5,
    sender_name: "Yusuf Khalil",
    content: "Thank you for the great session yesterday!",
    timestamp: "2026-05-02T16:00:00",
    is_read: true,
  },
  {
    id: 4,
    sender_id: 7,
    sender_name: "Kareem Hassan",
    content: "I registered for the heritage walk.",
    timestamp: "2026-05-01T12:45:00",
    is_read: true,
  },
];

export const notifications: Notification[] = [
  {
    id: 1,
    title: "New Registration",
    body: "Sara Cohen registered for Shabbat Dinner",
    timestamp: "2026-05-03T08:00:00",
    is_read: false,
    type: "event",
  },
  {
    id: 2,
    title: "Form Submitted",
    body: "Ali Ahmad submitted End of Year Survey",
    timestamp: "2026-05-02T14:30:00",
    is_read: false,
    type: "form",
  },
  {
    id: 3,
    title: "New Message",
    body: "Omar Nasser sent you a message",
    timestamp: "2026-05-02T10:30:00",
    is_read: true,
    type: "message",
  },
  {
    id: 4,
    title: "Event Reminder",
    body: "Leadership Workshop is in 2 days",
    timestamp: "2026-05-01T09:00:00",
    is_read: true,
    type: "event",
  },
];
export const COLORS = {
  teal: "#039899",
  tealLight: "#e0f5f5",
  tealDark: "#027273",
  red: "#c56451",
  redLight: "#faeae6",
  yellow: "#cfad5d",
  yellowLight: "#faf4e1",
  black: "#0a0f0f",
  white: "#ffffff",
  gray: "#687076",
  grayLight: "#f4f6f7",
  border: "#d8e0e0",
  success: "#22c55e",
};
