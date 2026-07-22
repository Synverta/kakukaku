# Kakukaku iOS

原生 SwiftUI 客户端，最低支持 iOS 17。

## 生成工程

在安装 Xcode 和 XcodeGen 的 macOS 上执行：

```bash
cd ios
xcodegen generate
open Kakukaku.xcodeproj
```

## API 地址

生产地址配置在 `Kakukaku/Resources/Info.plist` 的 `API_BASE_URL`：

```text
https://kakukaku.cn/api
```

使用模拟器连接本机后端时，可改为：

```text
http://127.0.0.1:6002/api
```

真机不能使用 `127.0.0.1` 访问开发电脑，应填写电脑的局域网 IP，并按需要配置 App Transport Security。

## 当前原生功能

- 数据库公开视频流、搜索和 AVKit 播放
- 共创项目、制作里程碑和数字权益展示
- 社区发现和社区概览
- JWT 登录及 Keychain 安全存储
- 创作者中心、订单和权益交付的网页入口

App Store 发布前需要补充正式 App Icon、隐私清单、隐私政策链接、账号注销入口和支付合规方案。
