import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { phases } from "../roadmap-data";
import type { BuildContentInventoryOptions, ContentFile, ContentInventory, LessonFile } from "./types";

async function readDirectory(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function jsonFiles(directory: string, rootDir: string): Promise<ContentFile[]> {
  const files = (await readDirectory(directory)).filter((file) => file.endsWith(".json"));
  return Promise.all(
    files.map(async (name) => {
      const absoluteFile = path.join(directory, name);
      const file = path.relative(rootDir, absoluteFile);
      let value: unknown;
      try {
        value = JSON.parse(await readFile(absoluteFile, "utf8"));
      } catch (error) {
        value = { __parseError: error instanceof Error ? error.message : String(error) };
      }
      return { file, id: path.basename(name, ".json"), value };
    })
  );
}

async function lessonFiles(contentDir: string, rootDir: string): Promise<LessonFile[]> {
  const phaseDirectories = (await readDirectory(contentDir)).filter((name) => name.startsWith("phase-"));
  const groups = await Promise.all(
    phaseDirectories.map(async (phaseDirectory) => {
      const directory = path.join(contentDir, phaseDirectory);
      const files = (await readDirectory(directory)).filter((file) => file.endsWith(".mdx"));
      return Promise.all(
        files.map(async (name) => ({
          file: path.relative(rootDir, path.join(directory, name)),
          id: path.basename(name, ".mdx"),
          value: await readFile(path.join(directory, name), "utf8"),
        }))
      );
    })
  );
  return groups.flat();
}

function roadmapTopicIds(): string[] {
  return phases.flatMap((phase) => phase.topics.map((topic) => topic.id));
}

export async function buildContentInventory(
  rootDir: string,
  options: BuildContentInventoryOptions = {}
): Promise<ContentInventory> {
  const contentDir = path.join(rootDir, "content");
  return {
    rootDir,
    topicIds: options.topicIds ?? roadmapTopicIds(),
    lessons: await lessonFiles(contentDir, rootDir),
    quizzes: await jsonFiles(path.join(contentDir, "quizzes"), rootDir),
    challenges: await jsonFiles(path.join(contentDir, "challenges"), rootDir),
    ladders: await jsonFiles(path.join(contentDir, "practice-ladders"), rootDir),
  };
}
