const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// 尝试加载配置文件
let config = {

};

// 加载配置文件
function loadConfig() {
    const configPath = path.join(__dirname, 'config.json');

    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const userConfig = JSON.parse(configData);

            // 合并配置，保留默认值
            config = { ...config, ...userConfig };
            console.log('已从配置文件加载设置');
        } else {
            // 如果配置文件不存在，创建一个默认配置文件
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('已创建默认配置文件: config.json，请根据需要进行修改');
        }
    } catch (error) {
        console.error('加载配置文件失败:', error.message);
        console.log('将使用默认配置');
    }
}

// 加载配置
loadConfig();

// 解构配置
const { TelegramBotToken, CHAT_ID,pkx } = config;

// Telegram配置
const bot = new TelegramBot(TelegramBotToken, {
    polling: false
});
// API配置
const API_CONFIG = {
    url: 'https://rpc.zkwasm-automata.zkwasm.ai/query',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};

// 发送消息到Telegram
async function sendToTelegram(message) {
    try {
        await bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
        console.log('Telegram消息发送成功');
    } catch (error) {
        console.error('发送Telegram消息失败:', error.message);
    }
}

// 请求数据
async function requestData(pkx) {
    try {
        const response = await axios.post(API_CONFIG.url, { pkx }, {
            headers: API_CONFIG.headers,
            timeout: 10000
        });

        if (response.data?.success && response.data?.data) {
            return JSON.parse(response.data.data);
        }
        return null;
    } catch (error) {
        console.error('请求数据失败:', error.message);
        return null;
    }
}

// 格式化数据为消息
function formatMessage1(data, previousBountyPool) {
    if (!data || !data.player || !data.player.data || !data.state) return null;
    const currentBountyPool = data.state.bounty_pool;
    let changeMessage = '';

    if (previousBountyPool !== null) {
        const changeAmount = currentBountyPool - previousBountyPool;
        if (changeAmount > 0) {
            changeMessage = `🔍 奖励池增加了: +${changeAmount}`;
        } else if (changeAmount < 0) {
            changeMessage = `🔍 奖励池减少了: ${changeAmount}`;
        }
    }

    // 设置时区为 Asia/Shanghai (北京时间)
    const options = { timeZone: 'Asia/Shanghai', hour12: false };
    const beijingTime = new Date().toLocaleString('zh-CN', options);

    return `🎮 Automata状态更新
- 奖励池: ${currentBountyPool}
${changeMessage}
⏰ 更新时间: ${beijingTime}`;
}

// 主循环
async function main() { 
    let previousBountyPool = null;

    while (true) {
        console.log('正在请求数据...');
        const data = await requestData(pkx);

        if (data) {
            // console.log('请求到的数据:', JSON.stringify(data, null, 2));
            const currentBountyPool = data.state.bounty_pool;

            if (currentBountyPool !== previousBountyPool) {
                // 先保存旧值用于传递给formatMessage1，然后再更新
                const oldBountyPool = previousBountyPool;
                previousBountyPool = currentBountyPool;
                
                // 使用旧的奖池值计算变化
                const message = formatMessage1(data, oldBountyPool);
                if (message) {
                    console.log('准备发送的消息:\n', message);
                    console.log('发送消息到Telegram...');
                    // await sendToTelegram(message);
                }
            } else {
                console.log('奖励池数据未变化');
            }
        } else {
            console.log('未获取到有效数据');
        }

        await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    }
}


// 运行脚本
console.log('启动监控...');
main().catch(error => {
    console.error('程序执行错误:', error);
    process.exit(1);
});
