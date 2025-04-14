# Automata 程序组合优化器

## 项目简介

这是一个为 zkwasm-automata 平台设计的程序组合优化工具，通过智能算法帮助用户找到最优的程序组合，以最大化奖励收益。

## 主要功能

- **程序数据监控**：自动监控并捕获 zkwasm-automata 平台的程序数据
- **智能优化算法**：使用模拟退火算法寻找最佳程序组合
- **实时奖励池显示**：显示当前奖励池状态
- **用户友好界面**：简洁直观的操作界面，方便用户使用
- **自动点击工具**：自动点击火箭图标和确认按钮，提高程序优化效率

## 项目结构

- `card_optimizer_tampermonkey.js` - Tampermonkey 用户脚本，用于在浏览器中监控和优化程序组合
- `card_generator_fixed.py` - Python 脚本，用于生成和分析程序数据
- `data.json` - 存储程序数据的 JSON 文件
- `rocket_click.js` - 独立的 Tampermonkey 用户脚本，专门用于自动点击火箭图标和确认按钮

## 安装与使用

### Tampermonkey 脚本安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 Tampermonkey 图标，选择「添加新脚本」
3. 将 `card_optimizer_tampermonkey.js` 的内容复制到编辑器中
4. 保存脚本
5. 如需自动点击功能，重复步骤2-4，将 `rocket_click.js` 的内容复制到新脚本中并保存

### 使用方法

1. 访问 [zkwasm-automata 平台](https://automata.zkplay.app/)
2. 脚本会自动在页面右上角显示「显示程序优化器」按钮
3. 点击按钮打开优化器面板
4. 等待程序数据加载完成后，点击「运行优化」按钮
5. 查看优化结果，选择最佳程序组合

### 自动点击脚本使用说明

`rocket_click.js` 是一个独立的 Tampermonkey 脚本，专门提供自动点击功能：

1. 安装并启用 `rocket_click.js` 脚本后，它会在页面加载完成后自动运行
2. 脚本首先会执行一次点击检测，之后每10秒自动运行一次
3. 自动寻找并点击页面上的火箭图标
4. 点击火箭图标后，脚本会自动寻找并点击确认按钮
5. 整个过程无需人工干预，大大提高了优化效率

#### 独立使用说明

`rocket_click.js` 可以与主优化脚本 `card_optimizer_tampermonkey.js` 一起使用，也可以单独使用：

- **搭配使用**：自动点击脚本配合优化器使用，实现完全自动化的程序优化流程
- **独立使用**：如果您只需要自动点击功能而不需要程序优化功能，可以只安装 `rocket_click.js`

#### 故障排除

如果自动点击功能未正常工作，请尝试：

- 确保 Tampermonkey 扩展已启用
- 刷新页面后重试
- 检查浏览器控制台日志中是否有错误信息（按F12打开开发者工具）
- 尝试暂时禁用其他可能干扰的浏览器扩展

## 算法说明

本项目使用改进版的模拟退火算法来寻找最佳程序组合。该算法通过以下步骤工作：

1. 随机生成初始程序组合
2. 在高温下开始搜索，允许接受较差的解以跳出局部最优
3. 随着温度降低，算法逐渐倾向于只接受更好的解
4. 多次运行算法，选取最佳结果

## 贡献指南

欢迎提交 Pull Request 或创建 Issue 来帮助改进这个项目。

## 联系方式

- Twitter: [@zhang_etc](https://x.com/zhang_etc)
- GitHub: [MarshalT/automata](https://github.com/MarshalT/automata)

## 赞赏支持

如果您觉得这个项目对您有所帮助，欢迎赞赏支持！

![赞赏码](image.png)

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。
