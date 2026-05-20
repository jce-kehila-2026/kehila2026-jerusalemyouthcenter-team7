export type AnswerType = "range" | "text";

export interface Question {
  id: string;
  question_text: string;
  answer_type: AnswerType;
}

export interface QuestionnaireTemplate {
  title: string;
  date: string; 
  modified: string; 
  questions: Question[];
}

export interface Response {
  questionId: string;
  answer: string | number;
}

export interface SubmittedForm {
  formId: string;
  submitDate: string; 
  responses: Response[];
}