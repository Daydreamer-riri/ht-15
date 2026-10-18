# 小蓝语音服务

全部源代码仍在 hackathon-15。GitLab Pages 发布前端；`voice-server` 需要一个可执行 Node.js 的 HTTPS 服务。百炼 API Key 只授权模型调用，不能用于创建/部署阿里云函数。已部署函数：`hackathon-npc-voice`（北京）；`realtrip/public/npc/voice.json` 已配置公网 HTTPS 地址。默认最小实例 0、最大实例配额 1、Node.js 20 内置事件运行时的单实例并发 1。真实 HTTPS ASR/TTS 往返测试通过；微信/飞书麦克风还需真机验收。

## 当前链路

网页麦克风 → 16 kHz 单声道 PCM WAV → `/api/npc/transcribe` → `qwen3-asr-flash` → 已有 DeepSeek 对话 → `/api/npc/speak` → `qwen3-tts-flash`（Ethan）→ 网页媒体播放器播放。

`/walk-me/` 的对话改为同一网关的 `POST /api/npc/chat` → `qwen-plus` 原生联网搜索；`/walk/` 继续使用已有 DeepSeek 对话。ASR/TTS 接口不变。新接口复用服务端 `DASHSCOPE_API_KEY` 和 `DASHSCOPE_WORKSPACE_ID`，可通过 `NPC_CHAT_MODEL` 指定支持搜索的模型，默认 `qwen-plus`。前端只读取 `npc/voice.json`，不需要模型 Key。`GET /health` 的 `chatReady` 表示已配置凭据，实际模型权限需要调用 `/api/npc/chat` 验证。

聊天请求为 `{ "text": "上海明天天气？", "history": [] }`；返回 `{ "reply": "…", "searched": true, "searchedAt": "…", "sources": [{ "index": 1, "title": "…", "url": "…", "cited": true }] }`。系统提示由服务端生成，附北京时间；只接受最近 5 轮文字历史。使用百炼原生 text-generation API，`enable_search: true`、`enable_source: true`，显式实时问题与短追问设置 `forced_search: true`，其余问题由模型判断是否检索。没有可核实来源时明确无法确认，不退回旧模型知识冒充实时结果。网页仅展示服务商返回的 HTTP(S) 来源，引用标记不会朗读。检索时间不等于来源更新时间，网页搜索不保证秒级行情、库存或天气。

聊天最多 1200 字/条、64 KiB 请求，沿用网关 CORS、限流和并发上限，服务端 45 秒超时、前端 50 秒超时。取消或离开时停止等待，并丢弃迟到回答与来源。FC 事件运行时不能感知浏览器断开，上游调用可能运行到服务端超时。联网搜索和模型调用按阿里云现有账号规则计费，不新增独立搜索供应商。

