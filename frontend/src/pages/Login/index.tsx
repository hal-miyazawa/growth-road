import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { ApiError, apiPost } from "../../lib/api";
import styles from "./Login.module.scss";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) return;

    try {
      setIsSubmitting(true);
      const payload = await apiPost<LoginResponse>("/api/auth/login", {
        email,
        password,
      });
      localStorage.setItem("access_token", payload.access_token);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.status == 401) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else {
        setError("ログインに失敗しました。時間をおいて再度お試しください");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>ログイン</h1>
          <p className={styles.description}>
            メールアドレスとパスワードを入力してください
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.content}>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                パスワード
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={styles.input}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? "ログイン中..." : "ログイン"}
            </button>
            <p className={styles.signupLink}>
              アカウントをお持ちでない方は <Link to="/signup">新規登録へ</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
