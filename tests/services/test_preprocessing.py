from app.services.preprocessing_service import preprocess_comment


def test_preprocess_comment_pipeline() -> None:
    text = "XEM NGAY https://example.com 😍 Video này quá hay!!!"
    cleaned = preprocess_comment(text)

    assert "https://" not in cleaned
    assert "😍" not in cleaned
    assert cleaned == "xem ngay video nay qua hay"
