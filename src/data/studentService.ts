import {
  addDoc,
  collection,
  deleteDoc,
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
    year_id:
      data.year_id !== undefined
        ? Number(data.year_id)
        : data.year !== undefined
          ? Number(data.year)
          : null,
    voice_type: data.voice_type
      ? String(data.voice_type).trim().toLowerCase()
      : null,
    year_joined: data.year_joined || null,
  } as Student;
};

export const studentService = {
  async getAllStudents(): Promise<Student[]> {
    const q = query(
      collection(db, "users"),
      where("role", "==", "singer"),
      orderBy("full_name"),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => mapToStudent(doc.id, doc.data()));
  },

  async getStudentById(id: string): Promise<Student | null> {
    const docSnap = await getDoc(doc(db, "users", id));
    if (!docSnap.exists()) return null;
    return mapToStudent(docSnap.id, docSnap.data());
  },

  // id placed AFTER spread so the Firestore doc ID is never overwritten by stored data
  async getGroups(): Promise<Group[]> {
    try {
      const snap = await getDocs(collection(db, "groups"));
      return snap.docs.map((d) => ({
        ...(d.data() as Omit<Group, "id">),
        id: d.id,
      }));
    } catch (e) {
      console.warn("getGroups Firestore error:", e);
      return [];
    }
  },

  async updateStudentGroup(studentId: string, newGroupId: string) {
    const studentRef = doc(db, "users", studentId);

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

  async createGroup(
    name: string,
    memberIds: string[],
    yearId: number,
  ): Promise<string> {
    const ref = await addDoc(collection(db, "groups"), {
      name,
      member_ids: memberIds,
      created_at: new Date().toISOString(),
      year_id: yearId,
      program_id: yearId, // Assuming program_id is the same as year_id for simplicity
    });
    return ref.id;
  },

  async updateGroup(
    groupId: string,
    name: string,
    memberIds: string[],
  ): Promise<void> {
    await updateDoc(doc(db, "groups", groupId), {
      name,
      member_ids: memberIds,
    });
  },

  async deleteGroup(groupId: string): Promise<void> {
    await deleteDoc(doc(db, "groups", groupId));
  },
};
