#!/bin/bash

echo "======================================"
echo "  CrustShare 配置检查工具"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 .env 文件
echo -e "${YELLOW}[1/5] 检查 .env 文件...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env 文件存在${NC}"

    # 提取密码哈希
    USER_HASH=$(grep PASSWORD_HASH .env | cut -d'=' -f2 | head -1)
    ADMIN_HASH=$(grep ADMIN_PASSWORD_HASH .env | cut -d'=' -f2 | head -1)

    echo "   用户密码哈希: ${USER_HASH:0:16}..."
    echo "   管理员密码哈希: ${ADMIN_HASH:0:16}..."
else
    echo -e "${RED}❌ .env 文件不存在${NC}"
    exit 1
fi
echo ""

# 验证密码哈希
echo -e "${YELLOW}[2/5] 验证密码哈希...${NC}"

# 计算正确哈希
CORRECT_USER_HASH=$(echo -n "crustshare" | sha256sum | awk '{print $1}')
CORRECT_ADMIN_HASH=$(echo -n "admin" | sha256sum | awk '{print $1}')

if [ "$USER_HASH" == "$CORRECT_USER_HASH" ]; then
    echo -e "${GREEN}✅ 用户密码哈希正确${NC}"
    echo "   密码: crustshare"
else
    echo -e "${RED}❌ 用户密码哈希不匹配${NC}"
    echo "   预期: $CORRECT_USER_HASH"
    echo "   实际: $USER_HASH"
fi

if [ "$ADMIN_HASH" == "$CORRECT_ADMIN_HASH" ]; then
    echo -e "${GREEN}✅ 管理员密码哈希正确${NC}"
    echo "   密码: admin"
else
    echo -e "${RED}❌ 管理员密码哈希不匹配${NC}"
    echo "   预期: $CORRECT_ADMIN_HASH"
    echo "   实际: $ADMIN_HASH"
fi
echo ""

# 测试 API
echo -e "${YELLOW}[3/5] 测试登录 API...${NC}"

USER_LOGIN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"password":"crustshare","isAdmin":false}' \
  http://localhost:5000/api/auth/login)

ADMIN_LOGIN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"password":"admin","isAdmin":true}' \
  http://localhost:5000/api/auth/login)

if echo "$USER_LOGIN" | grep -q "success\":true"; then
    echo -e "${GREEN}✅ 用户登录 API 正常${NC}"
else
    echo -e "${RED}❌ 用户登录 API 失败${NC}"
    echo "   响应: $USER_LOGIN"
fi

if echo "$ADMIN_LOGIN" | grep -q "success\":true"; then
    echo -e "${GREEN}✅ 管理员登录 API 正常${NC}"
else
    echo -e "${RED}❌ 管理员登录 API 失败${NC}"
    echo "   响应: $ADMIN_LOGIN"
fi
echo ""

# 检查服务状态
echo -e "${YELLOW}[4/5] 检查服务状态...${NC}"
if curl -s http://localhost:5000 > /dev/null; then
    echo -e "${GREEN}✅ 服务运行正常 (端口 5000)${NC}"
else
    echo -e "${RED}❌ 服务未运行${NC}"
    echo "   请运行: pnpm dev"
fi
echo ""

# 提供解决方案
echo -e "${YELLOW}[5/5] 故障排除建议...${NC}"
echo ""
echo "如果仍然无法登录，请尝试以下步骤："
echo ""
echo "1. 清除浏览器缓存和 localStorage："
echo "   - 按 F12 打开开发者工具"
echo "   - 进入 Application → Local Storage"
echo "   - 右键 → Clear"
echo "   - 按 Ctrl+Shift+R 强制刷新"
echo ""
echo "2. 清除 Next.js 缓存："
echo "   rm -rf .next"
echo "   pnpm dev"
echo ""
echo "3. 重启开发服务器："
echo "   # 先停止 (Ctrl+C)"
echo "   pnpm dev"
echo ""
echo "4. 重新生成配置："
echo "   node scripts/generate-config.js"
echo ""
echo "======================================"
echo "  检查完成"
echo "======================================"
