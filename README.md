# BSCScan交易分析工具

## 概述
这是一个用于分析BNB智能链(BSC)上特定钱包地址与特定代币相关交易的工具。它可以自动抓取交易数据、计算统计信息并生成可视化HTML报告。

## 功能
- 抓取BSC上特定钱包地址的代币交易记录
- 计算交易统计信息(总交易数、收入交易、支出交易、净余额等)
- 生成交易数据JSON文件
- 创建包含排序和过滤功能的交互式HTML报告

## 安装
1. 确保已安装Node.js (推荐v14.0.0或更高版本)
2. 克隆或下载此仓库
3. 安装依赖包:

```bash
npm install axios cheerio
```

## 使用方法
1. 首次运行脚本，它会自动创建配置文件:

```bash
node bscscan_transactions.js
```

2. 修改生成的`config.json`配置文件，设置您的参数:

```json
{
  "TOKEN_ADDRESS": "0x9070c2db45f011e5bf66f544b20f10150f2754d0", // 代币合约地址
  "WALLET_ADDRESS": "0x48129238be8af277433662711d86e6cf235118d3", // 要分析的钱包地址
  "OUTPUT_FILE": "transactions.json", // 输出文件名
  "API_KEY": "" // BSCScan API密钥，可选
}
```

3. 再次运行脚本来应用您的配置:

```bash
node bscscan_transactions.js
```

4. 查看生成的报告:
   - `transactions.json`: 包含原始交易数据和分析结果的JSON文件
   - `transaction_report.html`: 可视化交易报告，可在浏览器中打开

## 配置文件说明
- `TOKEN_ADDRESS`: 要分析的代币合约地址
- `WALLET_ADDRESS`: 要分析的钱包地址
- `OUTPUT_FILE`: 保存交易数据的JSON文件名
- `API_KEY`: (可选) BSCScan API密钥，可提高请求限制

## 报告说明
生成的HTML报告包含以下功能:
- 交易总览统计(总交易数、收入交易、支出交易、净余额)
- 可分页的交易记录表格
- 按日期、金额、类型进行排序
- 按交易类型(收入/支出)过滤
- 每笔交易的详细信息(日期、交易哈希、金额、类型)

## 自定义选项
您可以通过修改`bscscan_transactions.js`文件中的以下变量来自定义行为:
- `DEFAULT_FILE`: 默认配置文件名
- `MAX_PAGES`: 最大抓取页数
- `TRANSACTIONS_PER_PAGE`: 每页显示的交易数量

## 注意事项
- BSCScan有API请求限制，使用API密钥可提高限制
- 大量交易记录的钱包地址可能需要较长时间处理
- 该工具使用web抓取，可能受BSCScan网站结构变化影响
- 建议使用API密钥而非web抓取以获得更稳定的结果

## 许可证
MIT
