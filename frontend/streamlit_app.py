import os
from collections import Counter

import httpx
import pandas as pd
import plotly.express as px
import streamlit as st

API_BASE_URL = os.getenv("API_BASE_URL", "http://backend:8000/api/v1")
ANALYZE_ENDPOINT = f"{API_BASE_URL}/analysis/comments"

st.set_page_config(page_title="YouTube Comment Sentiment Analysis", layout="wide")
st.title("YouTube Comment Sentiment Analysis")
st.caption("Nhap URL video YouTube de phan tich sentiment comments.")

st.sidebar.header("Xac thuc API")
default_token = os.getenv("AUTH_ACCESS_TOKEN", "").strip()
jwt_token = st.sidebar.text_input(
    "JWT (Bearer)",
    value=default_token,
    type="password",
    help="Bat buoc: dang nhap qua POST /auth/login (Swagger / Next.js), dan token access_token vao day.",
)
youtube_url = st.text_input("YouTube URL", placeholder="https://www.youtube.com/watch?v=...")
analyze_clicked = st.button("Analyze", type="primary")


def build_distribution_chart(labels: list[str]):
    counts = Counter(labels)
    chart_df = pd.DataFrame(
        {
            "sentiment": ["positive", "neutral", "negative"],
            "count": [counts.get("positive", 0), counts.get("neutral", 0), counts.get("negative", 0)],
        }
    )
    fig = px.bar(
        chart_df,
        x="sentiment",
        y="count",
        color="sentiment",
        title="Sentiment Distribution",
        category_orders={"sentiment": ["positive", "neutral", "negative"]},
    )
    fig.update_layout(showlegend=False)
    return fig


if analyze_clicked:
    if not jwt_token.strip():
        st.error("Vui long nhap JWT (Bearer). Lay token tu POST /api/v1/auth/login.")
    elif not youtube_url.strip():
        st.error("Vui long nhap YouTube URL hop le.")
    else:
        payload = {"youtube_url": youtube_url.strip()}
        headers = {"Authorization": f"Bearer {jwt_token.strip()}"}
        try:
            with st.spinner("Dang trich xuat comments va phan tich sentiment..."):
                with httpx.Client(timeout=120.0) as client:
                    response = client.post(ANALYZE_ENDPOINT, json=payload, headers=headers)
        except httpx.RequestError:
            st.error("Khong the ket noi backend FastAPI. Vui long kiem tra API service.")
        else:
            if response.status_code != 200:
                detail = "Backend tra ve loi khong xac dinh."
                try:
                    detail = response.json().get("detail", detail)
                except ValueError:
                    detail = response.text or detail
                st.error(f"Phan tich that bai: {detail}")
            else:
                data = response.json()
                predictions = data.get("predictions", [])
                st.success(
                    f"Phan tich xong cho video_id={data.get('video_id', 'unknown')} | comments={len(predictions)}"
                )

                if not predictions:
                    st.warning("Khong co du lieu prediction de hien thi.")
                else:
                    result_df = pd.DataFrame(predictions)
                    if "sentiment" not in result_df.columns and "label" in result_df.columns:
                        result_df = result_df.rename(columns={"label": "sentiment"})

                    st.subheader("Sentiment Results")
                    st.dataframe(result_df, use_container_width=True)

                    if "sentiment" in result_df.columns:
                        st.subheader("Sentiment Distribution")
                        chart = build_distribution_chart(result_df["sentiment"].astype(str).tolist())
                        st.plotly_chart(chart, use_container_width=True)
                    else:
                        st.warning("Khong tim thay cot sentiment trong response de ve bieu do.")
