#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
B站视频字幕爬取脚本
用途：提取好人松松的视频文字稿用于健身知识库
授权：已获得博主授权
"""

import requests
import json
import time
import os
from pathlib import Path
from urllib.parse import urlencode
import hashlib

# 配置
UID = "2078781964"  # 好人松松的UID
OUTPUT_DIR = Path("../data/bilibili-videos")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.bilibili.com"
}

def get_video_list(uid, page=1, page_size=30):
    """获取UP主的视频列表"""
    url = "https://api.bilibili.com/x/space/wbi/arc/search"
    params = {
        "mid": uid,
        "ps": page_size,
        "pn": page,
        "order": "pubdate"
    }

    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
        data = resp.json()

        if data["code"] == 0:
            videos = data["data"]["list"]["vlist"]
            return videos
        else:
            print(f"获取视频列表失败: {data.get('message', 'Unknown error')}")
            return []
    except Exception as e:
        print(f"请求失败: {e}")
        return []

def get_video_subtitle(bvid):
    """获取视频字幕"""
    # 先获取cid
    url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        data = resp.json()

        if data["code"] != 0:
            print(f"获取视频信息失败: {bvid}")
            return None

        cid = data["data"]["cid"]

        # 获取字幕列表
        subtitle_url = f"https://api.bilibili.com/x/player/v2?cid={cid}&bvid={bvid}"
        resp = requests.get(subtitle_url, headers=HEADERS, timeout=10)
        data = resp.json()

        if data["code"] != 0 or "subtitle" not in data["data"]:
            print(f"视频 {bvid} 没有字幕")
            return None

        subtitles = data["data"]["subtitle"].get("subtitles", [])
        if not subtitles:
            print(f"视频 {bvid} 字幕列表为空")
            return None

        # 下载第一个字幕（通常是中文）
        subtitle_info = subtitles[0]
        subtitle_data_url = "https:" + subtitle_info["subtitle_url"]

        resp = requests.get(subtitle_data_url, headers=HEADERS, timeout=10)
        subtitle_data = resp.json()

        # 提取字幕文本
        transcript = []
        for item in subtitle_data.get("body", []):
            transcript.append({
                "time": item["from"],
                "text": item["content"]
            })

        return transcript

    except Exception as e:
        print(f"获取字幕失败 {bvid}: {e}")
        return None

def save_video_data(video_info, transcript):
    """保存视频数据为markdown"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    bvid = video_info["bvid"]
    title = video_info["title"]

    # 清理文件名
    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
    filename = f"{bvid}_{safe_title}.md"
    filepath = OUTPUT_DIR / filename

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n\n")
        f.write(f"**BV号**: {bvid}\n")
        f.write(f"**发布时间**: {time.strftime('%Y-%m-%d', time.localtime(video_info['created']))}\n")
        f.write(f"**播放量**: {video_info['play']}\n")
        f.write(f"**链接**: https://www.bilibili.com/video/{bvid}\n\n")
        f.write(f"## 视频简介\n\n{video_info.get('description', '无')}\n\n")
        f.write(f"## 文字稿\n\n")

        if transcript:
            for item in transcript:
                f.write(f"{item['text']}\n\n")
        else:
            f.write("（该视频暂无字幕）\n")

    print(f"✓ 已保存: {filename}")

def main():
    print(f"开始爬取UP主 {UID} 的视频...")
    print(f"输出目录: {OUTPUT_DIR.absolute()}\n")

    # 获取视频列表
    videos = get_video_list(UID)

    if not videos:
        print("未获取到视频列表")
        return

    print(f"共找到 {len(videos)} 个视频\n")

    # 处理每个视频
    for i, video in enumerate(videos, 1):
        print(f"[{i}/{len(videos)}] 处理视频: {video['title']}")

        # 获取字幕
        transcript = get_video_subtitle(video["bvid"])

        # 保存数据
        save_video_data(video, transcript)

        # 延迟避免请求过快
        time.sleep(2)

    print(f"\n✓ 完成！共处理 {len(videos)} 个视频")
    print(f"文件保存在: {OUTPUT_DIR.absolute()}")

if __name__ == "__main__":
    main()
