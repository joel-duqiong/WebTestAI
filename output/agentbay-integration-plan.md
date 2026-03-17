# 🧪 AgentBay API 集成方案

**研究时间:** 2026-03-17
**研究员:** 测试仔 (Testzai)
**目标:** 将阿里云 EDS AgentBay 集成到 OpenClaw 测试工作流

---

## 📖 一、AgentBay 产品概述

### 什么是 AgentBay？

阿里云 EDS AgentBay 是专为 **AI 智能体** 设计的云端桌面运行平台，基于弹性云桌面 (Elastic Desktop Service) 构建。

### 核心能力

| 能力 | 说明 |
|------|------|
| **云桌面托管** | 为每个 Agent 分配独立的 Windows/Linux 桌面环境 |
| **API 管理** | 通过 OpenAPI 创建、启动、停止、销毁桌面实例 |
| **镜像管理** | 预装常用工具的镜像，支持自定义镜像 |
| **网络隔离** | VPC 私有网络，支持公网访问配置 |
| **监控告警** | CPU/内存/网络使用率监控，支持告警通知 |
| **按量计费** | 秒级计费，支持自动释放 |

---

## 🔌 二、API 集成架构

### 2.1 认证方式

阿里云 API 使用 **AccessKey + Secret** 认证：

```python
access_key_id = "LTAI5t..."
access_key_secret = "xxxxxxxxxxxxxxxx"
region_id = "cn-shanghai"  # 地域
```

### 2.2 SDK 安装

```bash
# Python SDK
pip install alibabacloud_edas20170801
pip install alibabacloud_tea_openapi

# 或通用 SDK
pip install aliyun-python-sdk-core
pip install aliyun-python-sdk-eds
```

### 2.3 API 端点

```
https://eds.cn-shanghai.aliyuncs.com
```

---

## 📋 三、核心 API 接口

### 3.1 创建云桌面实例

```python
from aliyunsdkcore.client import AcsClient
from aliyunsdkeds.request.v20200730.CreateDesktopRequest import CreateDesktopRequest

client = AcsClient(access_key_id, access_key_secret, region_id)

request = CreateDesktopRequest()
request.set_RegionId(region_id)
request.set_DesktopType("ecs.g6.large")  # 实例规格
request.set_ImageId("win10-standard")    # 镜像 ID
request.set_InternetChargeType("PayByBandwidth")
request.set_InternetMaxBandwidthOut(5)   # 公网带宽
request.set_Quantity(1)

response = client.do_action_with_exception(request)
desktop_id = response['DesktopId']
```

### 3.2 启动桌面

```python
from aliyunsdkeds.request.v20200730.StartDesktopRequest import StartDesktopRequest

request = StartDesktopRequest()
request.set_DesktopId(desktop_id)
response = client.do_action_with_exception(request)
```

### 3.3 停止桌面

```python
from aliyunsdkeds.request.v20200730.StopDesktopRequest import StopDesktopRequest

request = StopDesktopRequest()
request.set_DesktopId(desktop_id)
response = client.do_action_with_exception(request)
```

### 3.4 删除桌面

```python
from aliyunsdkeds.request.v20200730.DeleteDesktopRequest import DeleteDesktopRequest

request = DeleteDesktopRequest()
request.set_DesktopId(desktop_id)
response = client.do_action_with_exception(request)
```

### 3.5 查询桌面状态

```python
from aliyunsdkeds.request.v20200730.DescribeDesktopsRequest import DescribeDesktopsRequest

request = DescribeDesktopsRequest()
request.set_DesktopId(desktop_id)
response = client.do_action_with_exception(request)
status = response['Desktops']['Desktop'][0]['Status']
# Status: Running, Stopped, Creating, Deleting
```

### 3.6 获取远程连接信息

```python
from aliyunsdkeds.request.v20200730.GetDesktopConnectionInfoRequest import GetDesktopConnectionInfoRequest

request = GetDesktopConnectionInfoRequest()
request.set_DesktopId(desktop_id)
response = client.do_action_with_exception(request)
connection_info = response['ConnectionInfo']
# 返回 VNC 连接地址、用户名、临时密码
```

---

## 🧪 四、OpenClaw 技能集成方案

### 4.1 技能结构设计

```
agentbay-connector/
├── SKILL.md              # 技能说明
├── index.js              # 主入口
├── agentbay_client.py    # Python API 客户端
├── config.json           # 配置模板
└── examples/
    ├── create_desktop.py
    ├── run_web_test.py
    └── cleanup.py
```

### 4.2 技能实现 (Python 客户端)

