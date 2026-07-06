import type { RunResult } from "./types";

/**
 * Runner Python qua Pyodide (WebAssembly) — chạy hoàn toàn trong browser,
 * không cần backend. Pyodide (~10MB) lazy-load từ CDN lần đầu user bấm Run,
 * cache singleton ở module scope để các playground dùng chung.
 *
 * Giới hạn MVP: chạy trên main thread → infinite loop đóng băng tab.
 * Hardening tương lai = Web Worker + timeout.
 */

// Pyodide types lỏng — CDN script gắn vào window.
type Pyodide = {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<void>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  globals: { set: (k: string, v: unknown) => void };
};

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<Pyodide>;
    pyodide?: Pyodide;
  }
}

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise: Promise<Pyodide> | null = null;

/** Inject script Pyodide từ CDN (1 lần), trả về khi window.loadPyodide sẵn sàng. */
function injectScriptOnce(): Promise<void> {
  if (window.loadPyodide) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(
      "pyodide-script"
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.loadPyodide) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Không tải được Pyodide từ CDN"))
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "pyodide-script";
    script.src = `${PYODIDE_CDN}pyodide.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Pyodide từ CDN"));
    document.head.appendChild(script);
  });
}

/** Load Pyodide một lần, cache promise ở module scope. */
export async function loadPyodideOnce(): Promise<Pyodide> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    await injectScriptOnce();
    if (!window.loadPyodide) {
      throw new Error("loadPyodide không khả dụng sau khi inject script");
    }
    const py = await window.loadPyodide({ indexURL: PYODIDE_CDN });
    window.pyodide = py;
    return py;
  })();
  return pyodidePromise;
}

/** Làm gọn traceback Python: bỏ các dòng internal Pyodide. */
function cleanTraceback(tb: string): string {
  return tb
    .split("\n")
    .filter(
      (line) =>
        !line.includes('File "<exec>"') ||
        !line.includes("pyodide") ||
        line.trim().startsWith("File")
    )
    .join("\n")
    .trim();
}

/**
 * Chạy code Python, trả về stdout/stderr/error.
 * `loadPackagesFromImports` tự load numpy/pandas/scikit-learn khi thấy import.
 */
export async function runPython(code: string): Promise<RunResult> {
  const start = performance.now();
  let stdout = "";
  let stderr = "";
  let py: Pyodide;
  try {
    py = await loadPyodideOnce();
  } catch (e) {
    return {
      stdout: "",
      stderr: "",
      error: `Không load được Python runtime: ${(e as Error).message}`,
      durationMs: Math.round(performance.now() - start),
    };
  }

  try {
    await py.loadPackagesFromImports(code);
    py.setStdout({ batched: (s) => (stdout += s + "\n") });
    py.setStderr({ batched: (s) => (stderr += s + "\n") });
    await py.runPythonAsync(code);
    return {
      stdout: stdout.trimEnd(),
      stderr: stderr.trimEnd(),
      durationMs: Math.round(performance.now() - start),
    };
  } catch (e) {
    const msg = (e as Error).message || String(e);
    return {
      stdout: stdout.trimEnd(),
      stderr: stderr.trimEnd(),
      error: cleanTraceback(msg),
      durationMs: Math.round(performance.now() - start),
    };
  }
}
