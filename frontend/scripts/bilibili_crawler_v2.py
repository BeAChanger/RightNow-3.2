#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
B站视频字幕爬取脚本 (使用yt-dlp)
"""

import subprocess
import json
import os
from pathlib import Path

# 配置
SPACE_URL = "https://space.bilibili.com/2078781964"
OUTPUT_DIR = Path("../data/bilibili-videos")

def get_video_list():
    """获取UP主的视频列表"""
    print("正在获取视频列表...")

    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-json",
        f"{SPACE_URL}/video"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        videos = []

        for line in result.stdout.strip().split('\n'):
            if line:
                try:
                    video = json.loads(line)
                    videos.append({
                        'id': video.get('id'),
                        'title': video.get('title'),
                        'url': video.get('url') or f"https://www.bilibili.com/video/{video.get('id')}"
                    })
                except:
                    pass

        return videos
    except Exception as e:
        print(f"获取视频列表失败: {e}")
        return []

def download_subtitle(video_url, video_id):
    """下载视频字幕"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        "yt-dlp",
        "--write-auto-sub",
        "--write-sub",
        "--sub-lang", "zh-Hans,zh-Hant,zh",
        "--skip-download",
        "--output", str(OUTPUT_DIR / f"{video_id}.%(ext)s"),
        video_url
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except:
        return False

def get_video_info(video_url):
    """获取视频详细信息"""
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--skip-download",
        video_url
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        return json.loads(result.stdout)
    except:
        return None

def convert_to_markdown(video_info, video_id):
    """转换为markdown格式"""
    subtitle_files = list(OUTPUT_DIR.glob(f"{video_id}*.vtt")) + list(OUTPUT_DIR.glob(f"{video_id}*.srt"))

    md_content = f"# {video_info.get('title', 'Unknown')}\n\n"
    md_content += f"**BV号**: {video_id}\n"
    md_content += f"**UP主**: {video_info.get('uploader', 'Unknown')}\n"
    md_content += f"**发布时间**: {video_info.get('upload_date', 'Unknown')}\n"
    md_content += f"**播放量**: {video_info.get('view_count', 0)}\n"
    md_content += f"**链接**: https://www.bilibili.com/video/{video_id}\n\n"
    md_content += f"## 视频简介\n\n{video_info.get('description', '无')}\n\n"
    md_content += f"## 文字稿\n\n"

    if subtitle_files:
        with open(subtitle_files[0], 'r', encoding='utf-8') as f:
            content = f.read()
            # 简单清理VTT/SRT格式
            lines = [line for line in content.split('\n') if line and not line.startswith('WEBVTT') and '-->' not in line and not line.isdigit()]
            md_content += '\n\n'.join(lines)
    else:
        md_content += "（该视频暂无字幕）\n"

    # 保存markdown
    safe_title = "".join(c for c in video_info.get('title', video_id) if c.isalnum() or c in (' ', '-', '_')).strip()
    md_file = OUTPUT_DIR / f"{video_id}_{safe_title}.md"

    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(md_content)

    print(f"✓ 已保存: {md_file.name}")

def main():
    print(f"开始爬取B站UP主视频...")
    print(f"输出目录: {OUTPUT_DIR.absolute()}\n")

    # 获取视频列表
    videos = get_video_list()

    if not videos:
        print("未获取到视频，尝试手动指定视频...")
        # 如果自动获取失败，可以手动添加视频BV号
        videos = []

    print(f"共找到 {len(videos)} 个视频\n")

    # 处理每个视频
    for i, video in enumerate(videos[:11], 1):  # 只处理前11个
        print(f"[{i}/11] 处理: {video['title']}")

        # 获取详细信息
        info = get_video_info(video['url'])
        if not info:
            print(f"  ✗ 获取信息失败")
            continue

        # 下载字幕
        download_subtitle(video['url'], video['id'])

        # 转换为markdown
        convert_to_markdown(info, video['id'])

    print(f"\n✓ 完成！")

if __name__ == "__main__":
    main()
