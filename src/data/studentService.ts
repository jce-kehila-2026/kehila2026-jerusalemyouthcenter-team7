import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { Group, Student } from "./mockData"; // Ideally move these to a types.ts file later

export const studentService = {
  // Fetch all students from the "students" collection
  async getAllStudents(): Promise<Student[]> {
    const q = query(collection(db, "students"), orderBy("full_name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        year_id:
          data.year_id !== undefined
            ? Number(data.year_id)
            : data.year !== undefined
              ? Number(data.year)
              : null, // Default to null for consistency
        voice_type: data.voice_type
          ? String(data.voice_type).trim().toLowerCase()
          : null,
      } as Student;
    });
  },

  // Fetch a single student by ID
  async getStudentById(id: string): Promise<Student | null> {
    const docSnap = await getDoc(doc(db, "students", id));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
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
  },

  // Fetch all groups from the "groups" collection
  async getGroups(): Promise<Group[]> {
    const querySnapshot = await getDocs(collection(db, "groups"));
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        year_id: data.year_id !== undefined ? Number(data.year_id) : null,
      } as Group;
    });
  },

  // Update a student's group assignment
  async updateStudentGroup(studentId: string, newGroupId: string) {
    const studentRef = doc(db, "students", studentId);

    // Fetch the new group's details to get its year_id
    const groupDoc = await getDoc(doc(db, "groups", newGroupId));
    let newYearId: number | undefined;

    if (groupDoc.exists()) {
      const gData = groupDoc.data();
      newYearId =
        gData.year_id !== undefined ? Number(gData.year_id) : undefined;
    }

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
    return addDoc(collection(db, "students"), studentData);
  },
};
