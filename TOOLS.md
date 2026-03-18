# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

---

## 🧪 测试技能配置

### API 测试

| 技能 | 用途 | 配置 |
|------|------|------|
| **api-tester** | 通用 API 测试、接口验证 | 默认配置 |
| **rest-api-tester** | REST API 测试、Swagger/OpenAPI 支持 | 需配置 API Base URL |

### UI 自动化（电脑端）

| 技能 | 用途 | 配置 |
|------|------|------|
| **windows-ui-automation** | Windows 桌面应用 UI 自动化 | 需安装 Windows UI Automation 库 |
| **ai-web-automation** | Web 浏览器自动化测试 (AI 驱动) | 需配置浏览器路径 (Chrome/Edge) |
| **web-browser-automation** | Web 浏览器自动化 (Apify 云平台) | 需 Apify API Token |
| **selenium-browser-skill** | Selenium WebDriver (Python) | 需 Python + Selenium + ChromeDriver |
| **puppeteer** | Puppeteer (Node.js Chrome 自动化) | 需 Node.js + Puppeteer |

### UI 自动化（手机端）

| 技能 | 用途 | 配置 |
|------|------|------|
| **mobile-appium-test** | Mobile Appium 测试 (iOS/Android) | 需安装 Appium Server + 驱动 |
| **android-adb** | Android ADB 连接与调试 | 需配置 ADB 路径和设备 ID |

### 本地环境配置

```bash
# ADB 路径 (Windows)
ADB_PATH: ${ANDROID_SDK_PATH}/platform-tools/adb.exe

# Appium Server
APPIUM_HOST: 127.0.0.1
APPIUM_PORT: 4723

# 浏览器路径
CHROME_PATH: C:\Program Files\Google\Chrome\Application\chrome.exe
EDGE_PATH: C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe

# Web 自动化配置
CHROMEDRIVER_PATH: ${CHROME_DRIVER_PATH}
NODE_PATH: ${NODE_PATH}

# Apify API Token (web-browser-automation)
AUTOMATION_TOKEN: your_apify_token_here
```

### 已连接设备

- **Android 设备：** 待配置 (使用 `adb devices` 查看)
- **iOS 设备：** 待配置 (需 Xcode + WebDriverAgent)

---

## ⚠️ 技能安装规则

**所有技能只安装到本地工作区：** `F:\teams\testzai\skills`

```bash
clawhub install <skill-name> --dir "F:\teams\testzai\skills"
```

不要使用默认路径（会装到全局 `C:\Users\joel_\.openclaw\workspace\skills\`）。

---

## ☁️ AgentBay 云桌面配置

**Access Key:** `your_agentbay_access_key_here`
**Access Secret:** `your_agentbay_access_secret_here`
**Region:** `cn-shanghai`

### 环境变量设置 (PowerShell)

```powershell
$env:AGENTBAY_ACCESS_KEY="your_access_key_here"
$env:AGENTBAY_ACCESS_SECRET="your_access_secret_here"
$env:AGENTBAY_REGION_ID="cn-shanghai"
```

### 测试连接

```bash
cd ${WORKSPACE}/skills/agentbay-connector
python test_connection.py
```
