import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { db } from "./firebase";
import { QuestionnaireTemplate, Response } from "./interfaces";

export async function getFormTemplate(
  templateId: string,
): Promise<QuestionnaireTemplate | null> {
  const templateRef = doc(db, "forms", templateId);
  try {
    const docSnap = await getDoc(templateRef);
    if (docSnap.exists()) {
      return docSnap.data() as QuestionnaireTemplate;
    } else {
      console.warn(`No questionnaire template found with ID: ${templateId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching form template:", error);
    throw error;
  }
}

export async function submitStudentForm(
  studentId: string,
  formId: string,
  responses: Response[],
): Promise<void> {
  try {
    await addDoc(collection(db, "form_submissions"), {
      form_id: formId,
      student_id: studentId,
      submitted_at: new Date().toISOString(),
      responses: responses,
    });
    console.log(`Form ${formId} submitted by student ${studentId}`);
  } catch (error) {
    console.error(`Error submitting form for student ${studentId}:`, error);
    throw error;
  }
}

export async function getFormSubmissions(formId?: string): Promise<any[]> {
  try {
    const ref = collection(db, "form_submissions");
    const snapshot = formId
      ? await getDocs(query(ref, where("form_id", "==", formId)))
      : await getDocs(ref);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return [];
  }
}

// دالة جلب كل الفورمات
export async function getAllForms(): Promise<any[]> {
  const formsRef = collection(db, "forms");
  try {
    const snapshot = await getDocs(formsRef);
    const allForms = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return allForms;
  } catch (error) {
    console.error("Error fetching all forms:", error);
    return [];
  }
}

// 👇 ── الدالة السحرية الجديدة ضفناها بآخر الملف ── 👇
export async function restoreOldForms() {
  const formsRef = collection(db, "forms");

  const oldForms = [
    {
      title: "End of Year Survey",
      description: "Share your experience with us this year.",
      date: "2026-04-01",
      target_audience: "both",
      questions: [
        {
          id: "q1",
          text: "How would you rate your overall experience?",
          answer_type: "multiple_choice",
        },
        {
          id: "q2",
          text: "What was your favorite activity?",
          answer_type: "text",
        },
        {
          id: "q3",
          text: "Would you recommend the program to a friend?",
          answer_type: "yes_no",
        },
      ],
    },
    {
      title: "Event Registration: Shabbat Dinner",
      description: "Register for the upcoming Shabbat dinner.",
      date: "2026-04-20",
      target_audience: "both",
      questions: [
        {
          id: "q1",
          text: "Do you have any dietary restrictions?",
          answer_type: "text",
        },
        { id: "q2", text: "Will you bring a guest?", answer_type: "yes_no" },
      ],
    },
    {
      title: "Program Feedback - Spring 2026",
      description: "Help us improve our programs.",
      date: "2026-04-25",
      target_audience: "both",
      questions: [
        {
          id: "q1",
          text: "Which sessions did you attend?",
          answer_type: "multiple_choice",
        },
        { id: "q2", text: "What can we improve?", answer_type: "text" },
      ],
    },
    {
      title: "New Student Registration Form",
      description:
        "This form is filled out by the coordinator to add a new student to the chorus.",
      date: "2026-05-10",
      target_audience: "admin",
      questions: [
        { id: "q1", text: "Student's Full Name", answer_type: "text" },
        {
          id: "q2",
          text: "Parents' Phone Number (if the student does not have a phone)",
          answer_type: "text",
        },
        {
          id: "q3",
          text: "Parental Consent and Signature",
          answer_type: "yes_no",
        },
        {
          id: "q4",
          text: "Medical Situation / Allergies (If any)",
          answer_type: "text",
        },
      ],
    },
  ];

  try {
    for (const form of oldForms) {
      await addDoc(formsRef, form);
    }
    alert("تم استرجاع جميع الفورمات للفايربيز بنجاح! 🚀");
  } catch (error) {
    console.error("Error restoring forms: ", error);
    alert("حدث خطأ أثناء الاسترجاع!");
  }
}
export async function deleteForm(formId: string): Promise<void> {
  try {
    const formRef = doc(db, "forms", formId);
    await deleteDoc(formRef);
    console.log("Form deleted successfully");
  } catch (error) {
    console.error("Error deleting form:", error);
    throw error;
  }
}
