import { describe, expect, it, vi } from "vitest";
import { registerObservabilityAdapter } from "../observability/client";
import { ExecutionWorkerClient } from "./execution-worker-client";

type MessageListener = (event: MessageEvent<unknown>) => void;
type ErrorListener = (event: ErrorEvent) => void;

function createFakeWorker() {
  let messageListener: MessageListener | undefined;
  let errorListener: ErrorListener | undefined;
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn((type: string, nextListener: MessageListener | ErrorListener) => {
      if (type === "message") messageListener = nextListener as MessageListener;
      if (type === "error") errorListener = nextListener as ErrorListener;
    }),
    emit(data: unknown) {
      messageListener?.({ data } as MessageEvent);
    },
    emitError(message = "Worker failed") {
      errorListener?.({ message } as ErrorEvent);
    },
  };
}

describe("ExecutionWorkerClient", () => {
  it("emits lifecycle boundaries without raw code or output", async () => {
    const worker = createFakeWorker();
    const adapter = { captureEvent: vi.fn(), captureError: vi.fn() };
    const unregister = registerObservabilityAdapter(adapter);
    const client = new ExecutionWorkerClient({ createWorker: () => worker as never });

    const result = client.execute("print('sensitive')");
    const request = worker.postMessage.mock.calls[0][0] as { requestId: string };
    worker.emit({ type: "executing", requestId: request.requestId });
    worker.emit({ type: "result", requestId: request.requestId, result: { stdout: "sensitive", stderr: "", durationMs: 1 } });

    await result;
    unregister();
    expect(adapter.captureEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "runner.lifecycle", outcome: "started" }));
    expect(adapter.captureEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "runner.lifecycle", outcome: "completed", metadata: expect.not.objectContaining({ code: expect.anything(), output: expect.anything() }) }));
  });

  it("resolves the matching result after reporting execution status", async () => {
    const worker = createFakeWorker();
    const onStatus = vi.fn();
    const client = new ExecutionWorkerClient({ createWorker: () => worker as never });

    const result = client.execute("print('ok')", { onStatus });
    const request = worker.postMessage.mock.calls[0][0] as { requestId: string };
    worker.emit({ type: "executing", requestId: request.requestId });
    worker.emit({
      type: "result",
      requestId: request.requestId,
      result: { stdout: "ok", stderr: "", durationMs: 1 },
    });

    await expect(result).resolves.toEqual({ stdout: "ok", stderr: "", durationMs: 1 });
    expect(onStatus).toHaveBeenCalledWith("executing");
  });

  it("ignores a result for an unknown request id", async () => {
    const worker = createFakeWorker();
    const client = new ExecutionWorkerClient({ createWorker: () => worker as never });

    const result = client.execute("print('ok')");
    const request = worker.postMessage.mock.calls[0][0] as { requestId: string };
    worker.emit({
      type: "result",
      requestId: "stale-request",
      result: { stdout: "stale", stderr: "", durationMs: 1 },
    });
    worker.emit({
      type: "result",
      requestId: request.requestId,
      result: { stdout: "ok", stderr: "", durationMs: 1 },
    });

    await expect(result).resolves.toMatchObject({ stdout: "ok" });
  });

  it("rejects a second execution while one request owns the worker", async () => {
    const worker = createFakeWorker();
    const client = new ExecutionWorkerClient({ createWorker: () => worker as never });

    const first = client.execute("print('first')");
    await expect(client.execute("print('second')")).rejects.toMatchObject({ kind: "busy" });
    expect(worker.postMessage).toHaveBeenCalledOnce();

    const request = worker.postMessage.mock.calls[0][0] as { requestId: string };
    worker.emit({ type: "result", requestId: request.requestId, result: { stdout: "first", stderr: "" } });
    await expect(first).resolves.toMatchObject({ stdout: "first" });
  });

  it("rejects and recreates after a worker error event", async () => {
    const first = createFakeWorker();
    const second = createFakeWorker();
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const client = new ExecutionWorkerClient({ createWorker: factory });

    const failed = client.execute("print('first')");
    first.emitError("Worker exploded");
    await expect(failed).rejects.toMatchObject({ kind: "execution", message: "Worker exploded" });
    expect(first.terminate).toHaveBeenCalledOnce();

    const fresh = client.execute("print('fresh')");
    const request = second.postMessage.mock.calls[0][0] as { requestId: string };
    second.emit({ type: "result", requestId: request.requestId, result: { stdout: "fresh", stderr: "" } });
    await expect(fresh).resolves.toMatchObject({ stdout: "fresh" });
  });

  it("terminates the worker when execution times out", async () => {
    vi.useFakeTimers();
    const worker = createFakeWorker();
    const client = new ExecutionWorkerClient({ createWorker: () => worker as never });
    const result = client.execute("while True: pass", { executionTimeoutMs: 10 });
    const request = worker.postMessage.mock.calls[0][0] as { requestId: string };
    worker.emit({ type: "executing", requestId: request.requestId });

    const rejection = expect(result).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(worker.terminate).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("creates a fresh worker after cancellation", async () => {
    const first = createFakeWorker();
    const second = createFakeWorker();
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const client = new ExecutionWorkerClient({ createWorker: factory });
    const controller = new AbortController();

    const firstResult = client.execute("while True: pass", { signal: controller.signal });
    controller.abort();
    await expect(firstResult).rejects.toMatchObject({ kind: "canceled" });

    const secondResult = client.execute("print('fresh')");
    const secondRequest = second.postMessage.mock.calls[0][0] as { requestId: string };
    second.emit({
      type: "result",
      requestId: secondRequest.requestId,
      result: { stdout: "fresh", stderr: "", durationMs: 1 },
    });

    await expect(secondResult).resolves.toMatchObject({ stdout: "fresh" });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("does not reject future work when a stale worker emits an error", async () => {
    const first = createFakeWorker();
    const second = createFakeWorker();
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const client = new ExecutionWorkerClient({ createWorker: factory });
    const controller = new AbortController();

    const canceled = client.execute("while True: pass", { signal: controller.signal });
    controller.abort();
    await expect(canceled).rejects.toMatchObject({ kind: "canceled" });

    const fresh = client.execute("print('fresh')");
    first.emitError("stale worker failure");
    const request = second.postMessage.mock.calls[0][0] as { requestId: string };
    second.emit({ type: "result", requestId: request.requestId, result: { stdout: "fresh", stderr: "" } });

    await expect(fresh).resolves.toMatchObject({ stdout: "fresh" });
  });
});
