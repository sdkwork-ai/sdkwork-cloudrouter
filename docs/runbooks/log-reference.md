# Runbook — sdkwork-cloudrouter 日志参考（中文）

健康启动日志特征（RUST_LOG=info）：

```
[sdkwork-cloudrouter] ... listening on 0.0.0.0:3900
```

## 读取

```bash
bin/docker-deploy.sh logs --environment production --tail 200          # 有界读取（默认）
bin/docker-deploy.sh logs --environment production --follow            # 显式跟随
bin/docker-deploy.sh logs --environment production --export ./out      # 导出工单附件（脱敏）
```

## 常见失败签名

| 日志特征 | 含义 | 处置 |
| --- | --- | --- |
| `connection refused ... 5432` | 数据库不可达 | `bin/doctor.sh --environment <env>` 看 ports/config 检查项 |
| `password authentication failed` | env 口令漂移 | `bin/config.sh diff --environment <env>` 后修正 |
| 反复 `panic` + 容器重启 | 启动崩溃循环 | `bin/doctor.sh` 的 resources 检查 restart count；回滚版本 |
