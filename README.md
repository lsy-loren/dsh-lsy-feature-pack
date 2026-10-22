# dsh-lsy-feature-pack

界面功能增强：支持会话删除、支持图片皮肤。

一个 DeepSeek Harness（dsh）插件包（bundle），装上后：

- **会话删除**：在左侧会话的「…」菜单里多出「删除会话」。确认后会先停掉正在运行的会话，再删除会话日志目录，并连带删除它派生的子智能体会话。
- **图片皮肤**：设置 → 通用设置 里多出「图片皮肤」。可以用本地图片做界面背景，调节透明度、缩放（50%–300%）、左右/上下翻转，并直接在预览里拖动区域框，决定图片只显示在窗口的哪一块（默认整个窗口）。

## 安装

```sh
# 直接从 GitHub 安装（把 <owner> 换成仓库所有者）
dsh plugin --profile <你的 profile> add github:<owner>/dsh-lsy-feature-pack

# 或者先克隆，再按本地目录安装
git clone https://github.com/<owner>/dsh-lsy-feature-pack
dsh plugin --profile <你的 profile> add ./dsh-lsy-feature-pack
```

纯 JavaScript 包，没有构建步骤，安装时不需要授权任何构建脚本。装好后 dsh 会自动激活本包的 patch 层，**不需要**手动编辑 profile 的 `cordis.patch.yml`。

卸载：

```sh
dsh plugin --profile <你的 profile> remove dsh-lsy-feature-pack
```

## 使用

### 删除会话

左侧会话列表 → 会话行的「…」→「删除会话」→ 确认。

- 会话正在运行时，会先停止它再删除。
- 会一并删除该会话派生的子智能体会话，确认框里会写明将删除几个。
- 删除是**永久**的，不走回收站。

### 图片皮肤

设置 → 通用设置 → 图片皮肤。

| 操作 | 说明 |
|---|---|
| 选择图片 | 支持 PNG / JPG / WebP 等，上限 20 MB；图片存在浏览器 IndexedDB 里 |
| 透明度 | 0%–100%，图片会按皮肤底色渐隐 |
| 缩放 | 50%–300%，100% = 刚好铺满显示区域 |
| 显示区域 | 预览就是整个窗口的缩略图，拖框内平移画面，拖框的边或角调整区域大小；下方「偏移」滑块可精确微调 |
| 左右 / 上下翻转 | 把翻转直接烘焙进图片，不改动整个页面 |
| 复位 | 回到整窗 + 100% + 居中 |

## 说明

- 删除功能依赖本包自带的 Host 路由（`/dsh-lsy-feature-pack/api`），dsh 本身没有公开的会话删除 API，所以这里直接删除会话的本地存储目录。
- 图片、透明度、缩放、显示区域、翻转状态都保存在浏览器本地（IndexedDB + localStorage），换浏览器或清缓存后会丢失。

## 兼容性

在 dsh `0.1.1-rc.2` 上开发和验证。插件使用 dsh 的 Client slot 机制（`sidebar.workspaces.session.menu.item`、`shell.overlay`、`settings.general.item`）和 `ctx.theme.overrideTokens`，dsh 若调整这些接口，可能需要跟进更新。

## License

[MIT](./LICENSE)
