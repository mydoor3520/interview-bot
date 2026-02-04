#!/bin/bash

# Interview Bot - 초기 설정 스크립트
# 이 스크립트는 개발 환경을 자동으로 설정합니다.

set -e  # 에러 발생 시 즉시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 헤더 출력
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Interview Bot - 초기 설정${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 단계 출력
print_step() {
    echo -e "${BLUE}[단계 $1]${NC} $2"
}

# 성공 메시지
print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

# 에러 메시지
print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 경고 메시지
print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 1. 필수 프로그램 확인
check_prerequisites() {
    print_step "1" "필수 프로그램 확인 중..."

    local all_ok=true

    # Docker 확인
    if command -v docker &> /dev/null; then
        print_success "Docker 설치됨 ($(docker --version | cut -d' ' -f3 | cut -d',' -f1))"
    else
        print_error "Docker가 설치되어 있지 않습니다"
        echo "   Docker 설치: https://docs.docker.com/get-docker/"
        all_ok=false
    fi

    # Docker Compose 확인
    if docker compose version &> /dev/null; then
        print_success "Docker Compose 설치됨 ($(docker compose version | cut -d' ' -f4))"
    else
        print_error "Docker Compose가 설치되어 있지 않습니다"
        echo "   Docker Compose 설치: https://docs.docker.com/compose/install/"
        all_ok=false
    fi

    # Node.js 확인
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_success "Node.js 설치됨 ($node_version)"

        # Node.js 버전 확인 (v18 이상 권장)
        local major_version=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$major_version" -lt 18 ]; then
            print_warning "Node.js 18 이상을 권장합니다 (현재: $node_version)"
        fi
    else
        print_error "Node.js가 설치되어 있지 않습니다"
        echo "   Node.js 설치: https://nodejs.org/"
        all_ok=false
    fi

    # npm 확인
    if command -v npm &> /dev/null; then
        print_success "npm 설치됨 ($(npm --version))"
    else
        print_error "npm이 설치되어 있지 않습니다"
        all_ok=false
    fi

    if [ "$all_ok" = false ]; then
        print_error "필수 프로그램이 누락되었습니다. 설치 후 다시 시도하세요."
        exit 1
    fi

    echo ""
}

# 2. .env.local 파일 생성
setup_env_file() {
    print_step "2" "환경 변수 파일 설정 중..."

    if [ -f ".env.local" ]; then
        print_warning ".env.local 파일이 이미 존재합니다"
        read -p "   덮어쓰시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_success ".env.local 파일을 유지합니다"
            echo ""
            return
        fi
    fi

    if [ ! -f ".env.example" ]; then
        print_error ".env.example 파일을 찾을 수 없습니다"
        exit 1
    fi

    cp .env.example .env.local
    print_success ".env.local 파일이 생성되었습니다"
    echo ""
}

# 3. 사용자 입력으로 중요 환경 변수 설정
configure_secrets() {
    print_step "3" "보안 설정 구성 중..."

    echo "중요: APP_PASSWORD와 JWT_SECRET을 설정해야 합니다."
    echo ""

    # APP_PASSWORD 입력
    read -p "APP_PASSWORD를 입력하세요 (기본값: changeme): " app_password
    if [ -z "$app_password" ]; then
        app_password="changeme"
    fi

    # JWT_SECRET 입력
    read -p "JWT_SECRET을 입력하세요 (기본값: 랜덤 생성): " jwt_secret
    if [ -z "$jwt_secret" ]; then
        # OpenSSL로 랜덤 시크릿 생성
        if command -v openssl &> /dev/null; then
            jwt_secret=$(openssl rand -hex 32)
            print_success "랜덤 JWT_SECRET이 생성되었습니다"
        else
            jwt_secret="dev-jwt-secret-change-in-production-$(date +%s)"
            print_warning "OpenSSL을 사용할 수 없어 기본값을 사용합니다"
        fi
    fi

    # .env.local 파일 업데이트
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^APP_PASSWORD=.*|APP_PASSWORD=$app_password|" .env.local
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" .env.local
    else
        # Linux
        sed -i "s|^APP_PASSWORD=.*|APP_PASSWORD=$app_password|" .env.local
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" .env.local
    fi

    print_success "환경 변수가 설정되었습니다"
    echo ""
}

# 4. PostgreSQL 시작
start_database() {
    print_step "4" "PostgreSQL 데이터베이스 시작 중..."

    # 기존 컨테이너 확인
    if docker ps -a | grep -q "interview-bot-db"; then
        print_warning "기존 데이터베이스 컨테이너를 발견했습니다"
        docker compose down db 2>/dev/null || true
    fi

    # db 서비스만 시작
    docker compose up -d db

    # 헬스체크 대기
    echo -n "   데이터베이스 준비 대기 중"
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T db pg_isready -U interview -d interview_bot &> /dev/null; then
            echo ""
            print_success "PostgreSQL이 준비되었습니다"
            break
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done

    if [ $attempt -eq $max_attempts ]; then
        echo ""
        print_error "데이터베이스 시작 시간 초과"
        exit 1
    fi

    echo ""
}

# 5. npm 의존성 설치
install_dependencies() {
    print_step "5" "npm 패키지 설치 중..."

    npm install
    print_success "npm 패키지가 설치되었습니다"
    echo ""
}

# 6. Prisma 설정
setup_prisma() {
    print_step "6" "Prisma 설정 중..."

    # Prisma Client 생성
    echo "   Prisma Client 생성 중..."
    npx prisma generate
    print_success "Prisma Client가 생성되었습니다"

    # 마이그레이션 적용
    echo "   데이터베이스 마이그레이션 적용 중..."
    npx prisma migrate deploy
    print_success "마이그레이션이 적용되었습니다"

    echo ""
}

# 7. 시드 데이터 생성
seed_database() {
    print_step "7" "시드 데이터 생성 중..."

    if [ -f "prisma/seed.ts" ]; then
        npx prisma db seed
        print_success "시드 데이터가 생성되었습니다"
    else
        print_warning "prisma/seed.ts 파일이 없어 시드를 건너뜁니다"
    fi

    echo ""
}

# 8. 성공 메시지 및 다음 단계 안내
print_completion() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  설정 완료!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "다음 단계:"
    echo ""
    echo "1. AI 프록시 확인:"
    echo -e "   ${YELLOW}./scripts/check-proxy.sh${NC}"
    echo "   (프록시가 실행 중이 아니면: npx claude-max-api-proxy)"
    echo ""
    echo "2. 개발 서버 시작:"
    echo -e "   ${YELLOW}npm run dev${NC}"
    echo "   접속: http://localhost:3000"
    echo ""
    echo "또는 Docker로 전체 스택 실행:"
    echo -e "   ${YELLOW}docker compose up${NC}"
    echo ""
    echo -e "${BLUE}환경 변수 (.env.local):${NC}"
    echo "   APP_PASSWORD: $app_password"
    echo "   JWT_SECRET: [설정됨]"
    echo "   DATABASE_URL: postgresql://interview:interview@localhost:5432/interview_bot"
    echo ""
}

# 메인 실행
main() {
    print_header
    check_prerequisites
    setup_env_file
    configure_secrets
    start_database
    install_dependencies
    setup_prisma
    seed_database
    print_completion
}

# 스크립트 실행
main
