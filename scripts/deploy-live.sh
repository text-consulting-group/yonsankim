#!/usr/bin/env bash

set -euo pipefail

CONFIG_PATH="${1:-config/_default/config.yml}"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "❌ 설정 파일을 찾을 수 없습니다: $CONFIG_PATH"
  exit 1
fi

ENABLED="$(python3 - "$CONFIG_PATH" <<'PY'
import re
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r"^\s*deploy:\s*$\n\s*production:\s*$\n\s*enabled:\s*(\w+)", text, re.MULTILINE)
if not m:
    print("false")
    sys.exit(0)

value = m.group(1).strip().lower()
print("true" if value == "true" else "false")
PY
)"

if [ "$ENABLED" != "true" ]; then
  echo "⚪ 실서버 배포 트리거가 꺼져 있어 배포를 실행하지 않습니다. (deploy.production.enabled=false)"
  exit 0
fi

echo "🟢 실서버 배포 트리거가 켜져 있습니다. 빌드 후 배포를 실행합니다."
PATH=./node_modules/.bin:$PATH hugo --minify
npx wrangler pages deploy public
