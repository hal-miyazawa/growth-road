# GrowthRoad WORKLOG

## アプリ概要
- このセクションはプロダクトの目的と方向性を表す固定メモ。原則変更しない。
- GrowthRoad は、AI とクラウドを使って個人の成長を定量化する自己管理アプリとして作っている。
- ベースは TODO アプリだが、単なる記録ではなく、自分自身が成長していく道標になり、成長した証も後から確認できる体験を目指している。
- 将来的には API を使ってデータ入力をサポートし、蓄積データの分析や可視化まで行う想定。
- 収集するデータ量や分析の深さは、ユーザーごとに調整できる構成を目指している。
- 開発動機は、私生活・バイト・学校・資格などでやるべきことが多い中で、何を優先すべきか見失いやすい課題を解決すること。
- 自分自身のための道具として始めつつ、同じ悩みを持つ人にとっても判断の指標になるアプリを目指している。
- 現在の実装は、ラベル・タスク・プロジェクト管理を中心に進めており、フロントエンドは React + Vite + TypeScript、バックエンドは FastAPI + SQLite + SQLAlchemy + Pydantic v2 を使用している。
- 現在は labels / projects / tasks をユーザー単位で分離して扱う構成になっており、認証は Bearer トークン前提に移行中。

## 現在の状態
- バックエンド:
  - `users` テーブルを追加済み。
  - `labels` / `projects` / `tasks` に `user_id` を追加済み。
  - `POST /api/auth/signup`、`POST /api/auth/login`、`GET /api/auth/me` を実装済み。
  - labels / projects / tasks の CRUD は Bearer 認証経由の `user_id` で絞り込む構成に変更済み。
  - Swagger でバックエンドの認証 API 確認済み。
- フロントエンド:
  - Login 画面は `POST /api/auth/login` に接続済み。
  - Signup 画面は Login 画面の見た目を流用して `POST /api/auth/signup` に接続する方向で作業済み。
  - API 呼び出しは `Authorization: Bearer <access_token>` を自動付与する構成に変更済み。
  - `RequireAuth` は `access_token` の有無で判定する構成に変更済み。
  - ログアウト時は `access_token` を削除する構成に変更済み。
- 画面機能:
  - labels / projects / tasks の API 連携は一通り導入済み。
  - Dashboard には履歴表示、ソート、完了処理などの追加実装が入っている。

## 未完了
- Signup 画面の最終確認:
  - `/signup` の表示と遷移確認。
  - 登録成功後に `/login` に戻る動作確認。
  - 既存メール時のエラー表示確認。
- 認証フロント統合の最終確認:
  - Login 成功後に `access_token` が保存されること。
  - API リクエストに Bearer トークンが付くこと。
  - ログアウト後に保護ルートへ入れないこと。
- 不要資産の整理:
  - 未使用の認証まわりスタイルや旧 `mock_auth` 前提の残骸がないか確認。
- 今後の本筋:
  - フロントとバックエンドの認証状態を完全に一致させる。
  - その後、ユーザーに紐づくデータを前提に分析機能を設計する。

## 起動手順
- バックエンド:
  - `cd C:\work\GrowthRoad\backend`
  - `.\venv\Scripts\python.exe -m uvicorn main:app --reload`
- フロントエンド:
  - `cd C:\work\GrowthRoad\frontend`
  - `npm run dev`
- 備考:
  - バックエンドのスキーマ変更後は migration 未導入のため `growth_road.db` 再作成が必要になる場合がある。
  - 認証系の確認前にバックエンドが `http://127.0.0.1:8000` で起動していることを確認する。

## 確認手順
- バックエンド:
  - Swagger で `POST /api/auth/signup`、`POST /api/auth/login`、`GET /api/auth/me` を確認する。
  - `GET /api/auth/me` は Bearer トークン付きで 200 が返ることを確認する。
- フロントエンド:
  - `/login` を開く。
  - 正しい認証情報でログインし、`/` に遷移することを確認する。
  - DevTools の Local Storage で `access_token` が保存されていることを確認する。
  - Dashboard 表示後、Network で `/api/labels` などの Request Headers に `Authorization: Bearer ...` が付いていることを確認する。
  - ログアウト後に `access_token` が削除され、保護ルートへ未ログインで入れないことを確認する。
- Signup:
  - `/signup` を開く。
  - 新規登録成功で `/login` に戻ることを確認する。
  - 既存メールアドレスで 409 相当のエラー表示になることを確認する。

## 次に着手する順番
1. Signup 画面を含めた認証フロント統合を最終確認する。
2. 認証エラー時のフロント挙動を統一する。
3. 不要な旧認証コードや未使用ファイルを整理する。
4. ユーザーに紐づくデータを前提に、分析機能で使う指標を整理する。
5. 分析機能に必要な API とフロント画面の最小構成を決める。
