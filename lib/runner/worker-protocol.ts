import type { RunResult } from "./types";

export type WorkerExecutionRequest = {
  type: "execute";
  requestId: string;
  code: string;
};

export type WorkerExecutionMessage =
  | { type: "loading-runtime"; requestId: string }
  | { type: "loading-packages"; requestId: string }
  | { type: "executing"; requestId: string }
  | { type: "result"; requestId: string; result: RunResult }
  | { type: "runtime-error"; requestId: string; message: string }
  | { type: "execution-error"; requestId: string; message: string };
