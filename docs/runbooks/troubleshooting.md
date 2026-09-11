# Runbook — sdkwork-cloudrouter 故障排查（中文）

症状 → `bin/doctor.sh --environment <env>` 检查项 → 处置。

## 1. 实例不健康

```bash
bin/doctor.sh --environment staging          # 看 health / compose 检查项
bin/docker-deploy.sh status --environment staging
```

- `health FAIL`：`curl -fsS http://127.0.0.1:<管理端口>/healthz` 复现；看 logs 检查项的最近错误。

## 2. 端口未监听

```bash
bin/doctor.sh --environment staging          # ports 检查项给出期望端口
```

- 管理端口矩阵：dev 3950 / test 3951 / staging 3952 / demo 3954 / prod 3953。
- 被占用：换 env 文件里的 `SDKWORK_CLOUDROUTER_*_HOST_PORT` 后 `bin/docker-deploy.sh install` 重放。

## 3. 配置漂移 / 占位符密钥

```bash
bin/config.sh diff --environment staging
bin/config.sh validate --environment staging
bin/config.sh set --environment staging --key SDKWORK_DATABASE_PASSWORD --value '<真实值>'
```

## 4. 镜像漂移（跑的不是台账版本）

```bash
```

- 出现 drift 告警：`bin/docker-deploy.sh rollback --environment staging --to <台账版本>`。
