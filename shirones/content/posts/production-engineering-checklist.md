---
title: 生产级项目常见工程问题清单
published: 2026-09-30
description: 从「能跑」到「可控、可恢复、可定位」的通用工程检查框架：15 个检查维度、15 问快速自检与一份上线前 Checklist。
tags: [后端, 工程实践, 稳定性]
category: 技术笔记
draft: false
---

> 从「能跑」到「可控、可恢复、可定位」的通用工程检查框架。
> 适用：Web 后端 / FastAPI / 异步任务 / RAG / Agent Workflow / 微服务 / 数据处理流程。

## 1. 为什么「主流程能跑」还不够

Demo 通常只覆盖 Happy Path：正常输入、正常依赖、正常网络、单用户、单次执行。但生产环境最常见的问题，恰恰来自异常路径与边界条件。

生产级工程的核心问题是：**当一切不按预期发生时，系统是否仍然可控、可恢复、可观测、可人工接管。**

```text
Happy Path → Validation → Idempotency → Concurrency → State Machine → Timeout
→ Retry → Partial Failure → Compensation → Recovery → Overload Protection
→ Security → Observability
```

## 2. 一张表看完：生产级工程的 15 个检查维度

| 维度 | 典型问题 | 常见手段 |
| --- | --- | --- |
| 输入边界 | 空值、非法格式、超长输入、越权参数 | Schema 校验、白名单、大小限制 |
| 幂等 | 重复提交、网络重试、MQ 重复消费 | Idempotency Key、唯一约束、业务唯一键 |
| 并发 | Lost Update、重复创建、状态覆盖 | 乐观锁、CAS、唯一索引、原子操作 |
| 状态机 | 非法跳转、重复推进、卡死 | 显式状态迁移、版本控制 |
| 超时 | 下游卡死、连接池被占满 | Connect/Read/Total Timeout |
| 重试 | 瞬时故障、429、部分 5xx | 指数退避、Jitter、最大次数、Retry Budget |
| 部分成功 | A 成功 B 失败 | 事务、Outbox、Saga、补偿 |
| 恢复 | 进程崩溃、Worker 重启 | Checkpoint、Lease、Heartbeat |
| 过载保护 | 突发流量、Retry Storm | 限流、并发上限、Backpressure、熔断 |
| 数据一致性 | 事务边界、缓存陈旧 | Transaction、Cache Invalidation |
| 资源管理 | 连接、文件句柄、线程泄漏 | finally/context manager、池化资源上限 |
| 安全 | 越权、注入、Secret 泄漏 | 鉴权、资源归属检查、沙箱、Secret Manager |
| 可观测性 | 出错却无法定位 | 日志、Trace、Metrics、Alert |
| 失败兜底 | 自动恢复仍失败 | DLQ、人工重试、人工补偿 |
| 发布与兼容 | 新版本出错、Schema 不兼容 | 灰度、Feature Flag、Rollback |

## 3. 输入与参数边界

所有外部输入都应默认不可信。

**常见问题：**

- 空值或缺失字段
- 非法类型、非法枚举值
- 超长文本、超大文件、超大请求体
- 数值越界
- 客户端传入不应由客户端控制的关键字段

**常见处理：** Schema 校验；长度和大小限制；白名单；关键字段服务端生成；统一错误码。

> **原则：** 不要假设调用方会「正确调用接口」。

## 4. 重复请求与幂等

重复执行在生产环境中非常常见：用户连点、HTTP Client 重试、网关重试、MQ 重复投递、Worker 重复消费都可能触发。

**常见问题：**

- 请求已经成功但响应丢失，客户端再次请求
- 同一消息被 MQ 投递多次
- 后台任务被调度两次

**常见处理：** 使用 Idempotency Key、数据库唯一索引、业务唯一键、请求去重表；对副作用操作保存执行结果。

> **原则：** Retry 之前，先问这个操作是不是幂等。

## 5. 并发竞争

单用户测试正常，不代表多人同时操作时正常。

**常见问题：**

- Check-Then-Act Race Condition
- Lost Update
- 重复创建
- 并发修改状态
- 库存、余额被重复扣减

**常见处理：** 优先使用数据库唯一约束、原子更新、乐观锁/version；确有需要再使用悲观锁或分布式锁。

