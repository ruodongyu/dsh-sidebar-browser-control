# GitHub 发布与维护说明

仓库：[ruodongyu/dsh-sidebar-browser-control](https://github.com/ruodongyu/dsh-sidebar-browser-control)。初次发布使用 `v0.3.0`，标记为实验性。包名保留 `dsh-sidebar-browser-control-local`，以兼容已有本地安装；未来正式改名需要说明迁移方式。

## 已准备

- 源码、自动测试、Windows 实测脚本、README、MIT LICENSE、SECURITY、CHANGELOG、ROADMAP。
- `.gitignore` 排除运行数据、截图、令牌、备份、日志和打包归档。
- npm 的 `files` 清单限制包内容，避免整个工作目录进入安装包。
- GitHub Actions 配置 Windows/Linux 的 Node 20、22、24 单测；每次提交的实际执行状态以仓库 Actions 页面为准。

## 本地验证结果（2026-10-04）

环境：Windows 11、DSH 0.2.0-rc.2、Node 24.21.0，插件 0.3.0。

| 检查 | 可复现命令 / 方式 | 结果 |
| --- | --- | --- |
| 桥接鉴权、取消、超时、多个随机端口、截图保留策略 | `node --test tests/bridge.test.mjs tests/screenshot-store.test.mjs` | 9 项通过 |
| DSH 客户端获取随机端口 | 重启 DSH，检查右下角连接状态 | 已连接；本次端口为 18961 |
| 新建网页、读取、后退、前进、刷新 | `./verify-open.ps1` | 通过 |
| 输入、点击、截图、滚动、旧元素编号拒绝、未授权交互拒绝 | `./verify-live.ps1` | 通过 |
| 公布文件范围 | `git ls-files` / 安装包内容检查 | 未包含用户画像、聊天记录、令牌或运行截图 |

桌面实测通过本地诊断入口调用已注册工具，并非模型自主决策测试。其他平台和 DSH 版本仍需验证。详细实测 JSON 保留在本机且被 Git 忽略。

## 发布前审阅

确认 README 里的产品描述与适用版本，接受 MIT 的使用与再分发条款，确定仓库名称和维护者联系方式。没有声称这是 DeepSeek 官方插件，也没有把 AI 辅助开发描述为用户独立完成的学习成果。

查看 `git diff --cached` 和 `git status --short`，只应包含本仓库的源码与文档。不要在个人 DSH 工作区整体运行 `git add .`。不要上传 `.dsh`、AGENTS.md、用户画像、聊天记录、profile 配置备份、control.json、私人截图或凭据。

若开发目录由另一个本机账号创建而触发 Git 的 `dubious ownership` 提示，先确认目录来源，再按需使用单次 `safe.directory` 参数。不要信任所有目录。普通用户自己克隆的仓库一般无需此设置。

## 发布步骤

1. 在 GitHub 创建公开空仓库，先不要额外创建 README。
2. 确认 Git 提交身份，再在本目录提交代码。
3. 使用 GitHub 给出的远程地址添加 origin，推送 main。
4. 确认 Actions 通过后创建 v0.3.0 Release，把本地打包得到的 tgz 作为附件。
5. 开启 private vulnerability reporting，或在 SECURITY.md 写入维护者认可的私密报告联系方式。

只发布本独立仓库内的公开源码与 `.tgz` Release 附件；不发布私人工作区资料。本项目暂不发布 npm 包。
