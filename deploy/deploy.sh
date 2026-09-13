#!/usr/bin/env bash
# NHN 서버에서 최신 코드를 반영할 때 수동으로 실행하는 배포 스크립트.
# (회사 네트워크에서 SSH로 서버 접속 후 실행 — 방화벽 정책상 CI/CD 자동배포 대신 수동 실행)
#
# 최초 1회 설정:
#   git clone <repo-url> acplatform && cd acplatform/app
#   cp .env.production.example .env.production   # 값 채워넣기
#   npm ci
#   npm run build
#   pm2 start ecosystem.config.js --env production
#   pm2 save
#
# 이후 업데이트할 때마다 이 스크립트를 app/ 안에서 실행:
#   bash ../deploy/deploy.sh

set -euo pipefail

echo "==> git pull"
git pull --ff-only

echo "==> npm ci"
npm ci

echo "==> next build"
npm run build

echo "==> pm2 reload (무중단 재시작)"
pm2 reload ecosystem.config.js --env production

echo "==> 완료. pm2 status / pm2 logs acplatform 로 상태 확인."
