import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { Group, Student } from "./mockData";

export const studentService = {
  // Fetch all students from the "students" collection
  async getAllStudents(): Promise<Student[]> {
    const q = query(collection(db, "students"), orderBy("full_name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Student[];
  },

  // Fetch all groups from the "groups" collection
  async getGroups(): Promise<Group[]> {
    const querySnapshot = await getDocs(collection(db, "groups"));
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Group[];
  },

  // Update a student's group assignment
  async updateStudentGroup(studentId: string, groupId: string) {
    const studentRef = doc(db, "students", studentId);
    return await updateDoc(studentRef, {
      group_id: groupId,
    });
  },

  // Add a new student to Firestore
  async addStudent(studentData: Omit<Student, "id">) {
    const studentsRef = collection(db, "students");
    return await addDoc(studentsRef, studentData);
  },
};
