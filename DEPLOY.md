# 배포 가이드 (NHN Cloud 서버)

이 저장소의 실제 서비스 코드는 `app/` 디렉토리(Next.js 16 App Router)에 있다.
배포는 Docker 없이 **Node.js + PM2 + Nginx** 조합으로 진행한다.

> NHN 서버는 회사 방화벽 정책상 사내망(회사 컴퓨터)에서만 SSH 접속이 가능하다.
> 따라서 GitHub Actions를 통한 자동 배포는 구성하지 않고, 회사 컴퓨터에서 SSH로
> 접속해 아래 절차를 수동으로 실행하는 방식을 기본으로 한다.

## 0. 사전 준비물

- NHN Cloud 서버(Ubuntu 22.04 이상 권장), 회사 네트워크에서 SSH 접속 가능
- 도메인(선택) 또는 서버 공인 IP
- GitHub 저장소 접근 권한 (private repo라면 서버에 배포용 SSH 키 또는 PAT 등록 필요)
- Supabase 프로젝트, 토스페이먼츠 키, 나라장터/한전/한국도로공사 API 키 등 실제 운영용 값

## 1. 서버 기본 환경 설치 (최초 1회)

```bash
# Node.js 20 LTS (nvm 권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v   # v20.x 확인

# PM2 (전역 설치)
npm install -g pm2

# Nginx
sudo apt update
sudo apt install -y nginx

# git (이미 있다면 생략)
sudo apt install -y git
```

## 2. 코드 배포 (최초 1회)

```bash
cd ~
git clone <GITHUB_REPO_URL> acplatform
cd acplatform/app

# 운영용 환경변수 파일 생성
cp .env.production.example .env.production
nano .env.production   # 실제 Supabase/토스/발주처 API 키 값 채우기

npm ci
npm run build

# PM2로 기동
pm2 start ecosystem.config.js --env production
pm2 save          # 서버 재부팅 시에도 자동 기동되도록 저장
pm2 startup       # 안내되는 명령어를 그대로 한 번 더 실행 (systemd 등록)
```

정상 기동 확인:

```bash
pm2 status
pm2 logs acplatform --lines 50
curl -I http://127.0.0.1:3000
```

## 3. Nginx 리버스 프록시 + SSL

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/acplatform
sudo nano /etc/nginx/sites-available/acplatform   # server_name을 실제 도메인/IP로 수정
sudo ln -s /etc/nginx/sites-available/acplatform /etc/nginx/sites-enabled/acplatform
sudo nginx -t
sudo systemctl reload nginx
```

도메인이 있다면 Let's Encrypt로 SSL 적용:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.co.kr
```

## 4. 업데이트 배포 (코드 변경 시마다)

회사 네트워크에서 서버에 SSH 접속 후:

```bash
cd ~/acplatform/app
bash ../deploy/deploy.sh
```

`deploy/deploy.sh`는 `git pull` → `npm ci` → `next build` → `pm2 reload`(무중단 재시작)
순서로 진행한다.

## 5. 운영 참고사항

- **로그**: `pm2 logs acplatform`, 또는 `app/logs/out.log` / `app/logs/error.log`
- **재시작**: `pm2 restart acplatform`
- **환경변수 변경 후에는 반드시 재시작 필요**: `pm2 restart acplatform --update-env`
- **공고 자동 동기화**: `/api/admin/sync-announcements`는 관리자 화면의 "지금 동기화" 버튼
  또는 `SYNC_TRIGGER_SECRET`을 헤더에 실어 외부 스케줄러(cron)로 주기 호출하도록 구성 가능.
  서버에 직접 cron을 걸 경우:
  ```
  # crontab -e
  0 */6 * * * curl -s -X POST -H "Authorization: Bearer <SYNC_TRIGGER_SECRET>" http://127.0.0.1:3000/api/admin/sync-announcements
  ```
- **DB 스키마 최초 적용**: `app/scripts/apply-schema.mjs` (Supabase 프로젝트 연결 정보는 `.env.production` 사용)

## 6. GitHub 저장소로 푸시하기

새 저장소 URL이 정해지면 로컬 저장소에서:

```bash
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```
