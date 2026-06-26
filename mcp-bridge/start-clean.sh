#!/bin/sh
set -eu

TARGET="/Users/yerinlee/figma/mcp-bridge/dist/index.js"

# Codex의 각 세션은 이 스크립트를 MCP stdio 서버로 실행합니다.
# 기존 프로세스를 강제 종료하면 다른 세션의 MCP transport가 닫히므로 여기서는 종료하지 않습니다.
exec node "$TARGET"
