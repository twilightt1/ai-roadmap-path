import { describe, expect, it } from "vitest";
import { GET, resetSolutionRouteRateLimitForTest } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("challenge solution route", () => {
  it("rejects malformed challenge ids", async () => {
    const response = await GET(new Request("http://localhost/api/challenges/invalid"), params("../secrets"));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns pedagogical practice content with private no-store caching", async () => {
    const response = await GET(new Request("http://localhost/api/challenges/python-fibonacci/solution"), params("python-fibonacci"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("bounds repeated requests from one process client", async () => {
    resetSolutionRouteRateLimitForTest();
    const request = new Request("http://localhost/api/challenges/python-fibonacci/solution", { headers: { "x-forwarded-for": "203.0.113.1" } });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await GET(request, params("python-fibonacci"))).status).toBe(200);
    }
    expect((await GET(request, params("python-fibonacci"))).status).toBe(429);
  });
});