> **原则：** 不要把「先查再改」默认当成原子操作。

## 6. 状态机

只要业务对象有多个状态，就应明确合法状态迁移。

**常见问题：**

- SUCCESS 再回到 RUNNING
- CANCELLED 后被写成 SUCCESS
- 多个请求同时推进状态
- 任务永久卡在 RUNNING

**常见处理：** 显式定义 ALLOWED_TRANSITIONS；状态更新最好带 version 或当前状态条件；为中间态设计超时与恢复机制。

> **原则：** 状态机应该显式存在，而不是散落在几十个 if 中。

## 7. Timeout

所有外部依赖都必须设置明确超时。

**常见问题：**

- HTTP/RPC
- 数据库和 Redis
- LLM / Tool / MCP
- 文件解析、对象存储
- 后台任务

**常见处理：** 区分 connect/read/write/total timeout；根据依赖特性设置不同阈值；超时后要有明确的状态落点。

> **原则：** Timeout 是系统资源边界，不只是用户体验问题。

## 8. Retry：什么时候重试，什么时候不要重试

重试只应该处理「有机会自行恢复」的瞬时故障。

**常见问题：**

- 可重试：网络抖动、连接重置、429、部分 5xx
- 不应重试：参数错误、认证失败、权限失败、业务校验错误

**常见处理：** 最大重试次数 + 指数退避 + Jitter；尊重 Retry-After；限制总重试预算；记录每次重试原因。

> **原则：** Retry 是额外负载，不是免费的容错。

## 9. Retry Amplification 与 Retry Storm

如果多层都自动重试，一次用户请求可能被成倍放大，尤其在下游已过载时造成级联故障。

**常见问题：**

- Frontend 重试 × Backend 重试 × SDK 重试
- 大量请求同时按固定间隔重试
- 服务刚恢复就被重试洪峰再次打挂

**常见处理：** 明确由哪一层负责重试；使用指数退避和随机抖动；设置 Retry Budget；必要时熔断。

> **原则：** 不要让每一层都默认「再试一下应该没问题」。

## 10. 部分成功与分布式一致性

最难处理的不是「全失败」，而是「做了一半失败」。

**常见问题：**

- 数据库写成功但消息没发出
- 外部 API 成功但本地状态更新失败
- 文件已上传但最终导出失败
- 扣额度成功但业务失败

**常见处理：** 单库内优先事务；跨系统考虑 Outbox、Saga、Eventual Consistency、补偿和 Checkpoint。

> **原则：** 每增加一个外部系统，都问一句：前面成功、这里失败怎么办？

## 11. 补偿机制

很多外部副作用无法真正 ROLLBACK，只能做业务补偿。

**常见问题：**

- 付款已成功但订单失败
- 云资源创建成功但本地落库失败
- 文件已上传但任务取消

**常见处理：** 补偿操作也应幂等、可重试、可审计；记录原操作与补偿的关联；识别不可逆步骤和 point of no return。

> **原则：** Compensation 本身也是一个 Workflow。

## 12. Checkpoint、Worker 崩溃与恢复

长任务不应因为一步失败就全部重跑。

**常见问题：**

- Agent Workflow 执行到第 4 步崩溃
- Worker 被重启
- 任务卡在 RUNNING 但实际无人执行

**常见处理：** 保存 current_step、step_status、step_result、retry_count、error；使用 Lease/Heartbeat/Visibility Timeout 识别失联任务。

> **原则：** RUNNING 不等于真的有人还在执行。

## 13. 下游异常、熔断与降级

任何远程依赖都要假设它迟早会失败。

**常见问题：**

- 429/500/502/503/504
- DNS Failure
- Connection Reset
- 响应变慢或格式变化

**常见处理：** Timeout + Retry + Circuit Breaker；必要时返回缓存、降级结果或关闭非关键功能。

> **原则：** 已明确失败的依赖，不要继续无限施压。

## 14. 限流、并发上限与 Backpressure

系统容量有限，正确行为不是「所有请求都接进来再一起崩」。

**常见问题：**

- QPS 突增
- LLM/文件转换任务无限并发
- Producer 远快于 Consumer
- 队列无限增长

