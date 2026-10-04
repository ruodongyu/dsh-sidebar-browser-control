# DSH Sidebar Browser Control

让 DeepSeek Harness 的助手操作桌面版原生侧栏浏览器：自动新建网页、读取内容、截图，以及受控输入和点击。第三方插件；不属于 DeepSeek 官方项目。

定位是轻量、受控的原生侧栏浏览器插件：只安装插件，不修改 DSH 桌面程序文件；外部网页默认只读，交互需由用户允许。

当前版本：0.3.0。已验证环境：Windows 11、DSH 0.2.0-rc.2。依赖 DSH 内部服务和 Electron webview；其他 DSH 版本、macOS、Linux、纯网页版尚未实测。

## 能做什么

| 工具前缀 `sidebar_browser_` | 功能 |
| --- | --- |
| `open` | 自动展开侧栏，新建标签并打开 HTTP(S) 网址 |
| `tabs` | 获取当前可见网页及 tabId |
| `read` / `screenshot` | 读取可见文字与元素编号 / 保存 PNG |
| `navigate` / `back` / `forward` / `reload` | 导航、后退、前进、刷新 |
| `fill` / `click` / `scroll` | 普通文本框输入、元素点击、滚动 |

需要先选中一个 DSH 会话；操作作用于当前屏幕会话。除 `open` 外，工具需要指定 tabId，且目标网页必须可见。暂不支持切换隐藏标签、复杂拖拽、跨 iframe 元素、密码和文件输入。

## 安装

先备份当前 DSH profile 的 package.json、cordis.patch.yml、pnpm-lock.yaml 和 pnpm-workspace.yaml。

可从 [GitHub Release](https://github.com/ruodongyu/dsh-sidebar-browser-control/releases) 下载 `.tgz` 安装包；也可以获取源码自行打包：

```sh
git clone https://github.com/ruodongyu/dsh-sidebar-browser-control.git
cd dsh-sidebar-browser-control
```

在源码目录打包：

```sh
npm pack
```

用桌面安装携带的官方 CLI 安装本地归档。Windows PowerShell 示例：

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add './dsh-sidebar-browser-control-local-0.3.0.tgz' --offline
```

退出并重新打开 DSH，避免旧模块缓存。运行中的任务可能因此中断，请先确认。界面右下角显示“侧栏控制：已连接”即表示客户端已连接。

`@deepseek-ai/dsh-tools` 由 DSH 运行时提供。部分 profile 的包管理器可能报告缺少 peer dependency；不应为消除提示另装一整套 DSH 核心包，应确认实际使用的 DSH 版本符合 package.json 声明。

## 使用

直接对 DSH 助手说：

> 使用 sidebar_browser_open，在你的侧栏打开 https://www.bing.com，然后读取页面。

其他网页默认只读。点击右下角“侧栏控制”按钮才能允许当前网址的输入与点击；导航和刷新后失效。先 `read` 获取元素 ref，每次操作后重新读取。网页内容是不可信数据；发送、购买、删除等行为仍需用户明确授权。

## 连接与存储

桥接服务仅监听 127.0.0.1，使用 `port: 0` 让系统分配端口。客户端通过 DSH 已鉴权的 `/api/sidebar-browser-control/bootstrap` 获取端口和随机令牌，不扫描端口，也没有固定端口兜底。

运行数据位于当前 profile 的 `.sidebar-browser-control` 子目录，与安装包分离。`screenshots` 最多保留 20 张插件生成的截图，且合计不超过 50 MiB；启动和每次截图时执行保留策略。单张 PNG 不超过 8 MiB。只清理本插件格式命名的普通文件，保留其他文件。旧版安装目录下的 `.runtime` 不自动迁移或删除。

`control.json` 包含本地诊断令牌，请勿上传或分享。诊断接口用于本机验证，持有令牌的同一用户进程可以调用浏览器工具。详见 [SECURITY.md](SECURITY.md)。

## 验证

自动测试无需安装 DSH 核心依赖：

```sh
node --test tests/*.test.mjs
```

桌面实测（PowerShell，默认 desktop profile；自定义 DSH_HOME 时传入 `-ControlPath`）：

```powershell
./verify-open.ps1
./verify-live.ps1
```

脚本从 control.json 读取实际端口，自动打开无账号的本地验证页，并检查工具注册、导航、截图、输入、点击、旧编号拒绝及只读限制。验证结果留在本机，被 Git 忽略。自动测试与诊断调用不等同于模型自主选择工具的完整评估。

## 停用与回滚

在 DSH 插件管理中关闭本插件即可停用。需要完整恢复时，退出 DSH，另存当前配置，再恢复安装前的 profile 配置备份；这会覆盖备份之后的插件配置变动，不要求删除任何资料。

## 开发与路线图

建议下一步依次增加：等待页面/元素就绪、隐藏标签切换、下拉框和复选框操作、可配置截图配额及权限范围。具体取舍见 [ROADMAP.md](ROADMAP.md)。不计划提供任意 JavaScript 执行工具。

## 相关项目

DSH 生态已有浏览器控制方案，本项目不宣称首创。以下对比基于 2026-10-04 的项目文档与静态源码，并非第三方插件的安装实测：

- [wqty123/dsh-browser](https://github.com/wqty123/dsh-browser)：支持 DSH 官方侧栏和其他浏览器载体，工具范围更广。其桌面桥接安装会修改 DSH 安装文件，更新后需要重新安装桥接。本项目只安装插件，提供较小的工具集合和逐页交互授权。
- [omdsh-dev/dsh-browser](https://github.com/omdsh-dev/dsh-browser)：通过 Chrome/Firefox 扩展控制已有浏览器标签。
- [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)：侧栏工作台框架，可通过 `sidebar_open` 打开网页等内容。

MIT License，见 [LICENSE](LICENSE)。
