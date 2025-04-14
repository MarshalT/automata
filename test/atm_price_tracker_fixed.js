// ==UserScript==
// @name         ATM代币价格追踪器
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  专门追踪 ATM(0x9070C2dB45f011E5bf66F544b20f10150F2754d0)代币价格
// @author       AI助手
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.coingecko.com
// @connect      api.binance.com
// @connect      api.dexscreener.com
// @connect      api.geckoterminal.com
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    // ATM代币地址和信息
    const ATM_TOKEN = {
        address: '0x9070C2dB45f011E5bf66F544b20f10150F2754d0',
        network: 'bsc',
        symbol: 'ATM',
        name: 'Automata'
    };
    
    // 添加CSS样式
    GM_addStyle(`
        #atm-price-box {
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
            min-width: 180px;
        }
        #atm-price-title {
            font-size: 14px;
            margin-bottom: 5px;
            color: #4CAF50;
        }
        #atm-price-value {
            font-size: 24px;
            font-weight: bold;
            color: #f1c40f;
        }
        #atm-price-time {
            font-size: 11px;
            color: #95a5a6;
            margin-top: 5px;
        }
        .price-up {
            color: #2ecc71 !important;
        }
        .price-down {
            color: #e74c3c !important;
        }
        .price-same {
            color: #f1c40f !important;
        }
    `);

    // 创建价格显示框
    const priceBox = document.createElement('div');
    priceBox.id = 'atm-price-box';
    priceBox.innerHTML = `
        <div id="atm-price-title">${ATM_TOKEN.name} (${ATM_TOKEN.symbol})</div>
        <div id="atm-price-value">获取价格中...</div>
        <div id="atm-price-change"></div>
        <div id="atm-price-time"></div>
    `;
    document.body.appendChild(priceBox);

    // 保存前一次价格用于比较
    let lastPrice = null;

    // 使用 DexScreener API 获取价格 (主要方式)
    function getPriceFromDexScreener() {
        const url = `https://api.dexscreener.com/latest/dex/tokens/${ATM_TOKEN.address}`;
        
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    try {
                        if (response.status === 200) {
                            const data = JSON.parse(response.responseText);
                            if (data && data.pairs && data.pairs.length > 0) {
                                // 选择交易量最大的交易对
                                const pair = data.pairs.sort((a, b) => {
                                    return parseFloat(b.volume.h24) - parseFloat(a.volume.h24);
                                })[0];
                                
                                const result = {
                                    price: parseFloat(pair.priceUsd),
                                    priceChange24h: parseFloat(pair.priceChange.h24) || 0,
                                    volume24h: parseFloat(pair.volume.h24) || 0,
                                    liquidity: parseFloat(pair.liquidity.usd) || 0,
                                    dex: pair.dexId,
                                    pairAddress: pair.pairAddress
                                };
                                
                                resolve(result);
                            } else {
                                reject('DexScreener API 返回中没有有效的交易对数据');
                            }
                        } else {
                            reject(`DexScreener API 请求失败: ${response.status}`);
                        }
                    } catch (e) {
                        reject(`解析 DexScreener 响应失败: ${e.message}`);
                    }
                },
                onerror: function(error) {
                    reject(`DexScreener 请求出错: ${error}`);
                }
            });
        });
    }

    // 使用 GeckoTerminal API 获取价格 (备用方式)
    function getPriceFromGeckoTerminal() {
        const url = `https://api.geckoterminal.com/api/v2/networks/bsc/tokens/${ATM_TOKEN.address}`;
        
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    try {
                        if (response.status === 200) {
                            const data = JSON.parse(response.responseText);
                            if (data && data.data && data.data.attributes) {
                                const attrs = data.data.attributes;
                                const result = {
                                    price: parseFloat(attrs.price_usd || 0),
                                    priceChange24h: parseFloat(attrs.price_change_percentage_24h || 0),
                                    volume24h: parseFloat(attrs.volume_usd.h24 || 0),
                                    fdv: parseFloat(attrs.fdv_usd || 0)
                                };
                                resolve(result);
                            } else {
                                reject('GeckoTerminal API 返回中没有价格数据');
                            }
                        } else {
                            reject(`GeckoTerminal API 请求失败: ${response.status}`);
                        }
                    } catch (e) {
                        reject(`解析 GeckoTerminal 响应失败: ${e.message}`);
                    }
                },
                onerror: function(error) {
                    reject(`GeckoTerminal 请求出错: ${error}`);
                }
            });
        });
    }
    
    // BSC Token 价格查询 PancakeSwap API (备用方式)
    function getPriceFromPancakeSwap() {
        const url = `https://api.pancakeswap.info/api/v2/tokens/${ATM_TOKEN.address}`;
        
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    try {
                        if (response.status === 200) {
                            const data = JSON.parse(response.responseText);
                            if (data && data.data && data.data.price) {
                                const result = {
                                    price: parseFloat(data.data.price),
                                    priceChange24h: parseFloat(data.data.price_BNB_24h_change || 0),
                                    symbol: data.data.symbol,
                                    name: data.data.name
                                };
                                resolve(result);
                            } else {
                                reject('PancakeSwap API 返回中没有价格数据');
                            }
                        } else {
                            reject(`PancakeSwap API 请求失败: ${response.status}`);
                        }
                    } catch (e) {
                        reject(`解析 PancakeSwap 响应失败: ${e.message}`);
                    }
                },
                onerror: function(error) {
                    reject(`PancakeSwap 请求出错: ${error}`);
                }
            });
        });
    }
    
    // 使用多个API获取ATM代币价格
    async function getATMPrice() {
        try {
            // 首先尝试 DexScreener
            try {
                const result = await getPriceFromDexScreener();
                return {
                    ...result,
                    source: 'DexScreener'
                };
            } catch (e) {
                console.log(`DexScreener API 失败: ${e}`);
            }
            
            // 如果 DexScreener 失败，尝试 GeckoTerminal
            try {
                const result = await getPriceFromGeckoTerminal();
                return {
                    ...result,
                    source: 'GeckoTerminal'
                };
            } catch (e) {
                console.log(`GeckoTerminal API 失败: ${e}`);
            }
            
            // 最后尝试 PancakeSwap
            try {
                const result = await getPriceFromPancakeSwap();
                return {
                    ...result,
                    source: 'PancakeSwap'
                };
            } catch (e) {
                console.log(`PancakeSwap API 失败: ${e}`);
            }
            
            // 所有方法均失败
            throw new Error('所有 API 源均无法获取 ATM 价格');
            
        } catch (e) {
            throw e;
        }
    }

    // 更新价格显示
    async function updatePriceDisplay() {
        const priceDisplay = document.getElementById('atm-price-value');
        const changeDisplay = document.getElementById('atm-price-change');
        const timeDisplay = document.getElementById('atm-price-time');
        const titleDisplay = document.getElementById('atm-price-title');
        
        try {
            // 获取ATM价格
            priceDisplay.textContent = '获取中...';
            const result = await getATMPrice();
            
            // 更新标题
            titleDisplay.textContent = `${ATM_TOKEN.name} (${ATM_TOKEN.symbol}) - ${result.source}`;
            
            // 格式化并显示价格
            let formattedPrice = '';
            if (result.price < 0.000001) {
                formattedPrice = '$' + result.price.toExponential(4);
            } else if (result.price < 0.01) {
                formattedPrice = '$' + result.price.toFixed(8);
            } else if (result.price < 100) {
                formattedPrice = '$' + result.price.toFixed(4);
            } else {
                formattedPrice = '$' + result.price.toFixed(2);
            }
            
            // 判断价格变化并设置颜色
            if (lastPrice !== null) {
                if (result.price > lastPrice) {
                    priceDisplay.className = 'price-up';
                } else if (result.price < lastPrice) {
                    priceDisplay.className = 'price-down';
                } else {
                    priceDisplay.className = 'price-same';
                }
            }
            
            priceDisplay.textContent = formattedPrice;
            lastPrice = result.price;
            
            // 显示24小时价格变化
            if (result.priceChange24h) {
                const changePercent = result.priceChange24h;
                let changeText = changePercent >= 0 ? '+' : '';
                changeText += changePercent.toFixed(2) + '%';
                
                if (changePercent > 0) {
                    changeDisplay.className = 'price-up';
                    changeDisplay.textContent = '↑ ' + changeText;
                } else if (changePercent < 0) {
                    changeDisplay.className = 'price-down';
                    changeDisplay.textContent = '↓ ' + changeText;
                } else {
                    changeDisplay.className = 'price-same';
                    changeDisplay.textContent = '= ' + changeText;
                }
            }
            
            // 显示交易量或流动性信息如果有
            if (result.volume24h) {
                let volumeText = '交易量: $' + formatNumber(result.volume24h);
                if (result.liquidity) {
                    volumeText += ' | 流动性: $' + formatNumber(result.liquidity);
                }
                timeDisplay.textContent = volumeText;
            } else {
                // 更新时间
                const now = new Date();
                timeDisplay.textContent = `更新于 ${now.toLocaleTimeString()}`;
            }
            
        } catch (e) {
            console.error('获取 ATM 价格出错:', e);
            priceDisplay.textContent = '无法获取价格';
            changeDisplay.textContent = '';
            timeDisplay.textContent = `错误: ${e.message}`;
        }
    }
    
    // 格式化大数字
    function formatNumber(num) {
        if (num > 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num > 1000) {
            return (num / 1000).toFixed(2) + 'K';
        } else {
            return num.toFixed(2);
        }
    }

    // 定期更新价格
    function startTracking() {
        // 页面加载后立即获取一次
        setTimeout(updatePriceDisplay, 1000);
        
        // 每30秒更新一次
        setInterval(updatePriceDisplay, 30000);
    }

    // 开始追踪 ATM 价格
    startTracking();
    
})();
