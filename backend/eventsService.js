import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

const EVENTS_COLLECTION = "events";
const STUDENTS_COLLECTION = "students";

export const getEvents = async () => {
  try {
    const snapshot = await getDocs(collection(db, EVENTS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting events:", error);
    return [];
  }
};

export const getStudents = async () => {
  try {
    const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting students:", error);
    return [];
  }
};

export const addEvent = async (eventData) => {
  try {
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventData);
    return { id: docRef.id, ...eventData };
  } catch (error) {
    console.error("Error adding event:", error);
    return null;
  }
};

export const updateEvent = async (eventId, eventData) => {
  try {
    await updateDoc(doc(db, EVENTS_COLLECTION, eventId), eventData);
    return true;
  } catch (error) {
    console.error("Error updating event:", error);
    return false;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    return false;
  }
};
