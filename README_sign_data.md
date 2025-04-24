# 数据签名脚本

这个脚本用于使用指定的以太坊钱包地址 `0x8d1a0b91592cd7c2abd4bb026f4cb40d6854b8e0` 对数据 `0xAUTOMATA` 进行签名。

## 前提条件

1. 安装 Node.js (推荐版本 14.x 或更高)
2. 安装必要的依赖包

## 安装

1. 安装依赖包：

```bash
npm install ethers
```

## 配置

1. 将 `wallet_config.json.template` 重命名为 `wallet_config.json`
2. 编辑 `wallet_config.json` 文件，将 `privateKey` 字段的值替换为与钱包地址 `0x8d1a0b91592cd7c2abd4bb026f4cb40d6854b8e0` 对应的私钥

```json
{
  "privateKey": "0x您的实际私钥"
}
```

**重要安全提示：**
- 私钥是访问您加密资产的关键，请妥善保管
- 不要将包含私钥的配置文件提交到版本控制系统
- 建议在使用完毕后删除包含私钥的配置文件

## 使用方法

运行脚本：

```bash
node sign_data.js
```

## 输出

脚本将生成两个输出文件：

1. `signature_result.json` - 包含详细的签名信息
2. `automata_signature.json` - 包含 Automata 格式的签名结果

Automata 格式的签名结果包含以下字段：
- `msg`: 原始消息的十六进制表示
- `hash`: 消息的哈希值
- `pkx`: 公钥的 X 坐标
- `pky`: 公钥的 Y 坐标
- `sigx`: 签名的 R 值
- `sigy`: 签名的 S 值
- `sigr`: 签名的 V 值

## 自定义

如果需要签名不同的数据或使用不同的钱包地址，可以修改 `sign_data.js` 文件中的以下变量：

```javascript
const walletAddress = '0x8d1a0b91592cd7c2abd4bb026f4cb40d6854b8e0';
const dataToSign = '0xAUTOMATA';
```
