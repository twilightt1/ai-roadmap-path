import type { RunResult } from "./types";
import type { WorkerExecutionMessage, WorkerExecutionRequest } from "./worker-protocol";

export type WorkerRunnerStatus = "loading-runtime" | "loading-packages" | "executing";
export type WorkerExecutionErrorKind = "runtime-load" | "timeout" | "canceled" | "execution";

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
};

type ExecuteOptions = {
  signal?: AbortSignal;
  loadTimeoutMs?: number;
  executionTimeoutMs?: number;
  onStatus?: (status: WorkerRunnerStatus) => void;
};

type PendingRequest = {
  resolve: (result: RunResult) => void;
  reject: (error: WorkerExecutionError) => void;
  options: ExecuteOptions;
  loadTimer: ReturnType<typeof setTimeout> | null;
  executionTimer: ReturnType<typeof setTimeout> | null;
  abortListener: (() => void) | null;
};

export class ExecutionWorkerClient {
  private worker: WorkerLike | null = null;
  private pending = new Map<string, PendingRequest>();

  constructor(private readonly dependencies: { createWorker: () => WorkerLike }) {}

  execute(code: string, options: ExecuteOptions = {}): Promise<RunResult> {
    const worker = this.getWorker();
    const requestId = crypto.randomUUID();

    return new Promise<RunResult>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve,
        reject,
        options,
        loadTimer: null,
        executionTimer: null,
        abortListener: null,
      };
      this.pending.set(requestId, pending);

      if (options.signal) {
        pending.abortListener = () => this.failRequest(requestId, "Execution canceled", "canceled");
        if (options.signal.aborted) pending.abortListener();
        else options.signal.addEventListener("abort", pending.abortListener, { once: true });
      }

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
    this.worker = this.dependencies.createWorker();
    this.worker.addEventListener("message", (event) => this.handleMessage(event.data));
    return this.worker;
  }

  private handleMessage(message: WorkerExecutionMessage) {
    const pending = this.pending.get(message.requestId);
    if (!pending) return;

    if (message.type === "loading-runtime" || message.type === "loading-packages") {
      pending.options.onStatus?.(message.type);
      return;
    }

    if (message.type === "executing") {
      pending.options.onStatus?.("executing");
      this.clearTimer(pending.loadTimer);
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
      message.type === "runtime-error" ? "runtime-load" : "execution",
      false
    );
  }

  private resolveRequest(requestId: string, result: RunResult) {
    const pending = this.takePending(requestId);
    pending?.resolve(result);
  }

  private failRequest(
    requestId: string,
    message: string,
    kind: WorkerExecutionErrorKind,
    recreateWorker = true
  ) {
    const pending = this.takePending(requestId);
    if (!pending) return;
    if (recreateWorker) this.disposeWorker();
    pending.reject(new WorkerExecutionError(message, kind));
  }

  private takePending(requestId: string): PendingRequest | undefined {
    const pending = this.pending.get(requestId);
    if (!pending) return undefined;
    this.pending.delete(requestId);
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
    this.worker?.terminate();
    this.worker = null;
    for (const [requestId, pending] of this.pending) {
      this.pending.delete(requestId);
      this.clearTimer(pending.loadTimer);
      this.clearTimer(pending.executionTimer);
      pending.reject(new WorkerExecutionError("Worker restarted", "runtime-load"));
    }
  }
}
