import Image from "next/image";

/**
 * Logo wall for tech stack social proof.
 * Uses real SVG logos from simpleicons.org CDN.
 */
const techLogos = [
  { name: "Python", slug: "python", color: "3776AB" },
  { name: "PyTorch", slug: "pytorch", color: "EE4C2C" },
  { name: "OpenAI", slug: "openai", color: "FFFFFF" },
  { name: "Hugging Face", slug: "huggingface", color: "FFD21E" },
  { name: "LangChain", slug: "langchain", color: "1C3C3C" },
  { name: "FastAPI", slug: "fastapi", color: "009688" },
  { name: "Docker", slug: "docker", color: "2496ED" },
  { name: "Next.js", slug: "nextdotjs", color: "FFFFFF" },
];

export function LogoWall() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <p className="mb-8 text-center text-xs font-mono uppercase tracking-wider text-muted-foreground">
        Tech stack bạn sẽ làm việc
      </p>
      <div className="grid grid-cols-4 gap-8 sm:grid-cols-8">
        {techLogos.map((logo) => (
          <div
            key={logo.slug}
            className="flex items-center justify-center opacity-60 transition-opacity hover:opacity-100"
          >
            <Image
              src={`https://cdn.simpleicons.org/${logo.slug}/ffffff`}
              alt={`${logo.name} logo`}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
