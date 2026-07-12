import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChallenge, allChallengeParams } from "@/lib/challenge";
import { getLearnerSafePracticeLadder } from "@/lib/practice-ladder";
import { ChallengeView } from "@/components/challenge/challenge-view";

type Params = Promise<{ id: string }>;

export async function generateStaticParams() {
  return allChallengeParams();
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const challenge = await getChallenge(id);
  if (!challenge) return { title: "Challenge không tồn tại" };
  return {
    title: `${challenge.title} — Luyện tập`,
    description: `${challenge.title} — ${challenge.category} ${challenge.difficulty}`,
  };
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  // includeSolution=false mặc định — không lộ đáp án về client.
  const [challenge, ladder] = await Promise.all([
    getChallenge(id),
    getLearnerSafePracticeLadder(id),
  ]);
  if (!challenge) notFound();
  return <ChallengeView challenge={challenge} ladder={ladder} />;
}