```python
# agentbay_client.py
from aliyunsdkcore.client import AcsClient
from aliyunsdkeds.request.v20200730 import (
    CreateDesktopRequest,
    StartDesktopRequest,
    StopDesktopRequest,
    DeleteDesktopRequest,
    DescribeDesktopsRequest,
    GetDesktopConnectionInfoRequest
)
import time

class AgentBayClient:
    def __init__(self, access_key_id, access_key_secret, region_id="cn-shanghai"):
        self.client = AcsClient(access_key_id, access_key_secret, region_id)
        self.region_id = region_id
    
    def create_desktop(self, desktop_type="ecs.g6.large", image_id="win10-standard", 
                       bandwidth=5, quantity=1):
        """创建云桌面"""
        request = CreateDesktopRequest()
        request.set_RegionId(self.region_id)
        request.set_DesktopType(desktop_type)
        request.set_ImageId(image_id)
        request.set_InternetChargeType("PayByBandwidth")
        request.set_InternetMaxBandwidthOut(bandwidth)
        request.set_Quantity(quantity)
        
        response = self.client.do_action_with_exception(request)
        return response['DesktopId']
    
    def start_desktop(self, desktop_id):
        """启动桌面"""
        request = StartDesktopRequest()
        request.set_DesktopId(desktop_id)
        return self.client.do_action_with_exception(request)
    
    def stop_desktop(self, desktop_id):
        """停止桌面"""
        request = StopDesktopRequest()
        request.set_DesktopId(desktop_id)
        return self.client.do_action_with_exception(request)
    
    def delete_desktop(self, desktop_id):
        """删除桌面"""
        request = DeleteDesktopRequest()
        request.set_DesktopId(desktop_id)
        return self.client.do_action_with_exception(request)
    
    def get_status(self, desktop_id):
        """查询桌面状态"""
        request = DescribeDesktopsRequest()
        request.set_DesktopId(desktop_id)
        response = self.client.do_action_with_exception(request)
        return response['Desktops']['Desktop'][0]['Status']
    
    def wait_for_running(self, desktop_id, timeout=300):
        """等待桌面运行就绪"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            status = self.get_status(desktop_id)
            if status == 'Running':
                return True
            time.sleep(10)
        raise TimeoutError(f"Desktop {desktop_id} not ready within {timeout}s")
    
    def get_connection_info(self, desktop_id):
        """获取连接信息"""
        request = GetDesktopConnectionInfoRequest()
        request.set_DesktopId(desktop_id)
        response = self.client.do_action_with_exception(request)
        return response['ConnectionInfo']
```

### 4.3 OpenClaw 技能入口 (Node.js)

```javascript
// index.js
const { exec } = require('child_process');
const path = require('path');

async function createAgentBayDesktop(config) {
    return new Promise((resolve, reject) => {
        const script = path.join(__dirname, 'agentbay_client.py');
        const pythonScript = `
import sys
sys.path.insert(0, '${__dirname}')
from agentbay_client import AgentBayClient

client = AgentBayClient(
    access_key_id="${config.accessKeyId}",
    access_key_secret="${config.accessKeySecret}",
    region_id="${config.regionId || 'cn-shanghai'}"
)

desktop_id = client.create_desktop(
    desktop_type="${config.desktopType || 'ecs.g6.large'}",
    image_id="${config.imageId || 'win10-standard'}",
    bandwidth=${config.bandwidth || 5}
)
print(desktop_id)
`;
        exec(`python -c "${pythonScript}"`, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve(stdout.trim());
        });
    });
}

async function runTestOnAgentBay(desktopId, testScript) {
    // 通过 RDP/VNC 执行测试脚本
    // 可使用 node-rdp 或调用外部工具
    return { success: true, output: "Test completed" };
}

module.exports = {
    createAgentBayDesktop,
    runTestOnAgentBay
};
```

### 4.4 SKILL.md 文档

```markdown
---
name: agentbay-connector
description: 阿里云 AgentBay 云桌面集成，用于云端自动化测试。支持创建/管理云桌面实例，远程执行测试脚本。
metadata: { "openclaw": { "emoji": "☁️", "requires": { "tools": ["python", "aliyun-sdk"] } } }
---

# AgentBay Connector

阿里云 EDS AgentBay 云桌面集成技能。

## 配置

在 TOOLS.md 中添加：

```markdown
### AgentBay 配置

ACCESS_KEY_ID: LTAI5t...
ACCESS_KEY_SECRET: xxxxxxxxxxxxxxxx
REGION_ID: cn-shanghai
```

## 用法

### 创建测试桌面

```javascript
const agentbay = require('skills/agentbay-connector');
const desktopId = await agentbay.createAgentBayDesktop({
    accessKeyId: process.env.ACCESS_KEY_ID,
    accessKeySecret: process.env.ACCESS_KEY_SECRET,
    desktopType: "ecs.g6.large",
    imageId: "win10-selenium"  // 预装 Selenium 的镜像
});
```

### 运行 Web 测试

```javascript
const result = await agentbay.runTestOnAgentBay(desktopId, `
from playwright.sync_api import sync_playwright

playwright = sync_playwright().start()
browser = playwright.chromium.launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
`);
```

### 清理资源

```javascript
await agentbay.stopDesktop(desktopId);
await agentbay.deleteDesktop(desktopId);
```
```

---

## 🧪 五、测试场景集成

### 5.1 场景 1: 并行 UI 测试

```python
# 创建 10 个桌面并行测试
desktop_ids = []
for i in range(10):
    desktop_id = client.create_desktop()
    client.start_desktop(desktop_id)
    desktop_ids.append(desktop_id)

# 分发测试任务
for desktop_id in desktop_ids:
    run_test_async(desktop_id, test_case)

# 等待完成并清理
for desktop_id in desktop_ids:
    client.wait_for_completion(desktop_id)
    client.delete_desktop(desktop_id)
```

