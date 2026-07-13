# 집밥노트 운영 오류 모니터링 채널 확인

Updated: 2026-07-13 KST

이 문서는 코드의 합성 webhook 전달 테스트와 실제 외부 모니터링 채널 수신을 분리합니다. 아래 항목은 모니터링 벤더와 운영 담당자가 확정되고, 현재 배포 SHA에서 보낸 테스트 경보를 실제 채널에서 확인한 뒤에만 `confirmed`로 바꿉니다.

- Operational alert delivery: blocked
- Monitoring vendor: pending
- Alert channel owner: pending
- Test alert received at: pending
- Deployment SHA: pending
- Monitoring evidence artifacts: pending

## 운영 설정

서버 전용 환경변수만 사용합니다. 값은 문서, 로그, Git, 브라우저 응답에 기록하지 않습니다.

```text
OPERATIONAL_ALERTS_ENABLED=true
OPERATIONAL_ALERT_WEBHOOK_URL=https://<approved-monitoring-receiver>/<path-without-query>
OPERATIONAL_ALERT_HMAC_SECRET=<32-to-256-character-secret>
```

수신기는 `X-Jipbab-Alert-Signature: sha256=<hex>`를 같은 secret으로 검증하고, `X-Jipbab-Alert-Version: 1`만 수락합니다. URL에는 사용자명, 비밀번호, query, fragment를 넣지 않습니다.

## 실제 수신 확인 절차

1. 운영 담당자와 개인정보 담당자가 벤더, 보관기간, 접근 권한, 삭제 절차를 승인한다.
2. Preview 또는 staging에 세 환경변수를 서버 전용으로 등록한다.
3. 현재 배포 SHA에서 의도적으로 만든 `INTERNAL_ERROR` 합성 요청 1건을 보낸다. 사용자 요청 본문, 계정, 이메일, 검색어는 사용하지 않는다.
4. 수신 채널에서 event, request ID, endpoint, status, latency, error code, deployment SHA만 존재하는지 확인한다.
5. secret, webhook URL, token, cookie, query, body, 이메일, 자유 입력이 없는지 확인한다.
6. 위 상태 필드를 `confirmed`, ISO 시각, 전체 deployment SHA, 접근 가능한 redacted 증거 경로 또는 URL로 갱신한다.
7. `pnpm release:goal-check`를 다시 실행한다.

## 현재 판정

- 로컬 payload·서명·실패 격리: 자동 테스트 대상
- 실제 외부 경보 채널 수신: `blocked_external`
- Production 활성화: 승인 전 금지