**常见处理：** Token Bucket/Sliding Window；最大并发数；队列容量上限；Backpressure；负载过高时快速拒绝或降级。

> **原则：** 拒绝一部分请求，通常比所有请求一起失败更好。

## 15. 数据库事务与缓存一致性

事务与缓存是最常见的数据一致性来源。

**常见问题：**

- 事务范围过大导致长时间持锁
- 事务内调用慢外部 API
- 数据库更新后缓存仍是旧值
- 缓存雪崩、击穿、穿透

**常见处理：** 缩小事务边界；不要在事务中长时间等待外部服务；采用 Cache Aside、TTL 与明确的失效策略。

> **原则：** Transaction 解决数据库原子性，不解决所有分布式问题。

## 16. 资源泄漏与连接池耗尽

很多资源问题不是立刻出现，而是运行数小时或数天后才暴露。

**常见问题：**

- DB/Redis/HTTP Connection 未释放
- File Descriptor 泄漏
- 临时文件不清理
- 持有 DB 连接等待 LLM 60 秒

**常见处理：** 使用 context manager/finally；限制池大小；设置连接生命周期；慢外部调用不要长期占用稀缺资源。

> **原则：** 申请资源之后，无论成功还是异常，都必须有释放路径。

## 17. 安全边界

「已经登录」不等于「有权访问这个资源」。

**常见问题：**

- IDOR/越权访问
- 多租户数据串租户
- SQL/Command/Path/Prompt Injection
- Secret 写进源码或日志

**常见处理：** 资源归属检查；tenant_id 隔离；参数化查询；Tool 白名单与权限边界；Secret Manager；日志脱敏。

> **原则：** 权限检查必须落到资源级，而不只是身份级。

## 18. 可观测性：日志、Trace、Metrics、Alert

生产问题最怕「发生了，但不知道发生在哪里」。

**常见问题：**

- 只有 Something went wrong
- 多服务链路无法关联
- 不知道 P95/P99、错误率、队列深度
- 故障靠用户反馈才发现

**常见处理：** 结构化日志包含 request_id/trace_id/operation/duration/error_type；使用分布式 Trace；建设核心 Metrics 和阈值告警。

> **原则：** 日志回答「发生了什么」，Metrics 回答「系统整体怎么样」，Trace 回答「这次请求走过哪里」。

## 19. 失败任务、DLQ 与人工兜底

自动恢复一定存在上限，超过上限就需要让失败「停下来并可处理」。

**常见问题：**

- 任务无限重试
- 坏数据反复进入消费链
- 补偿也连续失败

**常见处理：** 最大重试次数后进入 Dead Letter / Failed Job；提供查看、修改、重试、跳过、补偿、取消等运维能力。

> **原则：** 生产系统必须允许失败任务停下来。

## 20. 时间、版本兼容与发布回滚

很多线上事故不是代码逻辑本身，而是时间、Schema 或发布策略造成。

**常见问题：**

- 时区/DST 错误
- 定时任务重复或漏执行
- 老客户端调用新接口
- 新代码与旧数据库不兼容
- 新版本上线即出错

**常见处理：** 数据库统一 UTC；API 版本化；Expand/Contract 式 Schema Migration；Canary/Blue-Green；Feature Flag；快速 Rollback。

> **原则：** 上线方案必须包含「出问题怎么退回去」。

## 21. 两个最值得记住的代码/设计模式

### 21.1 状态更新要带前置条件

```sql
UPDATE task
SET status = 'running', version = version + 1
WHERE id = ?
  AND status = 'pending'
  AND version = ?;
```

如果更新行数为 0，说明状态或版本已经被其他请求修改，不应该继续按旧假设执行。

### 21.2 幂等请求记录

```text
idempotency_key | request_hash | status | response | created_at
```

同一个 key 再次到来时，如果第一次已经成功则返回原结果；若请求内容与第一次不同，应拒绝复用该 key。

## 22. 生产级项目「15 问」快速检查

