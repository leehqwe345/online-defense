# Account storage / 계정 저장 운영 안내

## 저장되는 정보
- Google 계정 고유 ID, 닉네임, 대기실 캐릭터 카드
- 완료된 전투의 계정 ID, 모드, 난이도, 라운드, 처치 수, 시간
- 닉네임은 정규화 및 대소문자 무시 중복 검사 + DB UNIQUE 제약
- 카드 변경은 닉네임 필드를 덮어쓰지 않음
- 전투 전체 인원의 결과는 한 트랜잭션으로 저장, 동일 전투 재시도 중복 방지

Node.js 24 이상. 패키지 설치는 `pnpm install --frozen-lockfile` 또는 `npm install`.

## 로컬
`DATABASE_URL` 미설정이면 `data/accounts.sqlite` 사용. `DATA_DIR`로 경로 변경 가능.
처음 실행 시 같은 디렉터리의 profiles.json / rankings.json을 한 번 이전합니다.
원본은 삭제하지 않습니다. 파일 손상·닉네임 충돌은 조용히 버리지 않고 시작 실패로 알립니다.
테스트는 별도 임시 디렉터리를 사용합니다. .env와 data는 Git 제외 대상입니다.

## Render (사용자가 배포)
1. 운영용 Render PostgreSQL을 생성합니다. 게임 서비스와 같은 리전을 선택합니다.
2. 서비스 Environment에 DATABASE_URL = DB의 Internal Database URL을 설정합니다.
3. GOOGLE_CLIENT_ID 및 PUBLIC_ORIGIN=https://online-defense.onrender.com 설정은 유지합니다.
4. Node 24를 선택합니다. Build: `npm install`, Start: `npm start`.
5. 기존 운영 JSON이 있다면 **재배포 전에** Render Shell 등으로 별도 보관합니다.
6. 초기 DB에 이전할 profiles.json / rankings.json을 DATA_DIR에 준비하고 `node account-admin.mjs migrate` 실행 후 웹 서비스를 시작합니다.
   계정 파일을 공개 GitHub에 올리지 마세요. 로컬 테스트 계정과 운영 계정을 무작정 합치지 마세요.
7. 로그인 후 기존 닉네임·카드와 랭킹을 확인합니다.

Render에서는 DATABASE_URL이 없으면 시작하지 않습니다. DB 연결 실패 시 로컬 임시 파일로 자동 대체하지 않습니다.
DB 스키마 생성은 멱등 처리되며 기존 데이터 삭제 없이 시작 시 수행합니다.
Google 클라이언트 ID가 아니라 DB 연결 주소에는 암호가 있으므로 채팅/로그/GitHub에 공개하지 마세요.

## 백업 / 복원
- 로컬: `npm run db:backup` → data/backups/시각/accounts.sqlite (WAL을 포함한 일관된 SQLite 백업).
- 로컬 복원: 서버 종료 → 현재 DB 디렉터리를 별도 보관 → 빈 DATA_DIR에 백업 accounts.sqlite 배치 → 그 DATA_DIR로 실행.
  기존 accounts.sqlite-wal / -shm와 백업을 섞지 마세요.
- 다른 DB로 이전: `node account-admin.mjs export <빈 출력 폴더>` → 원본 ID를 유지한 JSON 생성.
  새 DB의 최초 시작 전에 JSON을 준비하고 migrate 실행. 이미 migration 마커가 있는 DB에는 자동 덮어쓰지 않습니다.
- PostgreSQL: Render의 백업/복원 또는 pg_dump/pg_restore로 별도 백업을 보관하세요.
  플랜의 보존 기간과 복구 정책은 Render 대시보드에서 확인해야 합니다.

## 범위와 제한
- 계정·완료 기록은 DB에서 유지됩니다. 로그인 세션·대기실·진행 중인 게임은 메모리 상태이므로 서버 재시작 시 재로그인/새 게임이 필요합니다.
- DB 장애 시 결과 저장은 5초 간격 재시도합니다. 그동안 서버 프로세스가 강제 종료되면 아직 저장되지 않은 결과는 복구되지 않을 수 있습니다.
- 게임 서버는 당분간 **단일 인스턴스**로 운영합니다. 공유 DB만 연결한다고 멀티 인스턴스 방 동기화가 되지 않습니다.
- 기존 랭킹 JSON에는 계정 ID가 없어 개인 소유자로 추측 연결하지 않습니다. 공개 랭킹은 보존합니다.
- 운영 PostgreSQL 연결 검증은 실제 DATABASE_URL 설정 후 별도로 필요합니다.

공식 참고: https://render.com/docs/postgresql-creating-connecting
