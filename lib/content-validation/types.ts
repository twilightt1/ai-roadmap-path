export type ContentValidationCode =
  | "DUPLICATE_ID"
  | "FILENAME_ID_MISMATCH"
  | "MISSING_LESSON"
  | "MISSING_QUIZ"
  | "INVALID_ANSWER_INDEX"
  | "ORPHAN_CONTENT"
  | "INVALID_CHALLENGE"
  | "MISSING_VISIBLE_TEST"
  | "INVALID_LADDER"
  | "BROKEN_LADDER_REFERENCE"
  | "MDX_COMPILE_FAILED";

export type ContentValidationIssue = {
  code: ContentValidationCode;
  file: string;
  message: string;
};

export type ContentFile<T = unknown> = {
  file: string;
  id: string;
  value: T;
};

export type LessonFile = ContentFile<string>;

export type ContentInventory = {
  rootDir: string;
  topicIds: string[];
  lessons: LessonFile[];
  quizzes: ContentFile[];
  challenges: ContentFile[];
  ladders: ContentFile[];
};

export type BuildContentInventoryOptions = {
  topicIds?: string[];
};
