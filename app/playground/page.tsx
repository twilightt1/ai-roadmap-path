import type { Metadata } from "next";
import { PlaygroundPage } from "./playground-page";

export const metadata: Metadata = {
  title: "Playground — AI Learning Platform",
  description:
    "Chạy Python, SQL, JavaScript ngay trong browser qua Pyodide & sql.js. Không cần cài đặt.",
};

type SearchParams = Promise<{ lang?: string; code?: string }>;

export default async function PlaygroundRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  return <PlaygroundPage initialLang={params.lang} initialCode={params.code} />;
}
