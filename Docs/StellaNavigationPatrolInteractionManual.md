# StellaNavigation、StellaPatrol 与 StellaInteraction 手册整理记录

## 2026-11-24：新增导航、巡逻与场景交互三个模块

按用户要求，把父项目的 StellaNavigation、StellaPatrol 与 StellaInteraction 整理进手册。用户说明导航的避障后续可能改动或重构，不需要细致总结，因此“动态障碍与避让”一篇中的局部避让只列配置入口与当前限制，并在正文提示后续可能调整。内容以插件源码、项目配置、项目接入代码、示例地图与自动化测试为准，按“概览 → 快速上手 → 机制页 → 调试与排查”组织，不写移植或参考来源。

- 在 `lib/navigation.ts` 登记三个模块：`stellanavigation`（StellaNavigation · 导航，号段 100～109）、`stellapatrol`（StellaPatrol · 巡逻，110～119）、`stellainteraction`（StellaInteraction · 场景交互，120～129）。导航与巡逻排在 StellaCoordination 之后，场景交互排在 Input 之后。模块色是本次实现选择，选在已有模块较少使用的色相：导航青色 `#2f7686`／`#5cc8dc`、巡逻绿色 `#3f7a45`／`#7fcf86`、交互兰紫色 `#94508f`／`#dc8fd6`；文字色在白底上的对比度约为 5.2、5.1、5.5。
- 新增 21 篇文章：
  - StellaNavigation 9 篇：模块总览、快速上手、移动平台、导航连接、自动遍历通道、请求移动、动态障碍与避让、数据更新与扩展接口、调试与排查；
  - StellaPatrol 5 篇：模块总览、快速上手、区域与路线、移动与动作、调试与排查；
  - StellaInteraction 7 篇：模块总览、快速上手、选项模式与事件、候选与聚焦、输入与提示、现成目标、调试与排查。
- 术语按文章登记，新增 27 个，其中 StellaInteraction 与已有的 StellaNavigation、StellaPatrol 一样定义在“整体设计”。
- 项目介绍、整体设计（依赖图、功能领域表、插件列表）、维护说明（模块表与号段）、Input 的处理器表（补上 `Interact` 与 `Cursor`）、游戏框架的角色页和 StellaUtilityAI 的后端页补上入口与链接；`AGENTS.md` 同步网址前缀。
- 核对中发现：导航显示设置 `Boundary Edge Thickness` 在源码中的默认值为 2 像素，父项目插件说明中仍写作 1.5 像素；手册按源码写 2 像素。
- 三篇快速上手的搭建步骤按源码与示例整理，正文标明没有经过运行验证。本次没有新增截图或交互演示。

### 验证

- 内容校验通过：69 篇文章、239 个本站链接、111 个术语。
- 全部 48 处带锚点的站内链接，按 github-slugger 规则核对都能定位到小节。
- 69 项单元测试、全仓 Prettier 格式检查、Next.js 类型生成与 TypeScript 检查通过。
- 本地开发服务器中，新文章与整体设计中的五张图表（巡逻总览、区域与路线、交互总览时序图、导航总览、整体设计依赖图）全部绘制成功；StellaInteraction 的侧栏与上一篇／下一篇顺序符合预期。
- 没有运行 `/StarryManual` 静态构建与导出检查。

### 边界

正文中的类名、字段、默认值、菜单与按键按源码和项目配置核对；输入映射、示例资产的父类等通过资产中的引用核对。玩家角色扫描球的半径 300 cm 来自项目说明，资产中有 `SphereRadius` 覆盖与唯一的 300.0 浮点值，没有在编辑器中打开核对。没有在 UE 中重新运行导航、巡逻与交互功能，也没有按快速上手搭建资产。