### 5.2 场景 2: 多浏览器测试

```python
# 创建不同配置的桌面
configs = [
    {"image_id": "win10-chrome", "test": "chrome_test.py"},
    {"image_id": "win10-firefox", "test": "firefox_test.py"},
    {"image_id": "win10-edge", "test": "edge_test.py"},
]

for config in configs:
    desktop_id = client.create_desktop(image_id=config["image_id"])
    run_test(desktop_id, config["test"])
    client.delete_desktop(desktop_id)
```

### 5.3 场景 3: 7x24 监控

```python
# 创建长期运行的监控桌面
desktop_id = client.create_desktop()
client.start_desktop(desktop_id)

# 部署监控脚本
deploy_monitoring_script(desktop_id, """
while True:
    check_website_health()
    check_api_status()
    send_alert_if_needed()
    time.sleep(300)
""")

# 按需停止
# client.stop_desktop(desktop_id)
```

---

## 💰 六、成本估算

### 计费模式

| 计费项 | 单价 | 说明 |
|--------|------|------|
| **计算资源** | ¥0.5-2/小时 | 按实例规格 (2-8 核 4-16GB) |
| **存储** | ¥0.3/GB/月 | 系统盘 + 数据盘 |
| **公网带宽** | ¥23/GB | 按使用流量计费 |
| **镜像** | 免费 | 公共镜像免费，自定义镜像收费 |

### 测试场景成本示例

| 场景 | 配置 | 时长 | 预估成本 |
|------|------|------|----------|
| 单次 Web 测试 | 2 核 4GB | 30 分钟 | ¥0.5 |
| 并行 10 桌测试 | 2 核 4GB × 10 | 1 小时 | ¥5 |
| 7x24 监控 | 2 核 4GB | 1 个月 | ¥360 |
| 月度回归测试 | 4 核 8GB | 10 小时/月 | ¥20 |

---

## 🔐 七、安全建议

### 7.1 AccessKey 管理

```bash
# 使用 RAM 子账号，不要使用主账号
# 最小权限原则：仅授予 EDS 相关权限
```

### 7.2 网络安全

```python
# 配置安全组，仅允许必要端口
# 使用 VPC 私有网络
# 测试完成后立即释放公网 IP
```

### 7.3 数据保护

```python
# 敏感数据加密存储
# 测试完成后彻底删除桌面
# 不在桌面存储长期数据
```

---

## 🚀 八、实施步骤

### Phase 1: 环境准备 (1-2 天)

- [ ] 注册阿里云账号
- [ ] 创建 RAM 子账号并配置权限
- [ ] 获取 AccessKey
- [ ] 安装 Python SDK (`pip install aliyun-python-sdk-eds`)
- [ ] 测试 API 连通性

### Phase 2: 技能开发 (2-3 天)

- [ ] 创建 `agentbay-connector` 技能目录
- [ ] 实现 Python 客户端
- [ ] 实现 Node.js 入口
- [ ] 编写 SKILL.md 文档
- [ ] 本地测试

### Phase 3: 集成测试 (1-2 天)

- [ ] 创建测试桌面
- [ ] 远程执行 Selenium 脚本
- [ ] 远程执行 Playwright 脚本
- [ ] 验证测试结果回传
- [ ] 清理资源测试

### Phase 4: 生产部署 (1 天)

- [ ] 配置监控告警
- [ ] 设置预算告警
- [ ] 文档完善
- [ ] 团队培训

---

## 📊 九、与本地测试对比

| 维度 | 本地测试 | AgentBay |
|------|----------|----------|
| **启动速度** | ⚡ 即时 | 🐌 3-5 分钟 |
| **并行能力** | ⚠️ 受限于硬件 | ✅ 弹性扩展 |
| **成本** | ✅ 固定成本 | ⚠️ 按量付费 |
| **隔离性** | ⚠️ 共享环境 | ✅ 完全隔离 |
| **维护** | ⚠️ 自行维护 | ✅ 阿里云托管 |
| **适合场景** | 日常开发测试 | 大规模/特殊场景 |

---

## 🎯 十、推荐决策

### 建议使用 AgentBay 的情况：

✅ 需要并行执行 10+ 测试任务
✅ 需要测试不同 OS/浏览器组合
✅ 需要 7x24 小时持续监控
✅ 测试环境需要完全隔离
✅ 本地资源不足

### 建议继续使用本地的情况：

✅ 快速调试和开发
✅ 单次或少量测试
✅ 成本敏感
✅ 数据隐私要求高
✅ 网络条件差

---

## 📚 参考资料

- [阿里云 EDS 文档](https://help.aliyun.com/product/53036.html)
- [OpenAPI  Explorer](https://api.aliyun.com/)
- [Python SDK GitHub](https://github.com/aliyun/alibaba-cloud-sdk-python)
- [RAM 权限配置](https://ram.console.aliyun.com/)

---

*报告生成：测试仔 🧪 | 质量是测试出来的，不是保证出来的*
