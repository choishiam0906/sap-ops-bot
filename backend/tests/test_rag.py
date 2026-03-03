"""RAG 엔진 테스트 — 유틸리티 함수 및 벡터 검색 로직 검증."""

from app.core.rag_engine import _build_document_text, extract_tcodes_from_text


def test_build_document_text_full():
    """모든 필드가 포함된 문서 텍스트 생성."""
    text = _build_document_text(
        title="덤프 분석",
        category="오류분석",
        tcode="ST22",
        content="ABAP 런타임 에러를 분석합니다.",
        steps=["ST22 실행", "날짜 선택", "에러 확인"],
        warnings=["보존 기간 주의"],
        tags=["덤프", "디버깅"],
    )

    assert "제목: 덤프 분석" in text
    assert "카테고리: 오류분석" in text
    assert "T-code: ST22" in text
    assert "ABAP 런타임 에러" in text
    assert "1. ST22 실행" in text
    assert "보존 기간 주의" in text
    assert "덤프, 디버깅" in text


def test_build_document_text_minimal():
    """최소 필드만으로 문서 텍스트 생성."""
    text = _build_document_text(
        title="테스트",
        category="기타",
        tcode=None,
        content="내용",
        steps=[],
        warnings=[],
        tags=[],
    )

    assert "제목: 테스트" in text
    assert "T-code" not in text
    assert "실행 절차" not in text


def test_build_document_text_with_program():
    """프로그램명과 소스코드 유형이 포함된 문서 텍스트 생성."""
    text = _build_document_text(
        title="ZFIR0090 에러 분석",
        category="오류분석",
        tcode="SE38",
        content="ZFIR0090 프로그램의 런타임 에러를 분석합니다.",
        steps=["SE38에서 프로그램 열기", "디버깅 실행"],
        warnings=["운영계에서 직접 수정 금지"],
        tags=["ABAP", "디버깅"],
        program_name="ZFIR0090",
        source_type="source_code",
    )

    assert "프로그램명: ZFIR0090" in text
    assert "유형: 소스코드 분석" in text
    assert "T-code: SE38" in text


def test_build_document_text_guide_no_type_label():
    """guide 유형은 유형 레이블을 표시하지 않는다."""
    text = _build_document_text(
        title="일반 가이드",
        category="데이터분석",
        tcode=None,
        content="일반 내용",
        steps=[],
        warnings=[],
        tags=[],
        source_type="guide",
    )

    assert "유형:" not in text


def test_extract_tcodes_basic():
    """텍스트에서 SAP T-code를 정확히 추출."""
    text = "ST22로 덤프를 분석하고 SM21에서 시스템 로그를 확인하세요."
    tcodes = extract_tcodes_from_text(text)
    assert "ST22" in tcodes
    assert "SM21" in tcodes


def test_extract_tcodes_various_patterns():
    """다양한 패턴의 T-code 추출."""
    text = "SE38에서 프로그램을 실행하고, STMS로 전송합니다. SCU3도 확인하세요."
    tcodes = extract_tcodes_from_text(text)
    assert "SE38" in tcodes
    assert "STMS" in tcodes
    assert "SCU3" in tcodes


def test_extract_tcodes_no_duplicates():
    """중복 T-code 제거 확인."""
    text = "ST22를 실행합니다. ST22에서 결과를 확인합니다."
    tcodes = extract_tcodes_from_text(text)
    assert tcodes.count("ST22") == 1


def test_extract_tcodes_empty():
    """T-code가 없는 텍스트."""
    text = "일반적인 텍스트입니다."
    tcodes = extract_tcodes_from_text(text)
    assert tcodes == []
