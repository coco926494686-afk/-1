# Frame Skin · 免费 Figma 一键换肤

本地运行的 TypeScript Figma Design 插件。使用 Figma Plugin API 的 fills、strokes、effects 和文字区间 API 替换 RGB，不使用 Variables Modes，不请求网络，不需要额外付费服务。MIT 许可。

## 已实现

- 递归扫描所选 Frame 的纯色填充、描边、统一 / 混合文字颜色，以及投影、内阴影和噪点效果颜色。
- 源颜色 → 可编辑语义 Token → 主题颜色；手动映射、增加 / 改名 / 删除未使用 Token。
- 首次扫描自动生成 24 套可编辑预设；创建、复制、改名、删除和保存主题，最多 200 套。
- 一键应用当前主题。连续切换依赖本次扫描的原始颜色，避免颜色碰撞导致映射丢失。
- 页面顶层标准 Frame 批量复制，按“原名称 · 主题名”命名并排列在页面右侧。单批最多 40 套、100000 个图层；可分批生成。
- 原始 Frame 缩略图、精确的源色 → 目标色对照和示意卡片。预览不修改画布；**不是原 Frame 实时换色渲染**。
- 插件撤销（当前扫描会话最近 20 次操作）和 Figma 原生撤销；写入失败回滚。
- 带版本和完整校验的 JSON 导入 / 导出，包含 Token、映射和主题。
- 字体预加载、兼容性报告、外部编辑 / 切页 / 选择变化保护。
- 内置真实 Figma 测试 Frame：先验证替换与还原，再开放批量生成。

## 构建与开发

推荐 Node.js 22 或 24，npm 10+。已在 Node.js 24.19.0 / npm 11.9.0 验证。

```bash
npm ci
npm run check      # 类型检查 + 32 项自动化测试 + 构建
npm run dev        # 监听 src，修改后在 Figma 重新运行插件
```

`npm run build` 生成 `dist/code.js` 和内嵌 UI 脚本的 `dist/ui.html`，无需服务器。依赖和版本固定于 package-lock.json。

可选浏览器交互测试（需要 Chromium）：

```bash
# Linux 默认 /usr/bin/chromium，其他系统通过 BROWSER_PATH 指定
BROWSER_PATH=/path/to/chromium npm run test:ui
```

该测试会启动本地 headless Chromium，生成 `artifacts/plugin-ui.png`。不访问 Figma，也不需要登录；它验证的是插件 iframe UI。

## v1.0.3：颜色读回校验兼容

修复 `JSON.stringify` 逐字比较将颜色 float32 精度和对象字段顺序差异误判为替换错误的问题。仅 RGB(A) 颜色通道使用 1e-6 容差（远低于一个 8 位色阶），Paint opacity、效果半径和其他非颜色值仍严格相等。每次写入后读取并校验宿主实际值，撤销和后续换肤使用该规范值；如果宿主没有真正接受替换，仍失败回滚，并显示图层、属性、预期和实际颜色。图层属性指纹排序对象字段，数值与结构仍严格比较。

新增 float32 宿主与真实测试 Frame 控制流程的回归：先通过测试 Frame 颜色替换和还原，再批量生成 20 个主题，确认原 Frame 不变。当前版本界面显示 v1.0.3。真实 Figma 中的结果仍需更新后确认；批量测试门槛保留。

## v1.0.2：原生桥接兼容与存储超时恢复

按照 Figma 官方 UI 消息接口读取 `event.data.pluginMessage`，取消对原生桥接窗口对象的错误来源限制。收到握手后立即返回连接状态；本地存储读取超过 2 秒时进入会话模式，保持扫描和换肤可用，不覆盖未知的原存储，提示通过 JSON 备份。先安装消息处理器，再注册可选事件监听，避免事件注册错误阻止主程序接收消息。

如果已删除旧插件，直接重新导入新版 manifest 即可。新版顶部显示 v1.0.2。该版本通过非父窗口消息、存储永久无响应、超时与重试自动化测试；真实宿主仍需要导入确认。