官方参数：[百炼联网搜索](https://help.aliyun.com/zh/model-studio/web-search)。

云模式不依赖 SpeechRecognition。点击开始，再次点击或说完停顿约 1.35 秒后发送，最长 30 秒。录音结束立即释放麦克风；取消/离开/隐藏页面会停止录音和播放，并忽略迟到结果。录音走 AudioWorklet；不支持时使用 WebAudio ScriptProcessor。未获麦克风权限的 WebView 无法由云 ASR 绕过，需在微信/飞书系统权限中允许访问。实际 iOS、Android 微信/飞书需真机验证。

录音约 1.4 秒后开始请求文字预览，后续最多每 3 秒一次、同时只允许一个预览请求；它复用 WAV 识别接口，不是逐字流式识别，会增加少量 ASR 调用。预览失败不影响录音，停止时取消预览并以整段录音的最终识别为准。最终内容以“你说”字幕保留到本轮回答结束后 8 秒；开始下一轮、取消录音或离开时清除。预览永不触发对话提交。

首次靠近可先显示字幕，首次触摸解锁后才播放声音。播放器复用同一个 HTMLAudioElement，区分语音准备与实际播放，只有播放时间推进才进入说话动画；被拦截或卡住会显示重播提示。已生成的当前回复音频只缓存在页面内存中，点重播可直接启动，不必再等生成。全程没有聊天历史弹框。

## 本地运行

Node.js 20 或更新版本，无服务端 npm 依赖。

```sh
cp voice-server/.env.example .env.npc-voice.local
# 在本机编辑 .env.npc-voice.local 的 DASHSCOPE_API_KEY，不提交该文件
npm run dev:voice
npm run test:voice
```

`GET http://127.0.0.1:8849/health` 应显示 `ready: true`。本地测试时可把构建后的 `dist/walk/npc/voice.json` 临时设为 `{"gatewayUrl":"http://127.0.0.1:8849"}`，通过 8848 静态服务访问。不要提交这个本地 URL。

## 上传阿里云函数计算 FC 3.0

1. 运行 `npm run package:voice`，得到 `target/npc-voice-fc.zip`。包内只有 5 个 .mjs 源文件（包含 `chat-provider.mjs`），没有 Key 或录音。更新现有函数时上传此 ZIP 并部署代码，保留原有环境变量及触发器。
2. 打开 [函数计算控制台](https://fcnext.console.aliyun.com/)，选择华北 2（北京），创建**事件函数**，名称可用 `hackathon-npc-voice`。运行环境选 **Node.js 20**，代码上传选本地 ZIP，上传上一步的包。
3. 请求处理程序设为 **index.handler**；内存 512 MB、超时 60 秒，初期最大实例数 1、单实例并发 1（内置事件运行时）。开启公网访问以调用百炼。函数计算与模型调用分别按账号计费设置执行，不预设免费。
4. 环境变量：`DASHSCOPE_API_KEY` 填百炼 Key；`NPC_ALLOWED_ORIGINS` 填 `https://pages.release.ctripcorp.com`。其余变量可不填，默认使用已验证的北京接口。
5. 创建 HTTP 触发器，认证方式选**无需认证**，允许 **GET、POST、OPTIONS**，复制公网 **HTTPS** 地址。该地址用于活动演示，避免在日志里打印 event（录音/文本会在其中）。
6. 访问地址的 `/health`，确认 `ready: true`。把根地址（不含 `/health`）写入 `realtrip/public/npc/voice.json` 的 `gatewayUrl`；重建并提交 `dist/walk/`，由现有 Pages 流水线发布。
7. 在微信/飞书打开 NPC 链接，授权麦克风，测试开始/结束/静音/取消/退出、真实转写及朗读。iOS 首次播放必须由点击解锁。

FC 内置运行时的 HTTP 请求会转为事件；`fc.mjs` 正确解码二进制录音，响应以 base64 传回音频，并处理 CORS 预检。FC 平台自行添加跨域响应头，适配层会去掉应用层的同名头，避免重复 Allow-Origin 被浏览器拒绝；请求来源仍由应用层校验。独立 Node 服务保留自己的 CORS 响应头。也可用 `Dockerfile` 部署在已有公司 Node/容器平台，监听端口默认 9000：`docker build -f voice-server/Dockerfile -t hackathon-npc-voice .`。不要把环境文件 COPY 进镜像。

## 边界与验证

服务限制每源 IP 每分钟 60 次、单实例并发 4、ASR 录音约 30 秒、TTS 每次 600 字、请求 45 秒。限流在内存中，多实例不共享；反向代理环境可能把多个用户合并为同一源 IP。CORS 仅限制浏览器来源，不代替身份认证；活动规模扩大时应在部署平台补充认证/全局配额。服务不保存录音和文本，不输出 Key/请求正文到日志。百炼的音频生成服务会提供临时下载文件；其数据政策由云服务约定。

`test:voice` 覆盖 HTTP/CORS、格式校验、并发与限流、FC 二进制适配、模型格式、错误脱敏。`test:walk` 覆盖 PCM 编码、录音权限/取消、迟到响应、播放取消、巡游碰撞及原场景回归。

官方参考：[ASR](https://help.aliyun.com/zh/model-studio/qwen-asr-api-reference)、[TTS](https://help.aliyun.com/zh/model-studio/qwen-tts-api)、[FC HTTP 事件格式](https://help.aliyun.com/zh/functioncompute/http-trigger-invoking-function)、[Node.js Handler](https://help.aliyun.com/zh/functioncompute/request-handlers)。
