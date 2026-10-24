#!/bin/bash
# 千里江山·粒子山河 本地预览启动器（双击运行）
cd "$(dirname "$0")"
PORT=8899
if ! curl -s -o /dev/null "http://127.0.0.1:$PORT/site/index.html"; then
  python3 serve.py $PORT >/dev/null 2>&1 &
  sleep 1
fi
open "http://127.0.0.1:$PORT/site/index.html"
