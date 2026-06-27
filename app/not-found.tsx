import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/25">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="text-5xl font-bold tracking-tight text-gradient">404</h1>
      <p className="mt-4 text-lg font-semibold">Trang không tồn tại</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Có vẻ bạn đi chệch khỏi lộ trình. Quay lại đường chính nào.
      </p>
      <Link
        href="/roadmap"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-transform hover:scale-[1.03]"
      >
        <ArrowLeft className="h-4 w-4" /> Về lại roadmap
      </Link>
    </div>
  );
}
