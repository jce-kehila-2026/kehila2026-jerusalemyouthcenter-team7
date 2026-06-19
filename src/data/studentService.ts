import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
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
    try {
      const snap = await getDocs(
        query(collection(db, "groups"), orderBy("year_id")),
      );
      if (snap.size > 0) {
        return snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Group, "id">),
        }));
      }
    } catch (e) {
      console.warn("getGroups Firestore error:", e);
    }
    return [
      { id: "Year 1", name: "Year 1", year_id: 1, program_id: 1 },
      { id: "Year 2", name: "Year 2", year_id: 2, program_id: 2 },
      { id: "Year 3", name: "Year 3", year_id: 3, program_id: 3 },
    ];
  },

  // Update a student's group assignment
  async updateStudentGroup(studentId: string, newGroupId: string) {
    const studentRef = doc(db, "users", studentId);

    // Extract year number from group id like "Year 4" → 4
    const match = newGroupId.match(/\d+/);
    const newYearId = match ? parseInt(match[0], 10) : undefined;

    const updateData: { group_id: string; year_id?: number } = {
      group_id: newGroupId,
    };
    if (newYearId !== undefined) {
      updateData.year_id = newYearId;
    }

    return await updateDoc(studentRef, updateData);
  },

  // Add a new year group to Firestore
  async addGroup(name: string, yearId: number): Promise<void> {
    await setDoc(doc(db, "groups", name), {
      name,
      year_id: yearId,
      program_id: yearId, // Assuming program_id is the same as year_id for simplicity
    });
  },

  // Delete a year group from Firestore

  async deleteGroup(groupId: string): Promise<void> {
    await deleteDoc(doc(db, "groups", groupId));
  },
};
