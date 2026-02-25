# seed_projects_tasks.py
"""Seed sample projects/tasks for development.

Verification:
- Delete DB file -> start server
- Check /docs: GET /api/labels, /api/projects, /api/tasks, /api/projects-with-tasks
- Restart and confirm projects/tasks do not duplicate
"""
from __future__ import annotations

import uuid
from typing import Optional
from sqlalchemy.orm import Session

from models import Label, Project, Task


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"


def seed_projects_tasks_if_needed(db: Session, user_id: str = "dev-user") -> None:
    if (
        db.query(Project).filter(Project.user_id == user_id).first() is not None
        or db.query(Task).filter(Task.user_id == user_id).first() is not None
    ):
        return

    label_by_title = {
        label.title: label.id
        for label in db.query(Label).filter(Label.user_id == user_id).all()
        if label.title
    }

    label_titles = {
        "study": "資格勉強",
        "home": "家事",
        "work": "仕事",
        "health": "健康",
        "dev": "開発",
        "money": "お金",
    }

    def label_id_for(key: Optional[str]) -> Optional[str]:
        if not key:
            return None
        title = label_titles.get(key)
        if not title:
            return None
        return label_by_title.get(title)

    projects_data = [
        {
            "id": _new_id("proj"),
            "title": "卒制: Growth Road 開発",
            "label_key": "dev",
        },
        {
            "id": _new_id("proj"),
            "title": "資格勉強ロードマップ",
            "label_key": "study",
        },
        {
            "id": _new_id("proj"),
            "title": "健康ルーティン改善",
            "label_key": "health",
        },
        {
            "id": _new_id("proj"),
            "title": "家事オペレーション",
            "label_key": "home",
        },
        {
            "id": _new_id("proj"),
            "title": "仕事ポートフォリオ",
            "label_key": "work",
        },
    ]

    projects = [
        Project(
            id=item["id"],
            user_id=user_id,
            title=item["title"],
            label_id=label_id_for(item["label_key"]),
            current_order_index=0,
        )
        for item in projects_data
    ]

    tasks: list[Task] = []

    def add_task(
        *,
        title: str,
        project_id: Optional[str],
        label_id: Optional[str],
        order_index: int,
        parent_task_id: Optional[str] = None,
        memo: Optional[str] = None,
        is_fixed: bool = False,
        is_group: bool = False,
    ) -> str:
        task_id = _new_id("task")
        tasks.append(
            Task(
                id=task_id,
                user_id=user_id,
                title=title,
                project_id=project_id,
                label_id=label_id,
                parent_task_id=parent_task_id,
                order_index=order_index,
                memo=memo,
                completed=False,
                completed_at=None,
                is_fixed=is_fixed,
                is_group=is_group,
            )
        )
        return task_id

    def add_project_tasks(project_id: str, default_label_id: Optional[str], roots: list[dict]) -> None:
        for idx, root in enumerate(roots):
            root_label_id = root.get("label_id", default_label_id)
            root_id = add_task(
                title=root["title"],
                project_id=project_id,
                label_id=root_label_id,
                order_index=idx,
                memo=root.get("memo"),
                is_fixed=root.get("is_fixed", False),
                is_group=root.get("is_group", False),
            )

            if root.get("is_group"):
                for c_idx, child in enumerate(root.get("children", [])):
                    add_task(
                        title=child["title"],
                        project_id=project_id,
                        label_id=child.get("label_id", root_label_id),
                        order_index=c_idx,
                        parent_task_id=root_id,
                        memo=child.get("memo"),
                        is_fixed=child.get("is_fixed", False),
                        is_group=child.get("is_group", False),
                    )

    project_map = {p["title"]: p for p in projects_data}

    add_project_tasks(
        project_map["卒制: Growth Road 開発"]["id"],
        label_id_for("dev"),
        [
            {
                "title": "MVPの範囲を決める",
                "memo": "3つの主要フローに絞る",
                "is_fixed": True,
            },
            {
                "title": "ユーザーインタビュー整理",
                "memo": "3名分のメモを要約",
            },
            {
                "title": "画面ワイヤー",
                "is_group": True,
                "children": [
                    {
                        "title": "ダッシュボード",
                    },
                    {
                        "title": "プロジェクトモーダル",
                    },
                    {
                        "title": "タスクタイムライン",
                    },
                ],
            },
            {
                "title": "API連携",
                "memo": "labels/projects/tasks",
            },
            {
                "title": "デモ練習",
                "memo": "5分で通し",
            },
        ],
    )

    add_project_tasks(
        project_map["資格勉強ロードマップ"]["id"],
        label_id_for("study"),
        [
            {
                "title": "試験の選定",
                "memo": "今週中に決める",
            },
            {
                "title": "週間学習計画",
                "is_group": True,
                "children": [
                    {
                        "title": "1週目: 基礎",
                    },
                    {
                        "title": "2週目: 過去問",
                    },
                ],
            },
            {
                "title": "暗記カード習慣",
                "memo": "1日20枚",
                "is_fixed": True,
            },
            {
                "title": "模試",
                "memo": "得点チェック",
            },
        ],
    )

    add_project_tasks(
        project_map["健康ルーティン改善"]["id"],
        label_id_for("health"),
        [
            {
                "title": "睡眠リズム整える",
                "memo": "23:30-7:00",
            },
            {
                "title": "食事準備スケジュール",
                "memo": "簡単メニュー3つ",
            },
            {
                "title": "運動メニュー",
                "is_group": True,
                "children": [
                    {
                        "title": "Day1 有酸素",
                    },
                    {
                        "title": "Day2 筋トレ",
                    },
                    {
                        "title": "Day3 ストレッチ",
                    },
                ],
            },
            {
                "title": "歩数目標",
                "memo": "7000歩",
            },
        ],
    )

    add_project_tasks(
        project_map["家事オペレーション"]["id"],
        label_id_for("home"),
        [
            {
                "title": "洗濯の自動化",
                "memo": "週末まとめ洗い",
            },
            {
                "title": "掃除チェックリスト",
                "is_group": True,
                "children": [
                    {
                        "title": "キッチン",
                    },
                    {
                        "title": "バスルーム",
                    },
                ],
            },
            {
                "title": "買い物リスト更新",
                "memo": "週1更新",
            },
            {
                "title": "ゴミ出しルール",
                "memo": "市のカレンダー",
                "is_fixed": True,
            },
        ],
    )

    add_project_tasks(
        project_map["仕事ポートフォリオ"]["id"],
        label_id_for("work"),
        [
            {
                "title": "ポートフォリオ構成",
                "memo": "事例2つ",
            },
            {
                "title": "履歴書更新",
                "memo": "成果を数値化",
                "is_fixed": True,
            },
            {
                "title": "面接準備",
                "is_group": True,
                "children": [
                    {
                        "title": "STAR整理",
                    },
                    {
                        "title": "システム設計",
                    },
                ],
            },
            {
                "title": "応募リスト",
                "memo": "5件",
            },
        ],
    )

    solo_tasks = [
        {
            "title": "インボックス整理",
            "label_key": "dev",
            "memo": "バックログ整頓",
        },
        {
            "title": "家計チェック",
            "label_key": "money",
            "memo": "月次表を更新",
        },
        {
            "title": "健康ログ",
            "label_key": "health",
            "memo": "睡眠/気分",
        },
        {
            "title": "サイドプロジェクト案",
            "label_key": "dev",
            "memo": "5案出す",
        },
        {
            "title": "10分片付け",
            "label_key": "home",
            "memo": "短時間掃除",
        },
    ]

    for idx, entry in enumerate(solo_tasks):
        add_task(
            title=entry["title"],
            project_id=None,
            label_id=label_id_for(entry.get("label_key")),
            order_index=idx,
            memo=entry.get("memo"),
            is_fixed=entry.get("is_fixed", False),
            is_group=False,
        )

    try:
        db.add_all(projects)
        db.add_all(tasks)
        db.commit()
    except Exception:
        db.rollback()
        raise