## v1.0.1：修复启动后所有按钮灰色

UI 安装消息监听后主动握手，避免初始化消息早于界面加载而丢失；兼容 Figma 原生消息的空来源与自身窗口来源；连接超时后自动重试并显示可操作的错误提示。更新时关闭插件，将新版文件覆盖到原 manifest 所在目录（特别是 dist/），再重新运行。界面顶部应显示 v1.0.1。

## 在 Figma 开发模式导入

1. 下载并解压交付 ZIP，保持 `manifest.json` 与 `dist/` 的相对位置。如果使用源码仓库，先运行 `npm ci && npm run build`。
2. 打开 **Figma 桌面客户端**，进入一个 Figma Design 设计文件。开发插件导入需要桌面客户端，不是 FigJam。
3. 在 Figma 主菜单选择 **Plugins → Development → Import plugin from manifest…**（插件 → 开发 → 从 manifest 导入）。不同语言版本的菜单文字可能不同；也可搜索“Import plugin from manifest”。
4. 选择解压目录根部的 `manifest.json`。
5. 从 **Plugins → Development → Frame Skin · 免费一键换肤** 运行。
6. 如果你的客户端要求使用分配的插件 ID：在 **Development → New plugin** 创建一个本地插件，复制 Figma 生成的 manifest 中的 `id` 到本项目 manifest，再导入。保留本项目的 `main`、`ui`、`api`、`documentAccess` 和 `networkAccess` 配置。开发导入不等于发布到社区。

ZIP 已包含构建产物，使用插件不必先安装 Node.js。源代码、测试和构建脚本也一并提供。

## 第一次使用：先验证，再批量

1. 建议在一个测试设计文件运行插件。
2. 点击顶部 **测试 Frame 验证** 并确认。插件只在当前页面新建专用测试 Frame，包含：填充透明度、图层透明度、描边、阴影 alpha、混合颜色 / 字重文字、圆角、Auto Layout、渐变和锁定层。
3. 插件实际扫描测试 Frame，应用测试主题，逐属性比较颜色结果，再撤销并比较完整属性指纹。通过后留下已还原的测试 Frame，状态栏显示验证结果。本次插件会话才会开放批量功能；关闭插件后需重新验证。
4. 选择自己的标准 Frame，再点击 **扫描当前 Frame**。组件母版 / 实例及其内部 Frame 不可作为修改目标。
5. 在主题列表选择一套主题；编辑语义名称与主题色。在 **Token 映射** 手动调整每个源色的对应关系。
6. 检查右侧颜色对照及兼容性报告。**应用当前主题** 会修改当前 Frame；这是有意的就地换肤操作。如果要保留原始母版，请直接使用批量生成副本。
7. 勾选所需主题，点击 **生成主题 Frame**。标准 Frame 必须是当前页面的直接子级，插件不会将其移出原来的容器。源 Frame 不变，副本在当前页右侧生成。
8. 点击 **保存主题库** 保存编辑；应用和扫描也会保存当前主题。建议及时 **导出 JSON** 备份。

测试 Frame 会留在画布供人工查看，需要时可自行删除。批量生成不会自动清理测试 Frame。

## 安全与兼容边界

| 情况 | 行为 |
| --- | --- |
| 普通 SOLID 填充 / 描边 | 替换 RGB，保留 opacity、blendMode、visible 及其他 Paint 字段 |
| 投影 / 内阴影 / 噪点（含双色） | 仅替换 RGB，保留 alpha、偏移、半径和其余效果字段 |
| 混合颜色文字 | 按原始 fills / fillStyleId 区间替换，先加载实际字体，不改内容、字重、字号或字体 |
| 渐变、图片、视频等非纯色 Paint | 保留并报告；同一数组中的可编辑纯色仍可替换 |
| 模糊等无颜色效果 | 完全保留 |
| 共享填充 / 描边 / 效果样式，带共享填充样式的文字区间 | 跳过对应属性，不分离、不修改共享样式 |
| 变量绑定 Paint / 效果 | 跳过绑定项并报告，不修改变量定义 |
| INSTANCE / COMPONENT / COMPONENT_SET | 整个子树跳过，保留组件、实例覆盖与组件内部样式 |
| 锁定节点 | 整个子树跳过；锁定祖先中的选中 Frame 直接拒绝 |
| 扫描后手动编辑、改选、切页 | 应用 / 批量 / 撤销前检查，要求重新扫描，不猜测旧映射 |
| 字体加载失败 | 整个操作停止，报告错误，不进行部分文字换色 |
| 批量中途失败 | 删除此次创建的副本，保留源 Frame |
| 对生成副本进行后续编辑 | 插件撤销在属性指纹发生变化时拒绝删除副本，使用 Figma 原生历史处理 |

