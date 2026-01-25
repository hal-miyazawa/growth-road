import { useState } from "react";
import type * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Signup.module.scss";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 4) {
      setError("パスワードは4文字以上で入力してください");
      return;
    }

    // ローカル登録：localStorageに保存して成功扱い
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const existingUser = users.find((u: { email: string }) => u.email === email);

    if (existingUser) {
      setError("このメールアドレスは既に登録されています");
      return;
    }

    users.push({ email, password });
    localStorage.setItem("mock_users", JSON.stringify(users));
    navigate("/login");
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>新規登録</h1>
          <p className={styles.description}>アカウントを作成してください</p>
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
                  autoComplete="new-password"
                  className={styles.input}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword" className={styles.label}>
                パスワード（確認）
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="パスワード（確認）"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={styles.input}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"
                  }
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="submit" className={styles.submitButton}>
              登録する
            </button>

            <p className={styles.loginLink}>
              すでにアカウントをお持ちの方は <Link to="/login">ログインへ</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
