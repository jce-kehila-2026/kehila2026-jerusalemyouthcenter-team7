import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    updateDoc,
} from "firebase/firestore";
import { Group, Student } from "../data/mockData";
import { db } from "../firebase/firebase";

export const studentService = {
  // Fetch all students from the "students" collection
  async getAllStudents(): Promise<Student[]> {
    const q = query(collection(db, "students"), orderBy("full_name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id, // Firestore uses string IDs (UIDs)
    })) as any[];
  },

  // Fetch all groups from the "groups" collection
  async getGroups(): Promise<Group[]> {
    const querySnapshot = await getDocs(collection(db, "groups"));
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as any[];
  },

  // Update a student's group assignment
  async updateStudentGroup(studentId: string, groupId: string | number) {
    const studentRef = doc(db, "students", studentId);
    return await updateDoc(studentRef, {
      group_id: groupId,
    });
  },
};