换肤引擎写入列表只有 `fills`、`strokes`、`effects`、`setRangeFills`；不写位置、尺寸、圆角、透明度、字体、约束和 Auto Layout。批量操作只给**新副本**设置名称与位置。不使用 detachInstance、样式解绑、变量模式切换、页面遍历修改或组件母版修改 API。

扫描包括隐藏图层、隐藏 Paint 和透明纯色。颜色按 8 位 RGB `#RRGGBB` 合并，透明度单独保留；同一 RGB 的不同用途无法自动辨别，可在设计稿中区分源色，或者保持同一映射。预设 Token 语义由颜色和用途启发式推断，应由设计师检查。

对容量设置了保护：每次扫描最多 10000 图层、50000 颜色属性；每个主题库最多 1000 Token、2000 源色映射、200 主题；导入 JSON 最大 2 MB。不支持的输入会明确报错。

主题库保存在 `figma.clientStorage`，不是写入设计稿，也不是团队共享或自动云同步。导入仅替换编辑中的主题库，点击保存后持久化，不会立即改变画布；建议先导出原库。JSON 不包含图片、节点 ID 或账号信息。

## JSON 格式

仓库提供 `examples/themes.json`。所有主题必须包含所有 Token 的颜色，Token ID 唯一，映射目标必须存在。源色大小写会规范化。

```json
{
  "version": 1,
  "tokens": [{ "id": "accent", "name": "品牌 / 强调" }],
  "mappings": [{ "source": "#2563EB", "tokenId": "accent" }],
  "themes": [
    { "id": "ocean", "name": "海洋", "colors": { "accent": "#0284C7" } },
    { "id": "forest", "name": "森林", "colors": { "accent": "#16856B" } }
  ]
}
```

## 文件结构

```text
manifest.json         Figma 入口、权限与离线网络策略
src/code.ts           Figma 控制器、存储、自检、批量与撤销
src/engine.ts         扫描、安全过滤、替换计划和事务引擎
src/model.ts          语义 Token、24 预设、JSON 校验
src/ui.html           UI 结构与样式
src/ui.ts             编辑器、颜色预览、导入导出
scripts/build.mjs     构建 / 监听
scripts/test-ui.mjs   Chromium UI 测试
scripts/package.mjs   打包可导入的完整交付 ZIP（需 Python 3）
examples/themes.json  24 套主题 JSON 示例
tests/               内存 Figma host、引擎与控制器测试
dist/                生成的插件脚本与 UI
artifacts/            UI 截图与测试记录
```

## 验证结果与实际限制

详见 `artifacts/VALIDATION.md`。32 项测试使用可变内存 Frame 和 Figma API mock，运行实际生产引擎与打包控制器；覆盖颜色准确性、透明度、文字区间、样式跳过、JSON 校验、回滚、撤销、切页保护和 20 套批量生成。浏览器测试运行真实 UI 构建产物。

**云环境没有 Figma 桌面宿主，尚未在真实 Figma 文件内执行验证，也未发布到 Figma 社区。** 内存测试不能替代 Figma 宿主验收，因此插件强制先执行真实测试 Frame 验证；若你的字体或 API 环境拒绝修改，批量不会开放。自检通过后仍应先小批量检查自己的真实组件和样式。
