import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { Group, Student } from "./mockData"; // Ideally move these to a types.ts file later

/** Helper to map Firestore user data to Student UI type */
const mapToStudent = (id: string, data: any): Student => {
  return {
    ...data,
    id,
    // Ensure we map common field variations to what the UI expects
    year_id:
      data.year_id !== undefined
        ? Number(data.year_id)
        : data.year !== undefined
          ? Number(data.year)
          : null, // Default to null for consistency
    voice_type: data.voice_type
      ? String(data.voice_type).trim().toLowerCase()
      : null,
    year_joined: data.year_joined || null,
  } as Student;
};

export const studentService = {
  // Fetch all singers (students) from the unified "users" collection
  async getAllStudents(): Promise<Student[]> {
    const q = query(
      collection(db, "users"),
      where("role", "==", "singer"),
      orderBy("full_name"),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => mapToStudent(doc.id, doc.data()));
  },

  // Fetch a single student by ID
  async getStudentById(id: string): Promise<Student | null> {
    const docSnap = await getDoc(doc(db, "users", id));
    if (!docSnap.exists()) return null;

    return mapToStudent(docSnap.id, docSnap.data());
  },

  // Fetch all groups (overridden to return exactly Year 1, Year 2, Year 3)
  async getGroups(): Promise<Group[]> {
    return [
      { id: "Year 1", name: "Year 1", year_id: 1, program_id: 1 },
      { id: "Year 2", name: "Year 2", year_id: 2, program_id: 2 },
      { id: "Year 3", name: "Year 3", year_id: 3, program_id: 1 },
    ];
  },

  // Update a student's group assignment
  async updateStudentGroup(studentId: string, newGroupId: string) {
    const studentRef = doc(db, "users", studentId);

    let newYearId: number | undefined;
    if (newGroupId === "1" || newGroupId === "Year 1") newYearId = 1;
    else if (newGroupId === "2" || newGroupId === "Year 2") newYearId = 2;
    else if (newGroupId === "3" || newGroupId === "Year 3") newYearId = 3;

    const updateData: { group_id: string; year_id?: number } = {
      group_id: newGroupId,
    };
    if (newYearId !== undefined) {
      updateData.year_id = newYearId;
    }

    return await updateDoc(studentRef, updateData);
  },

  // Add a new student to Firestore
  async addStudent(studentData: Omit<Student, "id">) {
    return addDoc(collection(db, "users"), {
      ...studentData,
      role: "singer",
    });
  },
};
