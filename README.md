# Simple 2FA Authenticator

一个简单的基于 Web 的双因子身份验证 (2FA) 器，支持 TOTP 算法和屏幕 QR 码识别。

## 🌟 功能特性

- **TOTP 生成**：实时生成并显示基于时间的一次性密码 (TOTP)。
- **账户管理**：轻松添加、查看和删除 2FA 账户。
- **QR 码识别**：通过前端技术直接捕获并解析屏幕上的 QR 码，无需手机扫描。
- **持久化存储**：使用 SQLite 数据库安全存储账户信息。
- **现代化设计**：简洁、自适应的 Web 界面，带来极致的用户体验。
- **容器化支持**：内置 Docker 支持，一键部署。

## 🛠 技术栈

- **后端**：Python, FastAPI, SQLModel (SQLAlchemy)
- **前端**：Vanilla HTML/JS/CSS, Jinja2
- **TOTP 库**：PyOTP
- **包管理**：uv
- **测试**：Pytest
- **容器化**：Docker

## 🚀 快速开始

### 1. 环境准备

确保您的系统已安装 `Python 3.13` 和 `uv`。

### 2. 安装依赖

使用 `uv` 创建虚拟环境并安装依赖：

```bash
uv venv
source .venv/bin/activate  # Linux/macOS
# 或者 .venv\Scripts\activate  # Windows
uv pip install -r requirements.txt
```

### 3. 运行项目

您可以直接运行脚本：

```bash
./run.sh
```

或者手动启动：

```bash
cd backend
uvicorn app.main:app --reload
```

访问 `http://localhost:8000` 即可开始使用。

## 🐳 使用 Docker 运行

1. **构建镜像**：

```bash
docker build -t simple-2fa .
```

2. **运行容器**：

```bash
docker run -p 8000:8000 simple-2fa
```

## 🧪 运行测试

使用 `pytest` 进行自动化测试：

```bash
cd backend
pytest
```

## 📁 项目结构

```text
simple_2fa/
├── backend/            # 后端代码
│   ├── app/            # FastAPI 应用核心
│   │   ├── api/        # 路由定义
│   │   ├── main.py     # 入口文件
│   │   └── database.py # 数据库配置
│   └── tests/          # 测试用例
├── frontend/           # 前端资源
│   ├── static/         # CSS, JS, 图片
│   └── templates/      # Jinja2 模板 (HTML)
├── Dockerfile          # 容器构建文件
├── requirements.txt    # 依赖清单
└── run.sh              # 启动脚本
```
