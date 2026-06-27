# Store API Credentials Runbook

이 문서는 App Store Connect/TestFlight와 Google Play Console 상태를 브라우저 세션 없이 `pnpm check:store-console-confirmation`으로 확인하기 위한 credential 설정 절차입니다.
여기에는 실제 키 값을 기록하지 않습니다. 모든 secret 파일은 git에서 무시되는 `.release-secrets/` 아래에만 둡니다.

## 원칙

- `APP_STORE_CONNECT_API_PRIVATE_KEY_PATH`와 `GOOGLE_APPLICATION_CREDENTIALS`는 파일 경로만 env에 넣습니다.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`는 긴 JSON 값이 env에 직접 들어가므로 되도록 사용하지 않습니다.
- `.release-secrets/`, `.env.local`, `.env.android-signing.local`은 커밋하지 않습니다.
- 새 키를 만든 뒤에는 `chmod 600`으로 로컬 파일 권한을 좁힙니다.
- 키 값, private key, service account JSON, access token, JWT는 터미널/문서/스크린샷에 출력하지 않습니다.

## 1. App Store Connect API 키

App Store Connect에서 운영자가 해야 할 일:

1. App Store Connect에 로그인합니다.
2. Users and Access 화면에서 Integrations 또는 API Keys 메뉴를 엽니다.
3. JipbabNote 앱 레코드와 TestFlight build를 읽을 수 있는 역할로 API key를 생성합니다.
4. Key ID, Issuer ID를 확인합니다.
5. `.p8` private key를 한 번만 다운로드합니다.
   - 주의: Sign in with Apple provider용 `.p8`와 App Store Connect API용 `.p8`는 용도가 다릅니다.
   - 이미 있는 `apple-auth-key-*.p8` 파일은 Apple 로그인용일 수 있으므로 TestFlight 확인 API 키로 재사용하지 않습니다.
   - App Store Connect API 키는 보통 `AuthKey_<KEY_ID>.p8` 형태로 내려받습니다.
6. 다운로드한 파일을 repo 밖에서 받은 뒤, 아래 경로로 옮깁니다.

```bash
mkdir -p .release-secrets
mv ~/Downloads/AuthKey_<KEY_ID>.p8 .release-secrets/AuthKey_<KEY_ID>.p8
chmod 600 .release-secrets/AuthKey_<KEY_ID>.p8
```

스토어 API 전용 값은 `.env.store-api.local`에 넣습니다. 이 파일은 `.env*` 패턴으로 git에서 무시되며, 일반 앱 실행용 `.env.local`과 분리되어 브라우저/스토어 확인 자동화만 담당합니다.

`.env.store-api.local`에는 값 자체가 아니라 아래처럼 경로와 식별자만 넣습니다.

```bash
APP_STORE_CONNECT_API_KEY_ID=<KEY_ID>
APP_STORE_CONNECT_API_ISSUER_ID=<ISSUER_ID>
APP_STORE_CONNECT_API_PRIVATE_KEY_PATH=.release-secrets/AuthKey_<KEY_ID>.p8
APP_STORE_CONNECT_BUNDLE_ID=com.jipbab.note
APP_STORE_CONNECT_BUILD_VERSION=2026060803
```

확인 명령:

```bash
pnpm release:store-api-credential-status
pnpm check:store-console-confirmation
```

이 명령은 App Store Connect API에서 bundle `com.jipbab.note`, 현재 iOS build `2026060803`, processed build state, internal TestFlight beta group 존재 여부를 확인합니다.
credential 값은 출력하지 않습니다.

## 2. Google Play Developer API 서비스 계정

Google Play Console에서 운영자가 해야 할 일:

1. Play Console 개발자 계정 본인 확인, Android 기기 접근 확인, 연락처 전화 인증을 완료합니다.
2. 패키지명 `com.jipbab.note` 앱을 생성합니다.
3. API access 화면에서 Google Cloud project를 연결합니다.
4. service account를 생성하고 Play Console에서 해당 service account에 앱/릴리즈 읽기 권한을 부여합니다.
5. JSON key를 다운로드합니다.
6. 다운로드한 파일을 repo 밖에서 받은 뒤, 아래 경로로 옮깁니다.

```bash
mkdir -p .release-secrets
mv ~/Downloads/<service-account>.json .release-secrets/google-play-service-account.json
chmod 600 .release-secrets/google-play-service-account.json
```

`.env.store-api.local`에는 JSON 원문 대신 파일 경로를 넣습니다.

```bash
GOOGLE_APPLICATION_CREDENTIALS=.release-secrets/google-play-service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.jipbab.note
GOOGLE_PLAY_VERSION_CODE=1
GOOGLE_PLAY_TRACK=internal
```

확인 명령:

```bash
pnpm release:store-api-credential-status
pnpm check:store-console-confirmation
```

`pnpm release:capture-store-console`을 먼저 실행하면 `output/release-evidence/<timestamp>-store-console/store-api-env-template.txt`에 `.env.store-api.local`용 placeholder 템플릿도 함께 생성됩니다. 실제 Key ID, Issuer ID, service account 경로를 채울 때 이 템플릿을 사용하고, private key 또는 JSON 원문은 넣지 않습니다.

이 명령은 Google Play Developer API에서 package `com.jipbab.note`, internal track, versionCode `1`이 포함된 non-draft release를 확인합니다.
temporary edit는 확인 후 삭제합니다.
credential 값은 출력하지 않습니다.

## 3. API credential 설정 후 검증 순서

```bash
pnpm release:store-api-credential-status
pnpm check:store-console-confirmation
pnpm release:external-status
pnpm release:goal-check
```

두 체크 스크립트는 `.env.local`, `.env.android-signing.local`, `.env.store-api.local`을 읽고, 같은 키가 여러 파일에 있으면 뒤쪽 파일 값이 우선합니다. 따라서 스토어 API credential은 `.env.store-api.local`에 두는 것을 기본값으로 삼습니다.

`pnpm check:store-console-confirmation`이 API로 통과하면 `docs/store-console-confirmation.md`를 억지로 `confirmed`로 바꿀 필요가 없습니다.
다만 App Store/Play Console 제출 증거를 사람이 보관하려면 `pnpm release:capture-external-evidence`로 화면/상태 캡처를 남긴 뒤 문서의 evidence artifacts에 경로를 추가합니다.

## 4. 실패 시 해석

- `credentials missing`: env 이름 또는 파일 경로가 비어 있습니다.
- `private key file is missing`: `APP_STORE_CONNECT_API_PRIVATE_KEY_PATH` 또는 `GOOGLE_APPLICATION_CREDENTIALS` 경로가 잘못됐습니다.
- `private key path is not ignored by git`: secret 파일 경로가 `.gitignore` 보호 밖에 있습니다.
- `private key file mode is readable by group/other`: `chmod 600`으로 파일 권한을 좁혀야 합니다.
- `private key filename does not include the configured App Store Connect key id`: 파일 이름과 Key ID가 맞는지 확인하고 Apple OAuth 키와 혼동하지 않았는지 봐야 합니다.
- `service account path is not ignored by git`: Google service-account JSON 경로가 `.gitignore` 보호 밖에 있습니다.
- `target build not found`: App Store Connect에 현재 iOS build `2026060803`이 없거나 다른 앱 레코드를 보고 있습니다.
- `target build is not processed`: TestFlight processing이 아직 끝나지 않았습니다.
- `no internal TestFlight beta group was found`: 내부 테스터 그룹 접근 설정이 필요합니다.
- `track internal does not include versionCode 1`: Play Console internal track에 현재 AAB가 올라가지 않았습니다.
- `track internal release is still draft`: internal testing release를 저장만 했고 배포 처리하지 않았습니다.

## 5. 보안 확인

아래 명령으로 secret이 repo에 들어가지 않았는지 확인합니다.

```bash
git status --short
git check-ignore -v .release-secrets/AuthKey_<KEY_ID>.p8
git check-ignore -v .release-secrets/google-play-service-account.json
```

`git status --short`에 `.release-secrets/`, `.env.local`, `.env.android-signing.local`, `.env.store-api.local`이 추적 파일로 나오면 안 됩니다.
