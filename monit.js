// ==UserScript==
// @name         操作监控器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  监控AG-Grid操作并记录网络请求、DOM变化和用户交互
// @author       Claude
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('🔍 AG-Grid操作监控器 - 启动');

    // 配置项
    const config = {
        logNetworkRequests: true,
        logDomChanges: true,
        logKeyEvents: true,
        logMouseEvents: true,
        focusedInputs: true,
        recordSteps: true,
        logConsole: true  // 新增：记录控制台日志
    };

    // 操作记录
    const operationLog = [];
    const consoleLog = [];  // 新增：存储控制台日志
    let startTime = Date.now();

    // 记录操作步骤
    function logOperation(type, details) {
        const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const logEntry = {
            time: timeElapsed,
            type: type,
            details: details,
            timestamp: new Date().toISOString()
        };
        operationLog.push(logEntry);
        console.log(`[${timeElapsed}s] ${type}: `, details);
        return logEntry;
    }

    // 新增：监控控制台输出
    function setupConsoleMonitoring() {
        if (!config.logConsole) return;

        // 保存原始控制台方法
        const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
        };

        // 辅助函数：检查消息是否是脚本自己的日志
        function isInternalLog(message) {
            // 检查是否是我们自己的日志格式：[时间s] 类型: {...}
            if (typeof message === 'string' && /^\[\d+\.\d+s\] .+: /.test(message)) {
                return true;
            }
            
            // 检查其他内部消息
            const internalMessages = [
                '✅ 控制台监控已启动', 
                '✅ 网络请求监控已启动', 
                '✅ DOM变化监控已启动',
                '✅ 事件监控已启动',
                '✅ 已监控AG-Grid实例',
                '网页操作监控器已启动',
                '🔍 AG-Grid操作监控器 - 启动',
                '正在准备日志导出',
                '准备导出',
                '触发下载',
                '下载已触发',
                '下载链接已清理'
            ];
            
            if (typeof message === 'string') {
                for (const prefix of internalMessages) {
                    if (message.includes(prefix)) {
                        return true;
                    }
                }
            }
            
            return false;
        }

        // 拦截console.log
        console.log = function() {
            // 转换参数为字符串
            const args = Array.from(arguments).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            });
            
            const message = args.join(' ');
            
            // 检查是否为脚本内部日志
            if (!isInternalLog(message)) {
                // 记录到我们的日志中
                consoleLog.push({
                    type: 'log',
                    message: message,
                    timestamp: new Date().toISOString()
                });
            }
            
            // 调用原始方法
            return originalConsole.log.apply(console, arguments);
        };

        // 拦截console.warn
        console.warn = function() {
            const args = Array.from(arguments).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            });
            
            const message = args.join(' ');
            
            // 检查是否为脚本内部日志
            if (!isInternalLog(message)) {
                consoleLog.push({
                    type: 'warn',
                    message: message,
                    timestamp: new Date().toISOString()
                });
            }
            
            return originalConsole.warn.apply(console, arguments);
        };

        // 拦截console.error
        console.error = function() {
            const args = Array.from(arguments).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            });
            
            const message = args.join(' ');
            
            // 检查是否为脚本内部日志
            if (!isInternalLog(message)) {
                consoleLog.push({
                    type: 'error',
                    message: message,
                    timestamp: new Date().toISOString()
                });
            }
            
            return originalConsole.error.apply(console, arguments);
        };

        // 拦截console.info
        console.info = function() {
            const args = Array.from(arguments).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            });
            
            const message = args.join(' ');
            
            // 检查是否为脚本内部日志
            if (!isInternalLog(message)) {
                consoleLog.push({
                    type: 'info',
                    message: message,
                    timestamp: new Date().toISOString()
                });
            }
            
            return originalConsole.info.apply(console, arguments);
        };

        // 拦截console.debug
        console.debug = function() {
            const args = Array.from(arguments).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            });
            
            const message = args.join(' ');
            
            // 检查是否为脚本内部日志
            if (!isInternalLog(message)) {
                consoleLog.push({
                    type: 'debug',
                    message: message,
                    timestamp: new Date().toISOString()
                });
            }
            
            return originalConsole.debug.apply(console, arguments);
        };

        console.log('✅ 控制台监控已启动');
    }

    // 网络请求监控
    function setupNetworkMonitoring() {
        if (!config.logNetworkRequests) return;

        // 保存原始方法
        const originalFetch = window.fetch;
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        // 监控fetch请求
        window.fetch = async function(url, options) {
            try {
                // 记录请求详情
                let requestBody = options?.body || null;

                // 尝试解析URL编码的表单数据
                if (requestBody && typeof requestBody === 'string' &&
                    requestBody.includes('=') && requestBody.includes('&')) {
                    try {
                        const formData = {};
                        requestBody.split('&').forEach(pair => {
                            const [key, value] = pair.split('=');
                            formData[decodeURIComponent(key)] = decodeURIComponent(value);
                        });
                        requestBody = {
                            original: requestBody,
                            parsed: formData
                        };
                    } catch (e) {/* 忽略解析错误 */}
                }

                const reqDetails = {
                    method: options?.method || 'GET',
                    url: url,
                    headers: options?.headers || {},
                    body: requestBody
                };

                logOperation('网络请求(Fetch)', reqDetails);

                // 拦截响应
                const response = await originalFetch.apply(this, arguments);

                // 克隆响应以便我们可以读取内容
                const clone = response.clone();
                try {
                    const text = await clone.text();
                    let responseData = text;

                    // 尝试解析JSON
                    if (text && text.trim().startsWith('{')) {
                        try {
                            responseData = JSON.parse(text);
                        } catch (e) { /* 不是JSON */ }
                    }

                    logOperation('网络响应(Fetch)', {
                        url: url,
                        status: response.status,
                        data: responseData
                    });
                } catch (e) {
                    logOperation('网络响应(Fetch)', {
                        url: url,
                        status: response.status,
                        error: e.message
                    });
                }

                return response;
            } catch (e) {
                logOperation('网络请求错误(Fetch)', {
                    url: url,
                    error: e.message
                });
                return originalFetch.apply(this, arguments);
            }
        };

        // 监控XHR请求
        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            this._method = method;
            this._requestData = null;
            return originalXHROpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(data) {
            try {
                this._requestData = data;

                // 尝试解析URL编码的表单数据
                if (data && typeof data === 'string' &&
                    data.includes('=') && data.includes('&')) {
                    try {
                        const formData = {};
                        data.split('&').forEach(pair => {
                            const [key, value] = pair.split('=');
                            formData[decodeURIComponent(key)] = decodeURIComponent(value);
                        });
                        this._parsedData = formData;
                    } catch (e) {/* 忽略解析错误 */}
                }

                // 记录请求
                logOperation('网络请求(XHR)', {
                    method: this._method,
                    url: this._url,
                    data: this._parsedData || this._requestData
                });

                // 添加响应监听器
                this.addEventListener('load', function() {
                    try {
                        let responseData = this.responseText;

                        // 尝试解析JSON
                        if (responseData && responseData.trim().startsWith('{')) {
                            try {
                                responseData = JSON.parse(responseData);
                            } catch (e) { /* 不是JSON */ }
                        }

                        logOperation('网络响应(XHR)', {
                            url: this._url,
                            status: this.status,
                            data: responseData
                        });
                    } catch (e) {
                        logOperation('网络响应解析错误', e.message);
                    }
                });
            } catch (e) {
                logOperation('网络请求错误(XHR)', e.message);
            }

            return originalXHRSend.apply(this, arguments);
        };

        console.log('✅ 网络请求监控已启动');
    }

    // DOM变化监控
    function setupDomChanges() {
        if (!config.logDomChanges) return;

        const cellObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // 只监控AG-Grid单元格
                if (!mutation.target.closest || !mutation.target.closest('.ag-cell')) {
                    return;
                }

                // 记录不同类型的变化
                if (mutation.type === 'attributes') {
                    if (mutation.attributeName === 'title') {
                        const cell = mutation.target;
                        logOperation('单元格属性变化', {
                            element: describeElement(cell),
                            attribute: mutation.attributeName,
                            oldValue: mutation.oldValue,
                            newValue: cell.getAttribute(mutation.attributeName)
                        });
                    }
                } else if (mutation.type === 'childList') {
                    // 子元素添加或删除
                    if (mutation.addedNodes.length) {
                        Array.from(mutation.addedNodes).forEach(node => {
                            if (node.nodeType === 1) { // 元素节点
                                logOperation('元素添加', {
                                    parent: describeElement(mutation.target),
                                    added: describeElement(node)
                                });
                            }
                        });
                    }
                    if (mutation.removedNodes.length) {
                        Array.from(mutation.removedNodes).forEach(node => {
                            if (node.nodeType === 1) { // 元素节点
                                logOperation('元素移除', {
                                    parent: describeElement(mutation.target),
                                    removed: node.nodeName
                                });
                            }
                        });
                    }
                }
            });
        });

        // 观察整个文档的变化
        cellObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['title', 'class', 'style'],
            childList: true,
            subtree: true
        });

        console.log('✅ DOM变化监控已启动');
    }

    // 简要描述DOM元素
    function describeElement(element) {
        if (!element || !element.tagName) return 'Unknown';

        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className && typeof element.className === 'string' ?
                      `.${element.className.split(' ').join('.')}` : '';
        const textContent = element.textContent ?
                          element.textContent.substring(0, 20) + (element.textContent.length > 20 ? '...' : '') : '';
        const attrs = element.hasAttribute('title') ? ` title="${element.getAttribute('title')}"` : '';

        return `<${tag}${id}${classes}${attrs}>${textContent}</${tag}>`;
    }

    // 监控键盘和鼠标事件
    function setupEventMonitoring() {
        if (config.logKeyEvents) {
            // 键盘事件
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT') {
                    logOperation('键盘按下', {
                        key: e.key,
                        code: e.code,
                        target: describeElement(e.target),
                        value: e.target.value
                    });
                }
            }, true);

            document.addEventListener('input', (e) => {
                if (e.target.tagName === 'INPUT') {
                    logOperation('输入事件', {
                        target: describeElement(e.target),
                        value: e.target.value
                    });
                }
            }, true);

            document.addEventListener('change', (e) => {
                if (e.target.tagName === 'INPUT') {
                    logOperation('值变更事件', {
                        target: describeElement(e.target),
                        value: e.target.value
                    });
                }
            }, true);
        }

        if (config.logMouseEvents) {
            // 鼠标点击
            document.addEventListener('click', (e) => {
                // 只关注AG-Grid相关元素
                if (e.target.closest && (
                    e.target.closest('.ag-cell') ||
                    e.target.closest('.ag-header-cell') ||
                    e.target.closest('button')
                )) {
                    logOperation('鼠标点击', {
                        target: describeElement(e.target),
                        x: e.clientX,
                        y: e.clientY
                    });
                }
            }, true);

            // 双击
            document.addEventListener('dblclick', (e) => {
                if (e.target.closest && e.target.closest('.ag-cell')) {
                    logOperation('鼠标双击', {
                        target: describeElement(e.target)
                    });
                }
            }, true);
        }

        if (config.focusedInputs) {
            // 焦点变化
            document.addEventListener('focus', (e) => {
                if (e.target.tagName === 'INPUT') {
                    logOperation('获得焦点', {
                        target: describeElement(e.target),
                        value: e.target.value
                    });
                }
            }, true);

            document.addEventListener('blur', (e) => {
                if (e.target.tagName === 'INPUT') {
                    logOperation('失去焦点', {
                        target: describeElement(e.target),
                        value: e.target.value
                    });
                }
            }, true);
        }

        console.log('✅ 事件监控已启动');
    }

    // 监控AG-Grid API调用
    function setupAgGridMonitoring() {
        // 周期性检查AG-Grid实例是否存在
        const checkInterval = setInterval(() => {
            const gridInstances = findAgGridInstances();
            if (gridInstances.length > 0) {
                clearInterval(checkInterval);
                logOperation('找到AG-Grid实例', { count: gridInstances.length });

                // 监控每个实例
                gridInstances.forEach((instance, index) => {
                    monitorAgGridInstance(instance, `实例${index+1}`);
                });
            }
        }, 1000);
    }

    // 查找页面上的AG-Grid实例
    function findAgGridInstances() {
        const instances = [];

        // 方法1: 查找window对象中的AG-Grid实例
        for (let key in window) {
            try {
                if (window[key] && typeof window[key] === 'object') {
                    // 检查是否有AG-Grid特征
                    if (window[key].api || window[key].gridApi ||
                        window[key].columnApi || window[key].gridOptions) {
                        instances.push(window[key]);
                    }
                }
            } catch (e) { /* 忽略访问错误 */ }
        }

        // 方法2: 查找DOM中的AG-Grid组件
        const gridElements = document.querySelectorAll('.ag-root-wrapper');
        gridElements.forEach(element => {
            if (element.__agComponent) {
                instances.push(element.__agComponent);
            }
        });

        return instances;
    }

    // 监控AG-Grid实例的API调用
    function monitorAgGridInstance(gridInstance, instanceName) {
        try {
            const api = gridInstance.api || gridInstance.gridApi;
            if (!api) return;

            // 记录网格状态
            logOperation('AG-Grid状态', {
                instance: instanceName,
                rowCount: api.getDisplayedRowCount ? api.getDisplayedRowCount() : 'N/A',
                hasAPI: !!api
            });

            // 监控常用方法
            const methodsToMonitor = [
                'setRowData', 'updateRowData', 'applyTransaction',
                'refreshCells', 'refreshRows', 'redrawRows',
                'startEditingCell', 'stopEditing'
            ];

            methodsToMonitor.forEach(method => {
                if (api[method] && typeof api[method] === 'function') {
                    const original = api[method];
                    api[method] = function() {
                        logOperation('AG-Grid调用', {
                            instance: instanceName,
                            method: method,
                            args: Array.from(arguments)
                        });
                        return original.apply(this, arguments);
                    };
                }
            });

            console.log(`✅ 已监控AG-Grid实例: ${instanceName}`);
        } catch (e) {
            console.error(`监控AG-Grid实例失败: ${e.message}`);
        }
    }

    // 当保存按钮被点击时记录当前状态
    function monitorSaveButton() {
        // 查找保存按钮
        const possibleButtons = [
            'button.save-btn',
            'button[data-action="save"]',
            'button[type="submit"]',
            'button.submit-btn',
            'button.ant-btn-primary',
            'button.primary-btn',
            'input[type="submit"]',
            '.btn-primary',
            '[data-action="save"]'
        ];

        possibleButtons.forEach(selector => {
            try {
                const buttons = document.querySelectorAll(selector);
                buttons.forEach(btn => {
                    // 添加点击监听器
                    btn.addEventListener('click', () => {
                        // 记录AG-Grid状态
                        logOperation('保存按钮点击', {
                            button: describeElement(btn),
                            gridState: captureGridState()
                        });
                    });
                });
            } catch (e) { /* 忽略错误 */ }
        });

        // 监控表单提交
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                logOperation('表单提交', {
                    form: describeElement(form),
                    gridState: captureGridState()
                });
            });
        });
    }

    // 捕获AG-Grid当前状态
    function captureGridState() {
        try {
            const cells = document.querySelectorAll('.ag-cell[col-id="qty"]');
            const cellData = Array.from(cells).map(cell => ({
                text: cell.textContent.trim(),
                title: cell.getAttribute('title'),
                className: cell.className,
                hasInput: !!cell.querySelector('input'),
                inputValue: cell.querySelector('input')?.value || null
            }));

            // 检查合计行
            const footerRow = document.querySelector('.ag-floating-bottom-row') ||
                             document.querySelector('.ag-row-footer') ||
                             document.querySelector('tr.sum-row');

            let footerData = null;
            if (footerRow) {
                const footerCell = footerRow.querySelector('[col-id="qty"]') ||
                                  footerRow.querySelector('td:nth-child(3)');

                if (footerCell) {
                    footerData = {
                        text: footerCell.textContent.trim(),
                        title: footerCell.getAttribute('title')
                    };
                }
            }

            return {
                cells: cellData,
                footer: footerData,
                timestamp: new Date().toISOString()
            };
        } catch (e) {
            return { error: e.message };
        }
    }

    // 创建并显示控制UI
    function createControlUI() {
        // 创建主控制面板
        const controlDiv = document.createElement('div');
        controlDiv.className = 'ag-grid-monitor-control';
        controlDiv.style.position = 'fixed';
        controlDiv.style.bottom = '10px';
        controlDiv.style.right = '10px';
        controlDiv.style.zIndex = '9999';
        controlDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        controlDiv.style.padding = '10px';
        controlDiv.style.borderRadius = '5px';
        controlDiv.style.color = 'white';
        controlDiv.style.fontSize = '12px';
        controlDiv.style.transition = 'all 0.3s ease';
        controlDiv.style.transform = 'translateX(0)';
        controlDiv.style.opacity = '1';

        // 创建一个固定位置的显示/隐藏按钮容器
        const toggleContainer = document.createElement('div');
        toggleContainer.style.position = 'fixed';
        toggleContainer.style.bottom = '10px';
        toggleContainer.style.right = '10px';
        toggleContainer.style.zIndex = '10000';
        toggleContainer.style.padding = '5px';

        // 创建显示/隐藏按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-monitor-btn';
        toggleBtn.style.padding = '2px 8px';
        toggleBtn.style.backgroundColor = '#4CAF50';
        toggleBtn.style.border = 'none';
        toggleBtn.style.color = 'white';
        toggleBtn.style.borderRadius = '3px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.textContent = '隐藏';

        toggleContainer.appendChild(toggleBtn);

        controlDiv.innerHTML = `
            <div style="margin-bottom:5px;">📊 监控器</div>
            <div style="margin-bottom:10px;display:flex;align-items:center;">
                <label style="margin-right:5px;">背景颜色:</label>
                <input type="color" id="bg-color-picker" value="#000000" style="width:50px;cursor:pointer;">
                <input type="range" id="bg-opacity" min="0" max="100" value="80" style="width:60px;margin:0 5px;">
                <span id="opacity-value">80%</span>
            </div>
            <button id="capture-state-btn" style="margin-right:5px;">捕获当前状态</button>
            <button id="export-log-btn" style="margin-right:5px;">导出日志</button>
            <button id="export-console-btn">导出控制台</button>
            <div id="status-text" style="margin-top:5px;font-size:10px;">已记录操作: 0 | 控制台日志: 0</div>
        `;

        document.body.appendChild(controlDiv);
        document.body.appendChild(toggleContainer);

        // 添加颜色选择器事件
        const colorPicker = document.getElementById('bg-color-picker');
        const opacitySlider = document.getElementById('bg-opacity');
        const opacityValue = document.getElementById('opacity-value');

        function updateBackgroundColor() {
            const color = colorPicker.value;
            const opacity = opacitySlider.value / 100;
            const r = parseInt(color.slice(1,3), 16);
            const g = parseInt(color.slice(3,5), 16);
            const b = parseInt(color.slice(5,7), 16);
            controlDiv.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            opacityValue.textContent = `${opacitySlider.value}%`;
        }

        colorPicker.addEventListener('input', updateBackgroundColor);
        opacitySlider.addEventListener('input', updateBackgroundColor);

        // 添加显示/隐藏切换事件
        toggleBtn.addEventListener('click', () => {
            const isVisible = controlDiv.style.opacity !== '0';
            if (isVisible) {
                controlDiv.style.transform = 'translateX(120%)';
                controlDiv.style.opacity = '0';
                toggleBtn.textContent = '显示';
                toggleBtn.style.backgroundColor = '#FF5722';
            } else {
                controlDiv.style.transform = 'translateX(0)';
                controlDiv.style.opacity = '1';
                toggleBtn.textContent = '隐藏';
                toggleBtn.style.backgroundColor = '#4CAF50';
            }
        });

        // 添加其他按钮事件
        document.getElementById('capture-state-btn').addEventListener('click', () => {
            const state = captureGridState();
            logOperation('手动捕获状态', state);
            alert('已捕获当前网格状态！');
        });

        document.getElementById('export-log-btn').addEventListener('click', () => {
            exportOperationLog();
        });

        // 新增：导出控制台日志按钮
        document.getElementById('export-console-btn').addEventListener('click', () => {
            exportConsoleLog();
        });

        // 周期性更新状态
        setInterval(() => {
            document.getElementById('status-text').textContent = `已记录操作: ${operationLog.length} | 控制台日志: ${consoleLog.length}`;
        }, 1000);
    }

    // 替换exportOperationLog函数，使用更简单的方法导出日志
    function exportOperationLog() {
        try {
            console.log('正在准备日志导出...');

            // 创建一个简单版本的日志 - 只保留基础信息
            const simplifiedLog = operationLog.map(entry => {
                // 基础结构
                const simplified = {
                    time: entry.time,
                    type: entry.type,
                    timestamp: entry.timestamp,
                    details: {}
                };

                // 简化处理details对象
                if (entry.details) {
                    if (entry.details.target) {
                        // 对于目标DOM元素，只保留描述文本
                        simplified.details.target = typeof entry.details.target === 'string'
                            ? entry.details.target
                            : '元素数据'; // 如果不是字符串，简化处理
                    }

                    // 复制简单值
                    ['key', 'code', 'value', 'x', 'y', 'url', 'method', 'status', 'attribute',
                     'oldValue', 'newValue', 'instance', 'method', 'count', 'rowCount', 'hasAPI'].forEach(key => {
                        if (entry.details[key] !== undefined) {
                            simplified.details[key] = entry.details[key];
                        }
                    });

                    // 处理网络请求数据
                    if (entry.details.body) {
                        simplified.details.body = typeof entry.details.body === 'string'
                            ? entry.details.body
                            : JSON.stringify(entry.details.body);
                    }

                    if (entry.details.data) {
                        simplified.details.data = typeof entry.details.data === 'string'
                            ? entry.details.data
                            : JSON.stringify(entry.details.data);
                    }

                    // 处理网格状态
                    if (entry.details.gridState) {
                        if (entry.details.gridState.cells) {
                            simplified.details.gridState = {
                                cells: entry.details.gridState.cells.map(cell => ({
                                    text: cell.text || '',
                                    title: cell.title || '',
                                    hasInput: cell.hasInput || false,
                                    inputValue: cell.inputValue || ''
                                })),
                                footer: entry.details.gridState.footer ? {
                                    text: entry.details.gridState.footer.text || '',
                                    title: entry.details.gridState.footer.title || ''
                                } : null
                            };
                        } else {
                            simplified.details.gridState = '无网格状态数据';
                        }
                    }

                    // 对于元素添加/移除操作
                    if (entry.details.parent) {
                        simplified.details.parent = typeof entry.details.parent === 'string'
                            ? entry.details.parent
                            : '父元素数据';
                    }

                    if (entry.details.added) {
                        simplified.details.added = typeof entry.details.added === 'string'
                            ? entry.details.added
                            : '添加的元素';
                    }

                    if (entry.details.removed) {
                        simplified.details.removed = entry.details.removed;
                    }
                }

                return simplified;
            });

            // 添加控制台日志
            const exportData = {
                operations: simplifiedLog,
                console: consoleLog,
                metadata: {
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userAgent: navigator.userAgent
                }
            };

            console.log(`准备导出${simplifiedLog.length}条操作记录和${consoleLog.length}条控制台日志`);

            // 创建下载链接
            try {
                const logJSON = JSON.stringify(exportData, null, 2);
                const blob = new Blob([logJSON], {type: 'application/json'});
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `网页操作记录-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;

                // 确保元素添加到DOM
                document.body.appendChild(a);

                // 模拟点击并跟踪状态
                console.log('触发下载...');
                a.click();
                console.log('下载已触发');

                // 清理
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    console.log('下载链接已清理');
                }, 1000);

                alert('日志导出成功！');
            } catch (e) {
                console.error('创建下载链接时出错:', e);
                alert(`导出失败: ${e.message}`);
            }
        } catch (e) {
            console.error('导出日志时出错:', e);
            alert(`导出日志失败: ${e.message}`);
        }
    }

    // 新增：单独导出控制台日志
    function exportConsoleLog() {
        try {
            console.log('正在准备控制台日志导出...');

            // 创建下载链接
            try {
                const logJSON = JSON.stringify(consoleLog, null, 2);
                const blob = new Blob([logJSON], {type: 'application/json'});
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `控制台日志-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;

                // 确保元素添加到DOM
                document.body.appendChild(a);

                // 模拟点击并跟踪状态
                console.log('触发下载...');
                a.click();
                console.log('下载已触发');

                // 清理
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    console.log('下载链接已清理');
                }, 1000);

                alert('控制台日志导出成功！');
            } catch (e) {
                console.error('创建下载链接时出错:', e);
                alert(`导出失败: ${e.message}`);
            }
        } catch (e) {
            console.error('导出控制台日志时出错:', e);
            alert(`导出控制台日志失败: ${e.message}`);
        }
    }

    // 启动所有监控
    function startMonitoring() {
        // 直接启动所有监控，不再检测是否存在AG-Grid
        initMonitoring();
    }

    function initMonitoring() {
        // 先启动控制台监控，这样可以捕获其他监控模块的日志
        setupConsoleMonitoring();
        
        setupNetworkMonitoring();
        setupDomChanges();
        setupEventMonitoring();
        setupAgGridMonitoring();
        monitorSaveButton();

        // 创建用户界面
        setTimeout(createControlUI, 1000);

        // 自动捕获初始状态
        setTimeout(() => {
            logOperation('初始状态', captureGridState());
        }, 2000);

        // 提供全局访问
        window.webMonitor = {
            getLog: () => operationLog,
            getConsoleLog: () => consoleLog,
            exportLog: exportOperationLog,
            exportConsole: exportConsoleLog,
            captureState: captureGridState,
            config: config
        };

        // 使用说明
        console.log('网页操作监控器已启动');
        console.log('使用方法:');
        console.log('1. 正常进行网页操作，脚本会自动记录所有动作');
        console.log('2. 操作完成后，点击右下角的"导出日志"按钮获取完整记录');
        console.log('3. 点击"导出控制台"按钮获取控制台日志');
        console.log('4. 使用 webMonitor.captureState() 随时捕获当前状态');
        console.log('5. 使用 webMonitor.exportLog() 随时导出日志');
        console.log('6. 使用 webMonitor.exportConsole() 随时导出控制台日志');
    }

    // 开始监控
    startMonitoring();
})();