"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const form = e.currentTarget;
    const password = (
      form.elements.namedItem("password") as HTMLInputElement | null
    )?.value?.trim();

    if (!password) {
      setError("请输入密码");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = next?.startsWith("/") ? next : "/dashboard";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "登录失败");
      setLoading(false);
    } catch {
      setError("网络错误,请重试");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-xs space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">人生控制台</h1>
          <p className="text-sm text-muted-foreground">输入密码进入</p>
        </div>
        <Input
          type="password"
          name="password"
          autoFocus
          placeholder="密码"
          autoComplete="current-password"
          onChange={() => error && setError("")}
        />
        {error && <p className="text-sm text-muted-foreground">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </Button>
      </form>
    </main>
  );
}
