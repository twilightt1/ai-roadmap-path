import { capturePlatformError, emitPlatformEvent } from "../observability/client";
import type { RunResult } from "./types";
import type { WorkerExecutionMessage, WorkerExecutionRequest } from "./worker-protocol";

export type WorkerRunnerStatus = "loading-runtime" | "loading-packages" | "executing";
export type WorkerExecutionErrorKind =
  | "runtime-load"
  | "timeout"
  | "canceled"
  | "execution"
  | "output-limit"
  | "busy";

export class WorkerExecutionError extends Error {
  constructor(
    message: string,
    public readonly kind: WorkerExecutionErrorKind
  ) {
    super(message);
  }
}

type WorkerLike = {
  postMessage(message: WorkerExecutionRequest): void;
  terminate(): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerExecutionMessage>) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
};

type ExecuteOptions = {
  signal?: AbortSignal;
  loadTimeoutMs?: number;
  executionTimeoutMs?: number;
  onStatus?: (status: WorkerRunnerStatus) => void;
};

type PendingRequest = {
  requestId: string;
  resolve: (result: RunResult) => void;
  reject: (error: WorkerExecutionError) => void;
  options: ExecuteOptions;
  loadTimer: ReturnType<typeof setTimeout> | null;
  executionTimer: ReturnType<typeof setTimeout> | null;
  abortListener: (() => void) | null;
};

export class ExecutionWorkerClient {
  private worker: WorkerLike | null = null;
  private pending: PendingRequest | null = null;

  constructor(private readonly dependencies: { createWorker: () => WorkerLike }) {}

  execute(code: string, options: ExecuteOptions = {}): Promise<RunResult> {
    if (this.pending) {
      return Promise.reject(new WorkerExecutionError("Worker is busy", "busy"));
    }

    const worker = this.getWorker();
    const requestId = crypto.randomUUID();
    emitPlatformEvent({
      name: "runner.lifecycle",
      outcome: "started",
      metadata: { requestId },
    });

    return new Promise<RunResult>((resolve, reject) => {
      const pending: PendingRequest = {
        requestId,
        resolve,
        reject,
        options,
        loadTimer: null,
        executionTimer: null,
        abortListener: null,
      };
      this.pending = pending;

      if (options.signal) {
        pending.abortListener = () => this.failRequest(requestId, "Execution canceled", "canceled");
        if (options.signal.aborted) pending.abortListener();
        else options.signal.addEventListener("abort", pending.abortListener, { once: true });
      }

      if (this.pending !== pending) return;

      if (options.loadTimeoutMs) {
        pending.loadTimer = setTimeout(
          () => this.failRequest(requestId, "Runtime load timed out", "runtime-load"),
          options.loadTimeoutMs
        );
      }

      worker.postMessage({ type: "execute", requestId, code });
    });
  }

  private getWorker(): WorkerLike {
    if (this.worker) return this.worker;

    const worker = this.dependencies.createWorker();
    this.worker = worker;
    worker.addEventListener("message", (event) => this.handleMessage(worker, event.data));
    worker.addEventListener("error", (event) => this.handleWorkerError(worker, event));
    return worker;
  }

  private handleMessage(worker: WorkerLike, message: WorkerExecutionMessage) {
    if (this.worker !== worker || this.pending?.requestId !== message.requestId) return;

    const pending = this.pending;
    if (message.type === "loading-runtime" || message.type === "loading-packages") {
      pending.options.onStatus?.(message.type);
      return;
    }

    if (message.type === "executing") {
      pending.options.onStatus?.("executing");
      this.clearTimer(pending.loadTimer);
      pending.loadTimer = null;
      if (pending.options.executionTimeoutMs) {
        pending.executionTimer = setTimeout(
          () => this.failRequest(message.requestId, "Execution timed out", "timeout"),
          pending.options.executionTimeoutMs
        );
      }
      return;
    }

    if (message.type === "result") {
      this.resolveRequest(message.requestId, message.result);
      return;
    }

    this.failRequest(
      message.requestId,
      message.message,
      message.type === "runtime-error" ? "runtime-load" : "execution"
    );
  }

  private handleWorkerError(worker: WorkerLike, event: ErrorEvent) {
    if (this.worker !== worker || !this.pending) return;
    this.failRequest(this.pending.requestId, event.message || "Worker execution failed", "execution");
  }

  private resolveRequest(requestId: string, result: RunResult) {
    const pending = this.takePending(requestId);
    if (!pending) return;
    emitPlatformEvent({
      name: "runner.lifecycle",
      outcome: "completed",
      metadata: { requestId, durationMs: result.durationMs ?? null },
    });
    pending.resolve(result);
  }

  private failRequest(requestId: string, message: string, kind: WorkerExecutionErrorKind) {
    const pending = this.takePending(requestId);
    if (!pending) return;
    const code = kind === "runtime-load"
      ? "RUNNER_LOAD_FAILED"
      : kind === "timeout"
        ? "RUNNER_TIMEOUT"
        : kind === "output-limit"
          ? "RUNNER_OUTPUT_LIMIT"
          : "RUNNER_EXECUTION_FAILED";
    emitPlatformEvent({ name: "runner.lifecycle", outcome: kind, metadata: { requestId } });
    capturePlatformError({ code, metadata: { requestId } });
    this.disposeWorker();
    pending.reject(new WorkerExecutionError(message, kind));
  }

  private takePending(requestId: string): PendingRequest | undefined {
    if (this.pending?.requestId !== requestId) return undefined;
    const pending = this.pending;
    this.pending = null;
    this.clearTimer(pending.loadTimer);
    this.clearTimer(pending.executionTimer);
    if (pending.options.signal && pending.abortListener) {
      pending.options.signal.removeEventListener("abort", pending.abortListener);
    }
    return pending;
  }

  private clearTimer(timer: ReturnType<typeof setTimeout> | null) {
    if (timer) clearTimeout(timer);
  }

  private disposeWorker() {
    const worker = this.worker;
    this.worker = null;
    worker?.terminate();
  }
}