1. 输入为空、非法、超长、超大时会怎样？
2. 同一个请求执行两次会怎样？
3. 两个请求同时修改同一个资源会怎样？
4. 状态是否存在非法跳转或永久卡死？
5. 所有外部依赖是否有 timeout？
6. 哪些错误可以 retry，哪些绝对不该 retry？
7. retry 会不会重复产生副作用？
8. 执行一半失败后，前面成功的步骤怎么办？
9. 进程/Worker 在中间突然死掉怎么办？
10. 依赖服务连续失败时，会不会把自己拖死？
11. 流量突然扩大 10 倍时会怎样？
12. 队列积压速度大于消费速度时会怎样？
13. 数据库、缓存和外部系统之间如何保持一致？
14. 出了问题能否通过日志/Trace/Metrics 快速定位？
15. 自动恢复失败后，人工如何介入？

## 23. 上线前 Checklist

- [ ] 输入已做 Schema、长度、大小和枚举校验
- [ ] 核心写操作具备幂等性
- [ ] 数据库有业务唯一约束兜底
- [ ] 并发更新有 CAS/version/锁或原子操作保护
- [ ] 状态迁移规则显式定义
- [ ] 所有外部依赖都有 timeout
- [ ] Retry 只针对可恢复错误
- [ ] Retry 有最大次数、Backoff、Jitter 与总预算
- [ ] 避免多层 Retry Amplification
- [ ] 部分成功场景有明确处理方案
- [ ] 跨系统副作用有补偿或最终一致性策略
- [ ] 长任务支持 Checkpoint/Resume
- [ ] Worker 崩溃后可以重新领取或恢复任务
- [ ] 连续下游故障有 Circuit Breaker/降级
- [ ] 有单用户/全局限流
- [ ] 有最大并发数与队列容量上限
- [ ] 有 Backpressure 或快速拒绝策略
- [ ] Transaction 范围合理
- [ ] 缓存失效策略明确
- [ ] 连接、文件、线程等资源必然释放
- [ ] 不存在资源级越权与租户串数据
- [ ] Secret 不进入代码和日志
- [ ] 日志有 request_id/trace_id 与错误上下文
- [ ] 关键链路有 Trace、Metrics、Alert
- [ ] 失败任务有 DLQ/Failed Job 与人工操作入口
- [ ] 时间/时区策略明确
- [ ] 版本与数据库迁移兼容
- [ ] 发布支持灰度、Feature Flag 和快速回滚

## 24. 推荐参考文章与原始资料

下面这些资料适合作为本文的长期参考。优先选官方工程实践与架构文档。

1. [AWS Builders' Library — Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
   关于重复请求、幂等 API、如何让重试不产生额外副作用。
2. [AWS Builders' Library — Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
   关于超时、指数退避、Jitter 以及为什么重试会放大负载。
3. [Google SRE Book — Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
   关于级联故障、过载、Retry Amplification、随机指数退避和故障恢复。
4. [Google SRE Book — Handling Overload](https://sre.google/sre-book/handling-overload/)
   关于过载保护、请求拒绝、负载控制和容量边界。
5. [Google SRE Book — Production Services Best Practices](https://sre.google/sre-book/service-best-practices/)
   Google 生产服务实践清单，包含 backoff、过载、可靠性等。
6. [Microsoft Azure Architecture Center — Retry Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)
   关于哪些异常应该重试、重试策略、事务一致性与多层重试。
7. [Microsoft Azure Architecture Center — Circuit Breaker Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
   关于 Closed/Open/Half-Open 熔断状态机，以及 Retry 与 Circuit Breaker 的区别。
8. [Microsoft Azure Architecture Center — Compensating Transaction Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction)
   关于跨系统部分成功、补偿事务、不可逆步骤和补偿的可重试性。
9. [Microsoft Azure Architecture Center — Retry Storm Antipattern](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/retry-storm/)
   关于重试风暴、Retry-After、熔断与避免持续压垮下游。
10. [Microsoft Azure Architecture Center — Transient Fault Handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults)
    关于瞬时故障、Retry Budget、失败上限和下游持续异常。
11. [Stripe API Docs — Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
    一个非常直观的生产级 Idempotency Key 实际案例。

## 25. 最后：什么叫「生产级」

不要只问：**功能有没有实现？**

更应该问：**当重复、并发、超时、部分失败、服务重启、过载和依赖故障同时出现时，系统是否仍然可控、可恢复、可定位，并允许人工接管。**

真正的工程能力，很大一部分体现在异常路径，而不是 Happy Path。
