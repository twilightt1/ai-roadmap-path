import type { Metadata } from "next";
import { getAllChallenges } from "@/lib/challenge";
import { ChallengeList } from "@/components/challenge/challenge-list";

export const metadata: Metadata = {
  title: "Luyện tập — AI Learning Platform",
  description:
    "Bài toán code kiểu LeetCode cho NumPy, Pandas, scikit-learn và Python. Chạy trong browser, auto-grade, track tiến độ.",
};

export default function PracticePage() {
  const challenges = getAllChallenges();
  return <ChallengeList challenges={challenges} />;
}
