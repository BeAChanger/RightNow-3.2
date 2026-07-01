#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import zipfile
from pathlib import Path
import sys

FFMPEG_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
INSTALL_DIR = Path("D:/ffmpeg")

print("开始下载 ffmpeg...")
print(f"下载地址: {FFMPEG_URL}")

# 下载
zip_path = Path("D:/ffmpeg.zip")
response = requests.get(FFMPEG_URL, stream=True)
total = int(response.headers.get('content-length', 0))

with open(zip_path, 'wb') as f:
    downloaded = 0
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)
        downloaded += len(chunk)
        percent = (downloaded / total) * 100 if total > 0 else 0
        print(f"\r下载进度: {percent:.1f}%", end='')

print("\n下载完成！")

# 解压
print("正在解压...")
INSTALL_DIR.mkdir(parents=True, exist_ok=True)

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall("D:/")

# 移动文件到正确位置
extracted_dir = Path("D:/ffmpeg-master-latest-win64-gpl")
if extracted_dir.exists():
    import shutil
    if INSTALL_DIR.exists():
        shutil.rmtree(INSTALL_DIR)
    shutil.move(str(extracted_dir), str(INSTALL_DIR))

# 清理
zip_path.unlink()

print(f"\n✓ ffmpeg 已安装到: {INSTALL_DIR}")
print(f"\n请手动添加到系统 PATH:")
print(f"  {INSTALL_DIR / 'bin'}")
print("\n或者重启终端后直接运行 bilibili_whisper.py（脚本会自动找到）")
