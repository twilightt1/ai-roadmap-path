import { describe, expect, it, vi } from "vitest";
import { ExecutionWorkerClient } from "./execution-worker-client";

type Listener = (event: MessageEvent<unknown>) => void;

function createFakeWorker() {
  let listener: Listener | undefined;
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn((_type: string, nextListener: Listener) => {
      listener = nextListener;
    }),
    emit(data: unknown) {
      listener?.({ data } as MessageEvent);
    },
  };
}

describe("ExecutionWorkerClient", () => {
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
});
