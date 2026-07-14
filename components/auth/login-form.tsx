"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/error-message";
import { syncProgressAfterSignIn } from "@/lib/progress";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase chưa được cấu hình. Hãy điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "sign-in") {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (!signInData.session) throw new Error("Đăng nhập không trả về phiên hợp lệ.");
        await syncProgressAfterSignIn(signInData.session);
        setMessage("Đã đăng nhập. Tiến độ local sẽ được đồng bộ nếu có.");
        router.replace("/dashboard");
        router.refresh();
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split("@")[0],
            },
          },
        });
        if (signUpError) throw signUpError;
        setMessage("Tài khoản đã được tạo. Nếu Supabase bật email confirmation, hãy kiểm tra email.");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Không thể xác thực. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card/40 p-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">
          {mode === "sign-in" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Đăng nhập để lưu tiến độ, quiz và challenge lên Supabase PostgreSQL.
        </p>
      </div>

      {mode === "sign-up" && (
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Tên hiển thị</span>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="AI learner"
            autoComplete="name"
          />
        </label>
      )}

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Email</span>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </label>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Mật khẩu</span>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        />
      </label>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          {message}
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "sign-in" ? "Đăng nhập" : "Tạo tài khoản"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
          setMessage(null);
        }}
        className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {mode === "sign-in"
          ? "Chưa có tài khoản? Tạo tài khoản"
          : "Đã có tài khoản? Đăng nhập"}
      </button>
    </form>
  );
}
