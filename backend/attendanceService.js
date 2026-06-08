import { db } from "@/src/firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const saveAttendance = async (eventId, attendanceData) => {
  try {
    await setDoc(doc(db, "attendance", eventId), {
      eventId,
      records: attendanceData,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error saving attendance:", error);
    return false;
  }
};

export const getAttendance = async (eventId) => {
  try {
    const snap = await getDoc(doc(db, "attendance", eventId));
    if (snap.exists()) {
      return snap.data().records;
    }
    return {};
  } catch (error) {
    console.error("Error getting attendance:", error);
    return {};
  }
};
