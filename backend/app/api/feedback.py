"""피드백 API — 사용자 응답 평가 수집 및 통계."""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_optional
from app.core.rate_limiter import FEEDBACK_RATE_LIMIT, limiter
from app.models.database import Feedback, User, get_db
from app.models.schemas import FeedbackCreate, FeedbackStats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", status_code=201)
@limiter.limit(FEEDBACK_RATE_LIMIT)
async def submit_feedback(
    request: Request,
    body: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    _user: User | None = Depends(get_current_user_optional),
) -> dict:
    """사용자 피드백을 저장한다."""
    feedback = Feedback(
        message_id=body.message_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(feedback)
    await db.commit()

    logger.info("피드백 저장: message_id=%s, rating=%s", body.message_id, body.rating)
    return {"id": feedback.id, "status": "saved"}


@router.get("/stats", response_model=FeedbackStats)
async def get_feedback_stats(
    db: AsyncSession = Depends(get_db),
) -> FeedbackStats:
    """피드백 통계를 반환한다."""
    # 전체 집계
    result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((Feedback.rating == "positive", 1), else_=0)).label("positive"),
            func.sum(case((Feedback.rating == "negative", 1), else_=0)).label("negative"),
        ).select_from(Feedback)
    )
    row = result.one()
    total = row.total or 0
    positive = row.positive or 0
    negative = row.negative or 0

    satisfaction_rate = positive / total if total > 0 else 0.0

    # 최근 7일 일별 통계
    seven_days_ago = datetime.now() - timedelta(days=7)
    # func.date()는 SQLite/PostgreSQL 모두 호환
    date_expr = func.date(Feedback.created_at)
    daily_result = await db.execute(
        select(
            date_expr.label("date"),
            func.count().label("count"),
            func.sum(case((Feedback.rating == "positive", 1), else_=0)).label("positive"),
            func.sum(case((Feedback.rating == "negative", 1), else_=0)).label("negative"),
        )
        .where(Feedback.created_at >= seven_days_ago)
        .group_by(date_expr)
        .order_by(date_expr)
    )

    recent_daily = [
        {
            "date": str(r.date),
            "count": r.count,
            "positive": r.positive or 0,
            "negative": r.negative or 0,
        }
        for r in daily_result.all()
    ]

    return FeedbackStats(
        total_feedbacks=total,
        positive_count=positive,
        negative_count=negative,
        satisfaction_rate=round(satisfaction_rate, 3),
        recent_daily=recent_daily,
    )
