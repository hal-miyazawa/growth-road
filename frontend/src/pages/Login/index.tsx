import { useState } from "react";
import type * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Login.module.scss";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) return;

    // ローカル認証：test@gmail.com / 0000 のみ成功
    if (email === "test@gmail.com" && password === "0000") {
      localStorage.setItem("mock_auth", "1");
      navigate("/");
    } else {
      setError("メールアドレスまたはパスワードが正しくありません");
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
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <button type="submit" className={styles.submitButton}>
              ログイン
            </button>
            <p className={styles.signupLink}>
              アカウントをお持ちでない方は{" "}
              <Link to="/signup">新規登録へ</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
