#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import json
from pathlib import Path
import sys
import io

# 修复Windows控制台编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 配置
OUTPUT_DIR = Path("../data/bilibili-videos")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 手动指定视频BV号（需要从B站空间页面获取）
VIDEO_BVS = [
    "BV1794y1a7y4"  # 第一个测试视频
]

def download_video_info_and_subtitle(bv_id):
    """下载单个视频的信息和字幕"""
    url = f"https://www.bilibili.com/video/{bv_id}"

    print(f"处理视频: {bv_id}")

    # 获取视频信息
    cmd_info = ["yt-dlp", "--dump-json", "--skip-download", url]

    try:
        result = subprocess.run(cmd_info, capture_output=True, text=True, encoding='utf-8')
        info = json.loads(result.stdout)

        title = info.get('title', 'Unknown')
        print(f"  标题: {title}")

        # 下载字幕
        cmd_sub = [
            "yt-dlp",
            "--write-auto-sub",
            "--write-sub",
            "--sub-lang", "zh-Hans,zh-Hant,zh,en",
            "--skip-download",
            "--output", str(OUTPUT_DIR / f"{bv_id}"),
            url
        ]

        subprocess.run(cmd_sub, capture_output=True)

        # 查找字幕文件
        subtitle_files = list(OUTPUT_DIR.glob(f"{bv_id}*.vtt")) + \
                        list(OUTPUT_DIR.glob(f"{bv_id}*.srt")) + \
                        list(OUTPUT_DIR.glob(f"{bv_id}*.json"))

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
            f.write(f"## 文字稿\n\n")

            if subtitle_files:
                with open(subtitle_files[0], 'r', encoding='utf-8') as sf:
                    content = sf.read()
                    lines = [line.strip() for line in content.split('\n')
                            if line.strip() and not line.startswith('WEBVTT')
                            and '-->' not in line and not line.strip().isdigit()]
                    f.write('\n\n'.join(lines))
                print(f"  已提取字幕")
            else:
                f.write("(该视频暂无字幕)\n")
                print(f"  无字幕")

        print(f"  已保存: {md_file.name}\n")
        return True

    except Exception as e:
        print(f"  错误: {e}\n")
        return False

def main():
    print("B站视频字幕提取工具\n")
    print(f"输出目录: {OUTPUT_DIR.absolute()}\n")

    if not VIDEO_BVS:
        print("请先填充VIDEO_BVS列表（在脚本中添加BV号）")
        print("示例: VIDEO_BVS = ['BV1xx411c7mD', 'BV1yy411c7mE']")
        return

    success = 0
    for bv in VIDEO_BVS:
        if download_video_info_and_subtitle(bv):
            success += 1

    print(f"完成! 成功处理 {success}/{len(VIDEO_BVS)} 个视频")

if __name__ == "__main__":
    main()
