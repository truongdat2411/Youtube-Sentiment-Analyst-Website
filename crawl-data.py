from googleapiclient.discovery import build
import pandas as pd
import re
import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

# ====== 1. NHẬP API KEY ======
API_KEY = os.getenv('YOUTUBE_API_KEY')
DATABASE_URI = os.getenv('DATABASE_URL')

# ====== 2. NHẬP LINK VIDEO ======
VIDEO_URL = input("Nhập link YouTube: ")

# ====== 3. TỰ ĐỘNG TRÍCH VIDEO ID ======
video_id = re.search(r"v=([^&]+)", VIDEO_URL)
if video_id:
    VIDEO_ID = video_id.group(1)
else:
    raise ValueError("Link không hợp lệ")

# ====== 4. SỐ COMMENT MUỐN LẤY ======
MAX_RESULTS = 1000

youtube = build('youtube', 'v3', developerKey=API_KEY)

comments = []

request = youtube.commentThreads().list(
    part="snippet",
    videoId=VIDEO_ID,
    maxResults=100,
    textFormat="plainText"
)

response = request.execute()

while request and len(comments) < MAX_RESULTS:
    for item in response['items']:
        comment = item['snippet']['topLevelComment']['snippet']
        
        comments.append({
            "comment_id": item['id'],
            "author": comment['authorDisplayName'],
            "comment": comment['textDisplay'],
            "like_count": comment['likeCount'],
            "published_at": comment['publishedAt']
        })

    if 'nextPageToken' in response:
        request = youtube.commentThreads().list(
            part="snippet",
            videoId=VIDEO_ID,
            pageToken=response['nextPageToken'],
            maxResults=100,
            textFormat="plainText"
        )
        response = request.execute()
    else:
        break

df = pd.DataFrame(comments)
print("Tổng comment:", len(df))

# ====== 5. LƯU VÀO CƠ SỞ DỮ LIỆU ======
print("\nĐang kết nối đến cơ sở dữ liệu...")
try:
    engine = create_engine(DATABASE_URI)
    
    print(f"Đang lưu {len(df)} comments vào PostgreSQL. Vui lòng đợi...")
    
    df.to_sql(name='comments', 
              con=engine, 
              if_exists='append', 
              index=False)
    
    print("Đã lưu toàn bộ dữ liệu thành công vào cơ sở dữ liệu!")

except Exception as e:
    print(f"Có lỗi xảy ra trong quá trình lưu: {e}")