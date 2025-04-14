// ==UserScript==
// @name         程序组合优化器
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  监控zkwasm-automata API请求，优化程序组合，自动点击火箭和确认按钮
// @author       AI助手
// @match        https://automata.zkplay.app/*
// @match        *://zkwasm-automata.zkwasm.ai/*
// @match        http://114.119.173.203/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_log
// @connect      *
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    // 添加CSS样式
    GM_addStyle(`
        #card-optimizer-panel {
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 90vh;
            overflow-y: auto;
            background-color: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 15px;
            border-radius: 10px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
        #card-optimizer-panel h2 {
            color: #4CAF50;
            margin-top: 0;
            border-bottom: 1px solid #4CAF50;
            padding-bottom: 5px;
        }
        #social-links a:hover {
            text-decoration: underline;
            opacity: 0.8;
        }
        #card-optimizer-panel button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 8px 12px;
            margin: 5px;
            border-radius: 4px;
            cursor: pointer;
        }
        #card-optimizer-panel button:hover {
            background-color: #45a049;
        }
        .card-combination {
            margin: 10px 0;
            padding: 10px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
        }
        .card-combination h3 {
            margin-top: 0;
            color: #FFC107;
        }
        .card-details {
            margin-left: 10px;
        }
        .card-position {
            display: inline-block;
            width: 30px;
            height: 30px;
            line-height: 30px;
            text-align: center;
            background-color: #673AB7;
            border-radius: 50%;
            margin-right: 10px;
        }
        .attribute-positive {
            color: #4CAF50;
        }
        .attribute-negative {
            color: #F44336;
        }
        .attribute-neutral {
            color: #9E9E9E;
        }
        .toggle-button {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10001;
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
        }
    `);

    // 创建面板切换按钮
    const toggleButton = document.createElement('button');
    toggleButton.className = 'toggle-button';
    toggleButton.textContent = '显示程序优化器';
    document.body.appendChild(toggleButton);

    // 创建优化器面板
    const panel = document.createElement('div');
    panel.id = 'card-optimizer-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
        <h2>程序组合优化器</h2>
        <div id="social-links" style="text-align: right; margin-bottom: 10px; display: flex; justify-content: flex-end; gap: 15px;">
            <a href="https://x.com/zhang_etc" target="_blank" style="color: #1DA1F2; text-decoration: none; font-size: 14px; display: inline-flex; align-items: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#1DA1F2" style="margin-right: 5px;">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
                关注 @zhang_etc
            </a>
            <a href="https://github.com/MarshalT/automata" target="_blank" style="color: #6e5494; text-decoration: none; font-size: 14px; display: inline-flex; align-items: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#6e5494" style="margin-right: 5px;">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
                </svg>
                GitHub
            </a>
        </div>
        <div id="bounty-pool-container" style="background-color: #2c3e50; padding: 10px; margin-bottom: 15px; border-radius: 5px; text-align: center; border: 1px solid #3498db;">
            <span style="font-size: 16px; font-weight: bold;">奖励池: </span>
            <span id="bounty-pool-value" style="font-size: 18px; font-weight: bold; color: #f1c40f;">等待数据...</span>
        </div>
        <div id="card-data-status">等待程序数据...</div>
        <div id="optimization-controls" style="display: none;">
            <button id="run-optimizer">运行优化</button>
            <button id="clear-results">清除结果</button>
        </div>
        <div id="optimization-results"></div>
    `;
    document.body.appendChild(panel);

    // 切换面板显示
    toggleButton.addEventListener('click', function () {
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            toggleButton.textContent = '隐藏程序优化器';
        } else {
            panel.style.display = 'none';
            toggleButton.textContent = '显示程序优化器';
        }
    });

    // 获取DOM元素
    const dataStatus = document.getElementById('card-data-status');
    const manualDataControls = document.getElementById('manual-data-controls');
    const manualGetDataButton = document.getElementById('manual-get-data');
    const extractFromWindowButton = document.getElementById('extract-from-window');
    const manualDataInput = document.getElementById('manual-data-input');
    const parseManualDataButton = document.getElementById('parse-manual-data');
    const optimizationControls = document.getElementById('optimization-controls');
    const runOptimizerButton = document.getElementById('run-optimizer');
    const clearResultsButton = document.getElementById('clear-results');
    const resultsContainer = document.getElementById('optimization-results');

    // 存储程序数据
    let cardsData = null;

    // 添加调试信息到面板
    function addDebugInfo(message) {
        // 始终在控制台输出火箭和确认按钮监控相关信息
        if (message.includes('rocket-image') || message.includes('确认按钮')) {
            console.log(`[程序优化器] ${message}`);
            return;
        }
        
        return; // 禁用其他调试信息
        if (!dataStatus) return; // 避免在DOM加载前调用

        const debugInfo = document.createElement('div');
        debugInfo.style.color = '#FFC107';
        debugInfo.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        dataStatus.appendChild(debugInfo);
        console.log(`[程序优化器] ${message}`);
    }

    // 存储请求队列，处理延时请求
    const requestQueue = [];
    let isProcessingQueue = false;

    // 处理请求队列
    function processRequestQueue() {
        if (isProcessingQueue || requestQueue.length === 0) return;

        isProcessingQueue = true;
        const request = requestQueue.shift();

        console.log(`[程序优化器] 处理队列中的请求: ${request.url}`);

        // 延迟处理请求，避免阻塞UI
        setTimeout(() => {
            try {
                processAPIResponse(request.data, request.url);
            } catch (e) {
                console.error(`[程序优化器] 处理请求出错: ${e.message}`);
            }

            isProcessingQueue = false;
            // 继续处理队列中的下一个请求
            if (requestQueue.length > 0) {
                processRequestQueue();
            }
        }, 100);
    }

    // 添加请求到队列
    function addToRequestQueue(data, url) {
        requestQueue.push({ data, url });
        processRequestQueue();
    }

    // 初始调试信息
    addDebugInfo('脚本已加载，等待网络请求...');

    // 拦截XHR请求 - 参考m.js实现
    try {
        const originalXHR = unsafeWindow.XMLHttpRequest || window.XMLHttpRequest;

        // 保存原始方法
        const originalXHROpen = originalXHR.prototype.open;
        const originalXHRSend = originalXHR.prototype.send;

        // 监控XHR open方法
        originalXHR.prototype.open = function (method, url) {
            this._url = url;
            this._method = method;
            this._requestData = null;
            console.log(`[程序优化器] XHR请求: ${method} ${url}`);
            return originalXHROpen.apply(this, arguments);
        };

        // 监控XHR send方法
        originalXHR.prototype.send = function (data) {
            try {
                this._requestData = data;

                // 尝试解析请求数据
                if (data && typeof data === 'string') {
                    try {
                        if (data.trim().startsWith('{')) {
                            // 尝试解析JSON
                            const jsonData = JSON.parse(data);
                            console.log(`[程序优化器] 请求数据: ${JSON.stringify(jsonData).substring(0, 100)}...`);

                            // 检查是否是目标请求
                            if (this._url && (
                                this._url.includes('/query') ||
                                this._url.includes('/api/') ||
                                this._url.includes('rpc') ||
                                this._url.includes('automata')
                            )) {
                                console.log(`[程序优化器] 目标请求: ${this._url}`);
                            }
                        } else if (data.includes('=') && data.includes('&')) {
                            // 尝试解析URL编码的表单数据
                            const formData = {};
                            data.split('&').forEach(pair => {
                                const [key, value] = pair.split('=');
                                formData[decodeURIComponent(key)] = decodeURIComponent(value);
                            });
                            console.log(`[程序优化器] 表单数据: ${JSON.stringify(formData)}`);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }

                // 监控目标请求
                if (this._url && (
                    this._url.includes('/query') ||
                    this._url.includes('/api/') ||
                    this._url.includes('rpc') ||
                    this._url.includes('automata')
                )) {
                    // 添加响应监听器
                    this.addEventListener('load', function () {
                        try {
                            let responseData = this.responseText;
                            console.log(`[程序优化器] 收到响应: ${this.status} ${this._url}`);

                            // 尝试解析JSON
                            if (responseData && responseData.trim().startsWith('{')) {
                                try {
                                    const jsonResponse = JSON.parse(responseData);
                                    console.log(`[程序优化器] 响应数据长度: ${responseData.length}`);

                                    // 将请求添加到队列中处理，避免阻塞UI
                                    setTimeout(() => {
                                        processAPIResponse(jsonResponse, this._url);
                                    }, 100);
                                } catch (e) {
                                    console.error(`[程序优化器] 解析JSON失败: ${e.message}`);
                                }
                            }
                        } catch (e) {
                            console.error(`[程序优化器] 处理响应错误: ${e.message}`);
                        }
                    });
                }
            } catch (e) {
                console.error(`[程序优化器] XHR send错误: ${e.message}`);
            }

            return originalXHRSend.apply(this, arguments);
        };

        console.log('[程序优化器] 成功拦截XMLHttpRequest');
    } catch (e) {
        console.error(`[程序优化器] 拦截XMLHttpRequest失败: ${e.message}`);
    }

    // 使用Fetch API拦截 - 参考m.js实现
    try {
        // 保存原始方法
        const originalFetch = unsafeWindow.fetch || window.fetch;

        // 监控fetch请求
        window.fetch = async function (url, options) {
            try {
                // 获取URL
                const requestUrl = (typeof url === 'string') ? url : (url.url || '');
                console.log(`[程序优化器] Fetch请求: ${requestUrl}`);

                // 检查是否是目标请求
                const isTargetRequest = requestUrl.includes('/query') ||
                    requestUrl.includes('/api/') ||
                    requestUrl.includes('rpc') ||
                    requestUrl.includes('automata');

                // 记录请求详情
                if (isTargetRequest) {
                    let requestBody = options?.body || null;

                    // 尝试解析请求体
                    if (requestBody && typeof requestBody === 'string') {
                        if (requestBody.trim().startsWith('{')) {
                            try {
                                const jsonBody = JSON.parse(requestBody);
                                console.log(`[程序优化器] Fetch请求数据: ${JSON.stringify(jsonBody).substring(0, 100)}...`);
                            } catch (e) { /* 不是JSON */ }
                        } else if (requestBody.includes('=') && requestBody.includes('&')) {
                            try {
                                // 解析URL编码的表单数据
                                const formData = {};
                                requestBody.split('&').forEach(pair => {
                                    const [key, value] = pair.split('=');
                                    formData[decodeURIComponent(key)] = decodeURIComponent(value);
                                });
                                console.log(`[程序优化器] Fetch表单数据: ${JSON.stringify(formData)}`);
                            } catch (e) { /* 忽略解析错误 */ }
                        }
                    }
                }

                // 拦截响应
                const response = await originalFetch.apply(this, arguments);

                // 处理目标请求的响应
                if (isTargetRequest) {
                    console.log(`[程序优化器] Fetch响应: ${response.status} ${requestUrl}`);

                    // 克隆响应以便可以多次读取内容
                    const clone = response.clone();
                    try {
                        const text = await clone.text();
                        let responseData = text;

                        // 尝试解析JSON
                        if (text && text.trim().startsWith('{')) {
                            try {
                                responseData = JSON.parse(text);
                                console.log(`[程序优化器] Fetch响应数据长度: ${text.length}`);

                                // 延迟处理响应数据，避免阻塞UI
                                setTimeout(() => {
                                    processAPIResponse(responseData, requestUrl);
                                }, 100);
                            } catch (e) {
                                console.error(`[程序优化器] 解析JSON失败: ${e.message}`);
                            }
                        }
                    } catch (e) {
                        console.error(`[程序优化器] 处理Fetch响应错误: ${e.message}`);
                    }
                }

                return response;
            } catch (e) {
                console.error(`[程序优化器] Fetch请求错误: ${e.message}`);
                return originalFetch.apply(this, arguments);
            }
        };

        // 同时覆盖unsafeWindow的fetch
        if (unsafeWindow && unsafeWindow !== window) {
            unsafeWindow.fetch = window.fetch;
        }

        console.log('[程序优化器] 成功拦截Fetch API');
    } catch (e) {
        console.error(`[程序优化器] 拦截Fetch API失败: ${e.message}`);
    }

    // 定期检查网页中的程序数据
    let checkCounter = 0;
    const maxChecks = 20; // 最多检查20次

    function scheduleDataCheck() {
        if (cardsData || checkCounter >= maxChecks) return;

        checkCounter++;
        console.log(`[程序优化器] 定期检查 #${checkCounter}: 搜索网页中的程序数据...`);

        // 尝试从全局变量中提取程序数据
        const extractData = function () {
            // 尝试各种可能的全局变量名
            const possibleVars = [
                'cards', 'cardData', 'gameData', 'gameState', 'state', 'appState',
                'store', 'gameStore', 'cardStore', 'data', 'window.cards', 'window.gameData'
            ];

            // 递归搜索对象中的程序数组
            function findCardsInObject(obj, path = '', visitedObjects = new WeakSet()) {
                // 防止空对象或非对象类型
                if (!obj || typeof obj !== 'object') return null;
                
                // 防止循环引用和无限递归
                if (visitedObjects.has(obj)) return null;
                visitedObjects.add(obj);
                
                // 限制搜索深度
                if (path.split('.').length > 10) return null;

                // 检查当前对象是否是程序数组
                if (Array.isArray(obj) && obj.length > 0 &&
                    (typeof obj[0] === 'object') &&
                    (obj[0].id !== undefined || obj[0].cardId !== undefined)) {
                    console.log(`[程序优化器] 在路径 ${path} 找到可能的程序数组`);
                    return obj;
                }

                // 递归搜索子对象
                for (const key in obj) {
                    // 跳过特定的属性以避免问题
                    if (key === 'window' || key === 'self' || key === 'parent' || key === 'top' || key === 'frames' || key === 'document') continue;
                    
                    try {
                        if (obj[key] && typeof obj[key] === 'object') {
                            const result = findCardsInObject(obj[key], `${path}.${key}`, visitedObjects);
                            if (result) return result;
                        }
                    } catch (e) {
                        // 忽略访问错误
                        continue;
                    }
                }

                return null;
            }

            // 尝试直接从全局变量中获取
            for (const varName of possibleVars) {
                try {
                    // 使用eval来访问全局变量
                    const value = eval(varName);
                    if (value) {
                        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                            // 可能是程序数组
                            return value;
                        } else if (typeof value === 'object') {
                            // 搜索对象中的程序数组
                            const cards = findCardsInObject(value, varName);
                            if (cards) return cards;
                        }
                    }
                } catch (e) {
                    // 忽略错误，继续尝试下一个变量
                }
            }

            // 如果上面的方法失败，尝试搜索 window 对象的一些常见属性
            // 但不搜索整个 window 对象，避免递归过深
            try {
                for (const key of ['app', 'data', 'store', 'state', 'game', 'cards', 'programs']) {
                    try {
                        if (window[key] && typeof window[key] === 'object') {
                            const result = findCardsInObject(window[key], `window.${key}`);
                            if (result) return result;
                        }
                    } catch (e) {
                        console.error(`[程序优化器] 搜索 window.${key} 时出错: ${e.message}`);
                        continue;
                    }
                }
            } catch (e) {
                console.error(`[程序优化器] 搜索 window 属性时出错: ${e.message}`);
            }
            return null;
        };

        const extractedCards = extractData();
        if (extractedCards && extractedCards.length > 0) {
            console.log(`[程序优化器] 定期检查找到 ${extractedCards.length} 张程序`);
            processAPIResponse({ cards: extractedCards }, 'periodic-check');
        } else {
            // 如果没找到，继续定期检查
            setTimeout(scheduleDataCheck, 2000); // 2秒后再次检查
        }
    }

    // 监控和自动点击 rocket-image 元素
    function monitorRocketImage() {
        // 检查并点击火箭图像
        const rocketElements = document.querySelectorAll('.rocket-image');
        if (rocketElements && rocketElements.length > 0) {
            console.log('[程序优化器] 发现 rocket-image 元素，正在点击...');
            for (const rocket of rocketElements) {
                try {
                    rocket.click();
                    console.log('[程序优化器] 已点击 rocket-image 元素');
                } catch (e) {
                    console.error(`[程序优化器] 点击 rocket-image 失败: ${e.message}`);
                }
            }
        }
        
        // 检查并点击确认按钮
        monitorConfirmButton();
        
        // 持续监控
        setTimeout(monitorRocketImage, 2000); // 每2秒检查一次
    }
    
    // 模拟点击元素的辅助函数
    function simulateClick(element) {
        try {
            // 方式1: 直接点击
            element.click();
            
            // 方式2: 创建并触发点击事件
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            element.dispatchEvent(clickEvent);
            
            // 方式3: 创建并触发鼠标按下和释放事件
            const mousedownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            const mouseupEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(mousedownEvent);
            element.dispatchEvent(mouseupEvent);
            
            // 方式4: 触发元素的 onmousedown/onmouseup/onclick 属性
            if (typeof element.onmousedown === 'function') element.onmousedown();
            if (typeof element.onmouseup === 'function') element.onmouseup();
            if (typeof element.onclick === 'function') element.onclick();
            
            return true;
        } catch (e) {
            console.error(`[程序优化器] 模拟点击失败: ${e.message}`);
            return false;
        }
    }
    
    // 监控和自动点击确认按钮
    function monitorConfirmButton() {
        try {
            // 先尝试用户提供的精确选择器
            let confirmButtons = document.querySelectorAll('.rocket-popup-confirm-button .confirm-button-scale .image-button');
            if (!confirmButtons || confirmButtons.length === 0) {
                confirmButtons = document.querySelectorAll('.rocket-popup-confirm-button button');
            }
            if (!confirmButtons || confirmButtons.length === 0) {
                confirmButtons = document.querySelectorAll('.confirm-button-scale .image-button');
            }
            if (!confirmButtons || confirmButtons.length === 0) {
                confirmButtons = document.querySelectorAll('.confirm-button-scale button');
            }
            if (!confirmButtons || confirmButtons.length === 0) {
                confirmButtons = document.querySelectorAll('button.image-button');
            }
            
            // 如果上述选择器都没找到，尝试直接查找包含 confirm 的图片
            if (!confirmButtons || confirmButtons.length === 0) {
                const images = document.querySelectorAll('img[src*="confirm"]');
                if (images && images.length > 0) {
                    console.log(`[程序优化器] 发现 ${images.length} 个包含 confirm 的图片，尝试点击...`);
                    for (const img of images) {
                        try {
                            // 尝试各种方式找到按钮并点击
                            const button = img.closest('button') || img.parentElement;
                            if (button) {
                                if (simulateClick(button)) {
                                    console.log('[程序优化器] 已点击确认按钮 (通过图片)');
                                    return;
                                }
                            }
                            
                            // 如果上面的方法没有找到按钮，尝试直接点击图片
                            if (simulateClick(img)) {
                                console.log('[程序优化器] 已点击确认图片');
                                return;
                            }
                        } catch (e) {
                            console.error(`[程序优化器] 点击确认图片失败: ${e.message}`);
                        }
                    }
                }
                
                // 尝试查找包含 rocket-popup-confirm-button 的元素
                const popupConfirm = document.querySelector('.rocket-popup-confirm-button');
                if (popupConfirm) {
                    console.log('[程序优化器] 发现 rocket-popup-confirm-button 元素，尝试点击其中的按钮...');
                    const buttons = popupConfirm.querySelectorAll('button');
                    if (buttons && buttons.length > 0) {
                        for (const btn of buttons) {
                            try {
                                if (simulateClick(btn)) {
                                    console.log('[程序优化器] 已点击 rocket-popup-confirm-button 中的按钮');
                                    return;
                                }
                            } catch (e) {
                                console.error(`[程序优化器] 点击 rocket-popup-confirm-button 中的按钮失败: ${e.message}`);
                            }
                        }
                    } else {
                        // 如果没有找到按钮，尝试直接点击容器
                        try {
                            if (simulateClick(popupConfirm)) {
                                console.log('[程序优化器] 已点击 rocket-popup-confirm-button 元素');
                                return;
                            }
                        } catch (e) {
                            console.error(`[程序优化器] 点击 rocket-popup-confirm-button 元素失败: ${e.message}`);
                        }
                    }
                }
                
                return;
            }
            
            // 如果找到确认按钮，则点击
            console.log(`[程序优化器] 发现 ${confirmButtons.length} 个确认按钮，正在点击...`);
            for (const button of confirmButtons) {
                try {
                    if (simulateClick(button)) {
                        console.log('[程序优化器] 已点击确认按钮');
                    }
                } catch (e) {
                    console.error(`[程序优化器] 点击确认按钮失败: ${e.message}`);
                }
            }
        } catch (e) {
            console.error(`[程序优化器] 监控确认按钮时出错: ${e.message}`);
        }
    }

    // 启动定期检查
    setTimeout(scheduleDataCheck, 3000); // 页面加载3秒后开始检查
    setTimeout(monitorRocketImage, 3000); // 同时启动 rocket-image 监控

    // 处理API响应
    function processAPIResponse(response, url) {
        // 检查DOM元素是否已准备好
        if (!document.getElementById('card-optimizer-panel')) {
            console.log(`[程序优化器] DOM元素未准备好，延迟处理响应`);
            setTimeout(() => processAPIResponse(response, url), 1000);
            return;
        }
        
        // 确保dataStatus元素存在
        const dataStatusElement = document.getElementById('card-data-status');
        if (!dataStatusElement) {
            console.log(`[程序优化器] 数据状态元素未找到，延迟处理响应`);
            setTimeout(() => processAPIResponse(response, url), 1000);
            return;
        }

        console.log(`[程序优化器] 处理来自 ${url} 的响应`);

        // 提取并显示bounty_pool信息
        if (response && response.state && response.state.bounty_pool) {
            const bountyPool = response.state.bounty_pool;
            try {
                updateBountyPoolDisplay(bountyPool);
                console.log(`[程序优化器] 更新奖励池显示: ${bountyPool}`);
            } catch (e) {
                console.error(`[程序优化器] 更新奖励池显示失败: ${e.message}`);
            }
        }

        // 尝试解析嵌套的JSON字符串 - 针对automata网站的特殊响应结构
        if (response && response.success === true && response.data && typeof response.data === 'string') {
            try {
                // 尝试解析data字段中的JSON字符串
                const parsedData = JSON.parse(response.data);
                console.log(`[程序优化器] 成功解析嵌套的JSON数据`);

                // 提取并显示嵌套数据中的bounty_pool
                if (parsedData.state && parsedData.state.bounty_pool) {
                    const bountyPool = parsedData.state.bounty_pool;
                    updateBountyPoolDisplay(bountyPool);
                    addDebugInfo(`当前奖励池(嵌套数据): ${bountyPool}`);
                }

                // 延迟递归处理解析后的数据，确保DOM已准备好
                setTimeout(() => {
                    processAPIResponse(parsedData, url + ' (嵌套数据)');
                }, 500);
                return;
            } catch (e) {
                console.error(`[程序优化器] 解析嵌套JSON失败: ${e.message}`);
                addDebugInfo(`解析嵌套JSON失败: ${e.message}`);
            }
        }

        // 尝试多种可能的数据结构
        let cards = null;

        // 方式1: response.player.data.cards (automata特定结构)
        if (response && response.player && response.player.data && response.player.data.cards && Array.isArray(response.player.data.cards)) {
            cards = response.player.data.cards;
            addDebugInfo(`方式1找到程序数据: ${cards.length}张`);
            
            // 保存完整响应以便后续使用
            window.fullApiResponse = response;
            
            // 提取local数组
            if (response.player.data.local && Array.isArray(response.player.data.local)) {
                window.localAttributes = [...response.player.data.local];
                // 确保有8个属性
                while (window.localAttributes.length < 8) window.localAttributes.push(0);
                console.log(`[程序优化器] 提取到local数组:`, window.localAttributes);
                addDebugInfo(`找到local数组: ${JSON.stringify(window.localAttributes)}`);
            }
        }
        // 方式2: response.result.cards
        else if (response && response.result && response.result.cards) {
            cards = response.result.cards;
            addDebugInfo(`方式2找到程序数据: ${cards.length}张`);
        }
        // 方式3: response.data.cards
        else if (response && response.data && response.data.cards) {
            cards = response.data.cards;
            addDebugInfo(`方式3找到程序数据: ${cards.length}张`);
        }
        // 方式4: response.cards
        else if (response && response.cards) {
            cards = response.cards;
            addDebugInfo(`方式4找到程序数据: ${cards.length}张`);
        }
        // 方式5: response.programs (特定于automata网站)
        else if (response && response.programs && Array.isArray(response.programs)) {
            cards = response.programs;
            addDebugInfo(`方式5找到程序数据: ${cards.length}个`);
        }
        // 方式6: 寻找任何包含程序属性的数组
        else if (response && typeof response === 'object') {
            // 递归搜索对象中的程序数据
            function findCardsInObject(obj, path = '', visitedObjects = new WeakSet()) {
                // 防止空对象或非对象类型
                if (!obj || typeof obj !== 'object') return null;
                
                // 防止循环引用和无限递归
                if (visitedObjects.has(obj)) return null;
                visitedObjects.add(obj);
                
                // 限制搜索深度
                if (path.split('.').length > 10) return null;

                // 检查当前对象是否是程序数组
                if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') {
                    // 检查是否有常见的程序属性
                    const firstItem = obj[0];
                    if (firstItem.attributes || firstItem.duration ||
                        'id' in firstItem || 'cardId' in firstItem ||
                        'name' in firstItem || 'title' in firstItem) {
                        addDebugInfo(`在路径 ${path} 找到可能的程序数组`);
                        return obj;
                    }
                }

                // 递归搜索子对象
                for (const key in obj) {
                    // 跳过特定的属性以避免问题
                    if (key === 'window' || key === 'self' || key === 'parent' || key === 'top' || key === 'frames' || key === 'document') continue;
                    
                    try {
                        if (obj[key] && typeof obj[key] === 'object') {
                            const result = findCardsInObject(obj[key], `${path}.${key}`, visitedObjects);
                            if (result) return result;
                        }
                    } catch (e) {
                        // 忽略访问错误
                        continue;
                    }
                }

                return null;
            }

            cards = findCardsInObject(response);
            if (cards) {
                addDebugInfo(`通过递归搜索找到程序数据: ${cards.length}项`);
            }
        }

        // 如果找到程序数据
        if (cards && cards.length > 0) {
            cardsData = cards;
            
            // 确保 DOM 元素存在再操作
            if (dataStatus) {
                dataStatus.innerHTML = `<div style="color:#4CAF50;font-weight:bold;">已获取 ${cardsData.length} 张程序数据</div>`;
            } else {
                console.log('[程序优化器] dataStatus 元素不存在');
            }
            
            // 确保 DOM 元素存在再操作
            if (optimizationControls) {
                optimizationControls.style.display = 'block';
            }
            
            if (manualDataControls) {
                manualDataControls.style.display = 'none'; // 隐藏手动控制区
            }

            // 显示前3张程序的数据示例
            const sampleSize = Math.min(3, cardsData.length);
            for (let i = 0; i < sampleSize; i++) {
                addDebugInfo(`程序${i}示例: ${JSON.stringify(cardsData[i]).substring(0, 100)}...`);
            }

            // 自动运行优化
            if (cardsData.length >= 8) { // 确保有足够的程序进行组合
                addDebugInfo('自动运行优化...');
                setTimeout(() => {
                    // 再次检查按钮是否存在，防止DOM变化
                    const runButton = document.getElementById('run-optimizer-button');
                    if (runButton) {
                        runButton.click();
                        console.log('[程序优化器] 已自动点击优化按钮');
                    } else {
                        console.error('[程序优化器] 找不到优化按钮，无法自动运行');
                        addDebugInfo('找不到优化按钮，无法自动运行');
                    }
                }, 1000);
            }
        } else {
            // 如果没有找到程序数据，但响应中有其他有用信息，也显示出来
            addDebugInfo(`未在响应中找到程序数据，响应结构: ${Object.keys(response).join(', ')}`);
        }
    }

    // 运行优化器
    runOptimizerButton.addEventListener('click', function () {
        if (!cardsData || cardsData.length === 0) {
            alert('未获取到程序数据，请先浏览程序页面');
            return;
        }

        resultsContainer.innerHTML = '<div>正在计算最优组合，请稍候...</div>';

        // 使用setTimeout让UI有时间更新
        setTimeout(() => {
            const optimizationResults = simulatedAnnealing(cardsData);
            displayResults(optimizationResults);
        }, 100);
    });

    // 清除结果
    clearResultsButton.addEventListener('click', function () {
        resultsContainer.innerHTML = '';
    });

    // 模拟退火算法 - 优化版
    function simulatedAnnealing(cards, initialTemp = 300, coolingRate = 0.92, iterations = 2000, numRuns = 20, maxSolutions = 6) {
        addDebugInfo(`开始运行模拟退火算法，处理${cards.length}张程序`);

        // 首先从响应中提取local数组
        // 如果程序数据是从完整的API响应中提取的，尝试获取local数组
        if (!window.localAttributes && cards.length > 0) {
            // 尝试从完整响应中获取local
            if (window.fullApiResponse && window.fullApiResponse.player && 
                window.fullApiResponse.player.data && 
                window.fullApiResponse.player.data.local && 
                Array.isArray(window.fullApiResponse.player.data.local)) {
                
                window.localAttributes = [...window.fullApiResponse.player.data.local];
                // 确保有8个属性
                while (window.localAttributes.length < 8) window.localAttributes.push(0);
                console.log(`[程序优化器] 从完整响应中找到local数组:`, window.localAttributes);
                addDebugInfo(`找到local数组: ${JSON.stringify(window.localAttributes)}`);
            }
        }
        
        // 将程序数据转换为属性数组格式，尝试多种可能的属性字段名
        const cardAttributes = cards.map((card, index) => {
            // 尝试不同的属性命名方式
            let attributes = [0, 0, 0, 0, 0, 0, 0, 0];

            // 输出程序数据结构以便调试
            if (index === 0) {
                console.log(`[程序优化器] 程序数据示例:`, JSON.stringify(card, null, 2));
            }

            // 方式1: automata特定格式 - 直接使用attributes数组
            if (card.attributes && Array.isArray(card.attributes)) {
                attributes = [...card.attributes];
                // 确保有8个属性
                while (attributes.length < 8) attributes.push(0);
                console.log(`[程序优化器] 使用方式1(attributes数组)解析程序属性:`, attributes);
            }
            
            // 如果是第一张卡，显示属性信息
            if (index === 0) {
                addDebugInfo(`程序属性示例: ${JSON.stringify(attributes)}`);
            }

            console.log(`[程序优化器] 程序属性:`, attributes);
            return attributes;
        });

        // 使用字典来记录不同的解，以保证多样性
        const solutionsDict = {};

        // 获取本地属性数组(local)，如果没有则使用默认值
        let localAttributes = [30, 30, 0, 0, 2, 0, 0, 0]; // 默认使用Python版本的初始值
        if (window.localAttributes && Array.isArray(window.localAttributes)) {
            localAttributes = [...window.localAttributes];
            // 确保有8个属性
            while (localAttributes.length < 8) localAttributes.push(0);
            addDebugInfo(`使用本地属性: ${JSON.stringify(localAttributes)}`);
        } else {
            addDebugInfo(`使用默认本地属性: ${JSON.stringify(localAttributes)}`);
        }

        // 评估组合函数 - 支持从local数组开始累积
        // 使用缓存提高性能
        const evaluationCache = new Map();
        
        function evaluateCombination(combination, allowIntermediateNegative = false) {
            // 使用组合的字符串表示作为缓存键
            const cacheKey = combination.join(',');
            
            // 如果缓存中存在该组合的评估结果，直接返回
            if (evaluationCache.has(cacheKey)) {
                return evaluationCache.get(cacheKey);
            }
            
            // 确保有正确的local属性数组
            const localAttrsCopy = [...localAttributes];
            // 减少日志输出以提高性能
            // console.log(`[程序优化器] 使用初始属性: ${JSON.stringify(localAttrsCopy)}`);
            
            // 从local属性开始累积
            const totalAttributes = [...localAttrsCopy];
            let valid = true;
            const stepAttributes = [];
            const realStepAttributes = []; // 存储真实的属性值，包括负值

            // 记录初始状态
            stepAttributes.push([...totalAttributes]);
            realStepAttributes.push([...totalAttributes]);

            for (let i = 0; i < combination.length; i++) {
                const cardId = combination[i];
                // 确保cardId在有效范围内
                if (cardId >= 0 && cardId < cardAttributes.length) {
                    const cardAttrs = cardAttributes[cardId];
                    const prevAttributes = [...totalAttributes]; // 保存当前属性值
                    
                    // 累加当前程序的属性
                    for (let j = 0; j < 8; j++) {
                        totalAttributes[j] += cardAttrs[j];
                    }

                    // 记录每一步的属性
                    // 对于显示目的，我们不显示负值
                    const displayAttributes = totalAttributes.map(val => Math.max(0, val));
                    stepAttributes.push([...displayAttributes]);
                    // 但我们仍然保存真实的属性值用于计算
                    realStepAttributes.push([...totalAttributes]);

                    // 检查中间步骤是否有负值 - 默认不允许中间负值
                    if (!allowIntermediateNegative && totalAttributes.some(attr => attr < 0)) {
                        // 减少日志输出以提高性能
                        // console.log(`[程序优化器] 位置 ${i+1} 的程序 ${cardId} 导致负值: ${JSON.stringify(totalAttributes)}`);
                        valid = false;
                        break;
                    }
                }
            }
            
            // 检查最终属性是否有负值
            if (totalAttributes.some(attr => attr < 0)) {
                // 减少日志输出以提高性能
                // console.log(`[程序优化器] 最终属性有负值: ${JSON.stringify(totalAttributes)}`);
                valid = false;
            }

            if (valid) {
                // 计算程序组合的纯增益（减去local初始值）
                // 使用真实的属性值进行计算
                const netAttributes = totalAttributes.map((attr, index) => attr - localAttrsCopy[index]);
                const netScore = netAttributes.reduce((sum, val) => sum + val, 0);
                
                console.log(`[程序优化器] 有效组合: ${combination.join(',')} - 得分: ${netScore}`);
                
                // 对于显示目的，我们确保最终属性不显示负值
                const displayAttributes = totalAttributes.map(val => Math.max(0, val));
                
                const result = {
                    score: netScore,
                    attributes: displayAttributes, // 显示用的属性，没有负值
                    realAttributes: totalAttributes, // 真实属性，用于计算
                    netAttributes: netAttributes,
                    stepAttributes: stepAttributes, // 已经处理过的步骤属性，没有负值
                    realStepAttributes: realStepAttributes // 真实的步骤属性，包含负值
                };
                
                // 缓存结果以提高性能
                evaluationCache.set(cacheKey, result);
                return result;
            } else {
                return {
                    score: Number.NEGATIVE_INFINITY,
                    attributes: null,
                    realAttributes: null,
                    netAttributes: null,
                    stepAttributes: null,
                    realStepAttributes: null
                };
            }
        }

        // 多次运行取最佳结果
        for (let run = 0; run < numRuns; run++) {
            // 初始化一个随机解
            let currentSolution = Array.from({ length: 8 }, () => Math.floor(Math.random() * cards.length));
            let currentEvaluation = evaluateCombination(currentSolution, true);

            // 如果初始解无效，重新生成直到有效
            let attempts = 0;
            while (currentEvaluation.score === Number.NEGATIVE_INFINITY && attempts < 100) {
                currentSolution = Array.from({ length: 8 }, () => Math.floor(Math.random() * cards.length));
                currentEvaluation = evaluateCombination(currentSolution, true);
                attempts++;
            }

            // 如果无法找到有效的初始解，跳过此次运行
            if (currentEvaluation.score === Number.NEGATIVE_INFINITY) {
                continue;
            }

            // 记录当前运行的最佳解
            let bestSolution = [...currentSolution];
            let bestScore = currentEvaluation.score;
            let bestAttributes = currentEvaluation.attributes ? [...currentEvaluation.attributes] : null;
            let bestNetAttributes = currentEvaluation.netAttributes ? [...currentEvaluation.netAttributes] : null;
            let bestStepAttributes = currentEvaluation.stepAttributes ? [...currentEvaluation.stepAttributes] : null;

            // 当前温度
            let temp = initialTemp;

            // 无改进计数器
            let noImprovement = 0;
            const maxNoImprovement = Math.floor(iterations / 10);

            // 模拟退火过程
            for (let i = 0; i < iterations; i++) {
                // 生成一个邻居解 - 可能修改多个位置
                const neighbor = [...currentSolution];
                const numChanges = 1 + Math.floor(Math.random() * 2); // 随机修改1-2个位置

                for (let j = 0; j < numChanges; j++) {
                    const position = Math.floor(Math.random() * 8);
                    // 优先考虑得分高的程序
                    if (Math.random() < 0.7) { // 70%概率选择前半部分程序
                        const cardRange = Math.min(6, cards.length);
                        neighbor[position] = Math.floor(Math.random() * cardRange);
                    } else {
                        neighbor[position] = Math.floor(Math.random() * cards.length);
                    }
                }

                // 评估邻居解
                const neighborEvaluation = evaluateCombination(neighbor, true);

                // 如果邻居解更好或满足概率接受条件，则接受新解
                if (neighborEvaluation.score !== Number.NEGATIVE_INFINITY) {
                    // 计算接受概率 - 温度越高，越容易接受较差的解
                    const delta = neighborEvaluation.score - currentEvaluation.score;
                    const acceptanceProbability = Math.min(1.0, Math.exp(delta / temp));

                    if (delta > 0 || Math.random() < acceptanceProbability) {
                        currentSolution = [...neighbor];
                        currentEvaluation = neighborEvaluation;

                        // 更新最佳解
                        if (currentEvaluation.score > bestScore) {
                            bestSolution = [...currentSolution];
                            bestScore = currentEvaluation.score;
                            bestAttributes = currentEvaluation.attributes ? [...currentEvaluation.attributes] : null;
                            bestNetAttributes = currentEvaluation.netAttributes ? [...currentEvaluation.netAttributes] : null;
                            bestStepAttributes = currentEvaluation.stepAttributes ? [...currentEvaluation.stepAttributes] : null;
                            noImprovement = 0; // 重置无改进计数器
                        } else {
                            noImprovement++;
                        }
                    } else {
                        noImprovement++;
                    }
                } else {
                    noImprovement++;
                }

                // 如果长时间没有改进，考虑重启
                if (noImprovement >= maxNoImprovement) {
                    // 重新初始化解，但保持一定概率使用当前最佳解
                    if (Math.random() < 0.3) { // 30%概率使用当前最佳解
                        currentSolution = [...bestSolution];
                        currentEvaluation = {
                            score: bestScore,
                            attributes: [...bestAttributes]
                        };
                    } else { // 70%概率随机生成新解
                        currentSolution = Array.from({ length: 8 }, () => Math.floor(Math.random() * cards.length));
                        currentEvaluation = evaluateCombination(currentSolution, true);

                        // 确保新解有效
                        attempts = 0;
                        while (currentEvaluation.score === Number.NEGATIVE_INFINITY && attempts < 50) {
                            currentSolution = Array.from({ length: 8 }, () => Math.floor(Math.random() * cards.length));
                            currentEvaluation = evaluateCombination(currentSolution, true);
                            attempts++;
                        }
                    }

                    // 重置温度和无改进计数器
                    temp = initialTemp * 0.5; // 重启时使用较低的初始温度
                    noImprovement = 0;
                }

                // 降温
                temp *= coolingRate;

                // 防止温度过低
                if (temp < 0.01) {
                    temp = 0.01;
                }
            }

            // 将当前运行的最佳解添加到解集中
            if (bestScore > 0) {
                const solutionKey = JSON.stringify(bestSolution);
                if (!solutionsDict[solutionKey]) {
                    solutionsDict[solutionKey] = {
                        solution: bestSolution,
                        score: bestScore,
                        attributes: bestAttributes,
                        netAttributes: bestNetAttributes,
                        stepAttributes: bestStepAttributes
                    };
                }
            }
        }

        // 将解转换为列表并按得分排序
        const solutionsList = Object.values(solutionsDict).sort((a, b) => b.score - a.score);
        
        // 限制返回的解决方案数量
        maxSolutions = solutionsList.length;
        const topSolutions = solutionsList.slice(0, maxSolutions);

        console.log(`[程序优化器] 找到 ${solutionsList.length} 个不同的有效组合`);
        
        // 输出详细的解决方案数据
        topSolutions.forEach((solution, index) => {
            console.log(`解决方案 ${index + 1}:
` + 
                      `  程序组合: ${solution.solution.join(', ')}
` + 
                      `  纯得分: ${solution.score}
` + 
                      `  最终属性: ${JSON.stringify(solution.attributes)}
` + 
                      `  纯增益: ${JSON.stringify(solution.netAttributes)}`);
        });
        
        // 返回两种类型的最佳解决方案
        // 1. 纯得分最大的方案
        const bestScoreSolution = solutionsList.length > 0 ? [solutionsList[0]] : [];
        
        // 2. 纯增益不包含负数的方案
        const noNegativeGainSolution = solutionsList.filter(solution => {
            // 检查纯增益是否包含负值
            const netAttrs = solution.netAttributes || [];
            return !netAttrs.some(val => val < 0);
        });
        
        // 如果找到了不包含负数的方案，取得分最高的那个
        const bestNoNegativeSolution = noNegativeGainSolution.length > 0 ? [noNegativeGainSolution[0]] : [];
        
        // 合并两种解决方案，去除重复
        const result = [...bestScoreSolution];
        
        // 如果最佳无负值方案与最高得分方案不同，则添加
        if (bestNoNegativeSolution.length > 0 && 
            (bestScoreSolution.length === 0 || 
             JSON.stringify(bestNoNegativeSolution[0].solution) !== JSON.stringify(bestScoreSolution[0].solution))) {
            result.push(bestNoNegativeSolution[0]);
        }
        
        console.log(`[程序优化器] 返回 ${result.length} 个解决方案`);
        return result;
    }

    // 显示优化结果
    function displayResults(results) {
        if (!results || results.length === 0) {
            resultsContainer.innerHTML = '<div class="result-item">未找到有效的程序组合</div>';
            return;
        }

        resultsContainer.innerHTML = '';
        const maxResults = results.length; // 显示所有结果

        // 添加样式，使结果更易读
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .local-info, .result-item {
                margin-bottom: 15px;
                padding: 10px;
                border: 1px solid #3a3a3a;
                border-radius: 5px;
                background-color: #2a2a2a;
                color: #e0e0e0;
            }
            .card-combination {
                margin-bottom: 10px;
                background-color: #333;
                padding: 8px;
                border-radius: 4px;
            }
            .combination-info {
                margin: 5px 0;
                font-weight: bold;
                color: #e0e0e0;
                background-color: #444;
                padding: 5px;
                border-radius: 3px;
            }
            .card-item {
                margin: 8px 0;
                padding: 8px;
                border-left: 3px solid #4CAF50;
                background-color: #3a3a3a;
                border-radius: 3px;
            }
            .score {
                color: #64B5F6;
                font-weight: bold;
            }
            .attribute-positive {
                color: #81C784;
                font-weight: bold;
            }
            .attribute-negative {
                color: #E57373;
                font-weight: bold;
            }
            .step-item {
                margin-left: 10px;
                background-color: #383838;
                padding: 5px;
                border-radius: 3px;
            }
            strong {
                color: #AED581;
            }
        `;
        resultsContainer.appendChild(styleElement);

        // 显示本地属性初始值
        const localInfoDiv = document.createElement('div');
        localInfoDiv.className = 'local-info';
        localInfoDiv.innerHTML = `<strong>初始状态(local):</strong> ${formatAttributes(window.localAttributes || [0, 0, 0, 0, 0, 0, 0, 0])}`;
        resultsContainer.appendChild(localInfoDiv);

        for (let i = 0; i < maxResults; i++) {
            const result = results[i];
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            // 创建程序组合展示
            const combinationDiv = document.createElement('div');
            combinationDiv.className = 'card-combination';
            
            // 显示程序组合和得分
            combinationDiv.innerHTML = `<strong>策略 ${i + 1}:</strong> ` +
                `<span class="score">纯得分: ${result.score}</span><br>` +
                `<div class="combination-info"><strong>程序组合:</strong> [${result.solution.join(', ')}]</div>`;

            // 添加程序详情
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'card-details';

            // 添加初始状态
            if (result.stepAttributes && result.stepAttributes.length > 0) {
                const initialDiv = document.createElement('div');
                initialDiv.className = 'step-item initial';
                // 确保初始状态不显示负值
                const displayInitialAttrs = result.stepAttributes[0].map(val => Math.max(0, val));
                initialDiv.innerHTML = `<strong>初始状态:</strong> ${formatAttributes(displayInitialAttrs)}`;
                cardsDiv.appendChild(initialDiv);
            }

            // 添加每一步的程序和属性变化
            result.solution.forEach((cardId, position) => {
                if (cardId >= 0 && cardId < cardsData.length) {
                    const card = cardsData[cardId];
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'card-item';
                    
                    // 尝试获取程序名称
                    let cardName = `程序 ${cardId}`;
                    if (card.name) {
                        cardName = card.name;
                    } else if (card.title) {
                        cardName = card.title;
                    }
                    
                    // 获取程序属性
                    let cardAttrs = [0, 0, 0, 0, 0, 0, 0, 0];
                    if (card.attributes && Array.isArray(card.attributes)) {
                        cardAttrs = [...card.attributes];
                        while (cardAttrs.length < 8) cardAttrs.push(0);
                    }
                    
                    // 显示程序属性
                    let cardAttributesText = `<br><strong>属性:</strong> ${formatAttributes(cardAttrs)}`;
                    
                    // 显示累积属性 - 确保没有负值
                    let cumulativeAttributesText = '';
                    if (result.stepAttributes && result.stepAttributes.length > position + 1) {
                        // 创建一个新数组，确保没有负值显示
                        const displayAttrs = result.stepAttributes[position + 1].map(val => Math.max(0, val));
                        cumulativeAttributesText = `<br><strong>累积属性:</strong> ${formatAttributes(displayAttrs)}`;
                    }
                    
                    cardDiv.innerHTML = `<strong>位置 ${position + 1}:</strong> ${cardName}${cardAttributesText}${cumulativeAttributesText}`;
                    cardsDiv.appendChild(cardDiv);
                }
            });

            // 添加属性详情
            const attributesDiv = document.createElement('div');
            attributesDiv.className = 'attributes';
            // 确保最终属性和纯增益也不显示负值
            const displayFinalAttrs = result.attributes ? result.attributes.map(val => Math.max(0, val)) : [];
            attributesDiv.innerHTML = `<strong>最终属性:</strong> ${formatAttributes(displayFinalAttrs)}<br>` +
                                    `<strong>纯增益:</strong> ${formatAttributes(result.netAttributes)}`;

            combinationDiv.appendChild(cardsDiv);
            combinationDiv.appendChild(attributesDiv);
            resultItem.appendChild(combinationDiv);
            resultsContainer.appendChild(resultItem);
        }
    }

    // 格式化属性显示
    function formatAttributes(attrs) {
        if (!attrs) return 'N/A';

        // 确保属性值是数字
        const numericAttrs = attrs.map(attr => {
            if (typeof attr === 'number') {
                return attr;
            } else if (typeof attr === 'string' && !isNaN(attr)) {
                return parseFloat(attr);
            } else {
                console.log(`[程序优化器] 非数字属性:`, attr);
                return 0;
            }
        });
        
        // 输出属性值用于调试
        console.log(`[程序优化器] 格式化属性值:`, numericAttrs);

        return numericAttrs.map(attr => {
            if (attr > 0) {
                return `<span class="attribute-positive">+${attr}</span>`;
            } else if (attr < 0) {
                return `<span class="attribute-negative">${attr}</span>`;
            } else {
                return `<span class="attribute-neutral">${attr}</span>`;
            }
        }).join(', ');
    }

    // 更新奖励池显示
    function updateBountyPoolDisplay(value) {
        const bountyPoolElement = document.getElementById('bounty-pool-value');
        if (bountyPoolElement) {
            // 格式化数字，添加千位分隔符
            const formattedValue = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            bountyPoolElement.textContent = formattedValue;

            // 根据数值大小设置颜色
            if (value > 1000000) {
                bountyPoolElement.style.color = '#f1c40f'; // 金色
            } else if (value > 500000) {
                bountyPoolElement.style.color = '#2ecc71'; // 绿色
            } else {
                bountyPoolElement.style.color = '#3498db'; // 蓝色
            }
        }
    }

})();
