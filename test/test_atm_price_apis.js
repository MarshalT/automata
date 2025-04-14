// ATM价格API测试脚本
// 这个脚本用于测试从不同API获取ATM代币价格
// 可以直接在浏览器控制台或Node.js环境执行

// ATM代币信息
const ATM_TOKEN = {
    address: '0x9070C2dB45f011E5bf66F544b20f10150F2754d0',
    network: 'bsc',
    symbol: 'ATM',
    name: 'Automata'
};

// 保存上次价格用于比较
let lastAtmPrice = null;

// ===== DexScreener API测试 =====
async function testDexScreener() {
    console.log('====== 测试 DexScreener API ======');
    try {
        const url = `https://api.dexscreener.com/latest/dex/tokens/${ATM_TOKEN.address}`;
        console.log(`请求URL: ${url}`);
        
        const response = await fetch(url, { 
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('原始响应数据:', data);
        
        if (data && data.pairs && data.pairs.length > 0) {
            // 选择交易量最大的交易对
            const pair = data.pairs.sort((a, b) => {
                const volumeA = parseFloat(a.volume?.h24 || 0);
                const volumeB = parseFloat(b.volume?.h24 || 0);
                return volumeB - volumeA;
            })[0];
            
            console.log('选中的交易对详情:', pair);
            
            // 安全解析价格字段
            let price = 0;
            if (pair.priceUsd && !isNaN(parseFloat(pair.priceUsd))) {
                price = parseFloat(pair.priceUsd);
            }
            
            // 解析价格变化
            let priceChange = 0;
            if (pair.priceChange) {
                console.log('原始 priceChange 数据:', pair.priceChange);
                if (pair.priceChange.h24 !== undefined) {
                    try {
                        priceChange = parseFloat(pair.priceChange.h24);
                        console.log('成功解析 24 小时价格变化:', priceChange);
                    } catch (e) {
                        console.error('解析 priceChange.h24 失败:', e);
                    }
                }
            }
            
            // 特殊处理百分比格式的字符串
            if (typeof pair.priceChange?.h24 === 'string' && pair.priceChange.h24.includes('%')) {
                const cleanStr = pair.priceChange.h24.replace('%', '');
                priceChange = parseFloat(cleanStr);
                console.log('从百分比格式提取数字:', priceChange);
            }
            
            // 解析交易量和流动性
            const volume = pair.volume && pair.volume.h24 ? parseFloat(pair.volume.h24) : 0;
            const liquidity = pair.liquidity && pair.liquidity.usd ? parseFloat(pair.liquidity.usd) : 0;
            
            const result = {
                price: price,
                priceChange24h: priceChange,
                volume24h: volume,
                liquidity: liquidity,
                dex: pair.dexId,
                pairAddress: pair.pairAddress,
                source: 'DexScreener'
            };
            
            console.log('处理后的结果:', result);
            return result;
        } else {
            console.error('DexScreener API 返回中没有有效的交易对数据');
            return null;
        }
    } catch (e) {
        console.error('DexScreener API 请求失败:', e.message);
        return null;
    }
}

// ===== GeckoTerminal API测试 =====
async function testGeckoTerminal() {
    console.log('====== 测试 GeckoTerminal API ======');
    try {
        const url = `https://api.geckoterminal.com/api/v2/networks/bsc/tokens/${ATM_TOKEN.address}`;
        console.log(`请求URL: ${url}`);
        
        const response = await fetch(url, { 
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('原始响应数据:', data);
        
        if (data && data.data && data.data.attributes) {
            const attrs = data.data.attributes;
            console.log('属性数据:', attrs);
            
            // 安全解析各个字段
            let price = 0;
            if (attrs.price_usd !== undefined && attrs.price_usd !== null) {
                price = parseFloat(attrs.price_usd);
            }
            
            let priceChange = 0;
            if (attrs.price_change_percentage_24h !== undefined && attrs.price_change_percentage_24h !== null) {
                priceChange = parseFloat(attrs.price_change_percentage_24h);
                console.log('价格变化原始数据:', attrs.price_change_percentage_24h);
            }
            
            // 如果没有价格变化数据，尝试从其他数据中获取
            if (priceChange === 0 && attrs.price_change_usd) {
                // 如果有美元价格变化数据
                const priceChangeUsd = parseFloat(attrs.price_change_usd);
                if (price > 0) {  // 避免除零
                    // 计算百分比变化
                    priceChange = (priceChangeUsd / price) * 100;
                    console.log('从 price_change_usd 计算百分比变化:', priceChange);
                }
            }
            
            // 查找更多可能的价格变化数据源
            if (priceChange === 0 && data.included && Array.isArray(data.included)) {
                // 在included数据中查找价格变化信息
                console.log('尝试从 included 数据中获取价格变化');
                for (const item of data.included) {
                    if (item.attributes && item.attributes.price_change_percentage) {
                        priceChange = parseFloat(item.attributes.price_change_percentage);
                        console.log('从 included 数据中找到价格变化:', priceChange);
                        break;
                    }
                }
            }
            
            let volume = 0;
            if (attrs.volume_usd && attrs.volume_usd.h24 !== undefined && attrs.volume_usd.h24 !== null) {
                volume = parseFloat(attrs.volume_usd.h24);
            }
            
            const result = {
                price: price,
                priceChange24h: priceChange,
                volume24h: volume,
                fdv: parseFloat(attrs.fdv_usd || 0),
                source: 'GeckoTerminal'
            };
            
            console.log('处理后的结果:', result);
            return result;
        } else {
            console.error('GeckoTerminal API 返回中没有价格数据');
            return null;
        }
    } catch (e) {
        console.error('GeckoTerminal API 请求失败:', e.message);
        return null;
    }
}

// ===== PancakeSwap API测试 =====
async function testPancakeSwap() {
    console.log('====== 测试 PancakeSwap API ======');
    try {
        const url = `https://api.pancakeswap.info/api/v2/tokens/${ATM_TOKEN.address}`;
        console.log(`请求URL: ${url}`);
        
        const response = await fetch(url, { 
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('原始响应数据:', data);
        
        if (data && data.data && data.data.price) {
            const price = parseFloat(data.data.price);
            const priceChange = data.data.price_BNB_24h_change ? 
                parseFloat(data.data.price_BNB_24h_change) : 0;
                
            const result = {
                price: price,
                priceChange24h: priceChange,
                symbol: data.data.symbol,
                name: data.data.name,
                source: 'PancakeSwap'
            };
            
            console.log('处理后的结果:', result);
            return result;
        } else {
            console.error('PancakeSwap API 返回中没有价格数据');
            return null;
        }
    } catch (e) {
        console.error('PancakeSwap API 请求失败:', e.message);
        return null;
    }
}

// ===== 运行所有测试 =====
async function runAllTests() {
    console.log('开始ATM价格API测试，时间:', new Date().toISOString());
    
    console.log('\n\n1. 测试 DexScreener API');
    const dexScreenerResult = await testDexScreener();
    console.log('DexScreener 最终结果:', dexScreenerResult);
    
    console.log('\n\n2. 测试 GeckoTerminal API');
    const geckoTerminalResult = await testGeckoTerminal();
    console.log('GeckoTerminal 最终结果:', geckoTerminalResult);
    
    console.log('\n\n3. 测试 PancakeSwap API');
    const pancakeSwapResult = await testPancakeSwap();
    console.log('PancakeSwap 最终结果:', pancakeSwapResult);
    
    console.log('\n\n所有测试完成!');
    console.log('结果汇总:');
    
    console.table({
        'DexScreener': {
            '价格': dexScreenerResult ? dexScreenerResult.price : 'N/A',
            '24小时变化': dexScreenerResult ? dexScreenerResult.priceChange24h + '%' : 'N/A',
            '交易量': dexScreenerResult ? dexScreenerResult.volume24h : 'N/A',
            '状态': dexScreenerResult ? '成功' : '失败'
        },
        'GeckoTerminal': {
            '价格': geckoTerminalResult ? geckoTerminalResult.price : 'N/A',
            '24小时变化': geckoTerminalResult ? geckoTerminalResult.priceChange24h + '%' : 'N/A',
            '交易量': geckoTerminalResult ? geckoTerminalResult.volume24h : 'N/A',
            '状态': geckoTerminalResult ? '成功' : '失败'
        },
        'PancakeSwap': {
            '价格': pancakeSwapResult ? pancakeSwapResult.price : 'N/A',
            '24小时变化': pancakeSwapResult ? pancakeSwapResult.priceChange24h + '%' : 'N/A',
            '交易量': 'N/A',
            '状态': pancakeSwapResult ? '成功' : '失败'
        }
    });
}

// 执行测试
runAllTests().catch(e => console.error('测试执行失败:', e));

// 如何使用:
// 1. 在浏览器中: 打开控制台，粘贴此代码并运行
// 2. 在Node.js中: 需要安装node-fetch包，然后执行 `node test_atm_price_apis.js`
// 注意: 如果在Node.js中运行，需要添加以下代码:
// const fetch = require('node-fetch');
