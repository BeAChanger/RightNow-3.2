#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import json
from pathlib import Path
import sys
import io
import os
import whisper
import zhconv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
os.environ['PATH'] = r'D:\ffmpeg\bin' + os.pathsep + os.environ['PATH']

OUTPUT_DIR = Path("D:/blibili-songsong-video-ganhuo")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

bv_id = "BV1Hk4y187jF"
url = f"https://www.bilibili.com/video/{bv_id}"

print(f"处理视频: {bv_id}")

# 获取视频信息
cmd_info = ["yt-dlp", "--dump-json", "--skip-download", url]
result = subprocess.run(cmd_info, capture_output=True, text=True, encoding='utf-8')
info = json.loads(result.stdout)

title = info.get('title', 'Unknown')
print(f"  标题: {title}")

# 下载音频
audio_file = OUTPUT_DIR / f"{bv_id}.m4a"
cmd_audio = ["yt-dlp", "-f", "bestaudio", "-o", str(audio_file), url]
print(f"  下载音频...")
subprocess.run(cmd_audio, capture_output=True)

# Whisper转录
print(f"  使用Whisper转录...")
model_dir = Path("D:/whisper-models")
model_dir.mkdir(parents=True, exist_ok=True)
model = whisper.load_model("base", download_root=str(model_dir))
result = model.transcribe(str(audio_file), language="zh")
transcript = zhconv.convert(result["text"], 'zh-cn')

# 删除音频
audio_file.unlink()

# 生成markdown
safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_', '中', '文')).strip()[:50]
md_file = OUTPUT_DIR / f"{bv_id}_{safe_title}.md"

with open(md_file, 'w', encoding='utf-8') as f:
    f.write(f"# {title}\n\n")
    f.write(f"**BV号**: {bv_id}\n")
    f.write(f"**UP主**: {info.get('uploader', 'Unknown')}\n")
    f.write(f"**发布时间**: {info.get('upload_date', 'Unknown')}\n")
    f.write(f"**播放量**: {info.get('view_count', 0)}\n")
    f.write(f"**链接**: {url}\n\n")
    f.write(f"## 简介\n\n{info.get('description', '无')}\n\n")
    f.write(f"## 文字稿\n\n{transcript}\n")

print(f"  已保存: {md_file.name}")
