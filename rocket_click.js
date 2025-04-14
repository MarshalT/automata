// ==UserScript==
// @name         Automata 火箭自动点击器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动点击zkwasm-automata平台上的火箭图标和确认按钮
// @author       Automata团队
// @match        https://automata.zkplay.app/*
// @match        https://*.automata.compute.studio/*
// @match        http://114.119.173.203/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://github.com/MarshalT/automata/raw/main/rocket_click.js
// @downloadURL  https://github.com/MarshalT/automata/raw/main/rocket_click.js
// ==/UserScript==

// 测试脚本 - 火箭图像和确认按钮点击功能
(function() {
    'use strict';

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
            console.error(`[火箭点击器] 模拟点击失败: ${e.message}`);
            return false;
        }
    }

    // 监控和点击火箭图像
    function testRocketImage() {
        console.log('[火箭点击器] 开始测试火箭图像点击...');
        const rocketElements = document.querySelectorAll('.rocket-image');
        
        if (rocketElements && rocketElements.length > 0) {
            console.log(`[火箭点击器] 发现 ${rocketElements.length} 个火箭图像元素`);
            
            for (const rocket of rocketElements) {
                try {
                    if (simulateClick(rocket)) {
                        console.log('[火箭点击器] 成功点击火箭图像');
                        // 火箭图像点击成功后，延迟2秒再点击确认按钮
                        setTimeout(testConfirmButton, 2000);
                        return; // 只点击第一个找到的火箭图像
                    } else {
                        console.log('[火箭点击器] 点击火箭图像失败');
                    }
                } catch (e) {
                    console.error(`[火箭点击器] 点击火箭图像时出错: ${e.message}`);
                }
            }
        } else {
            console.log('[火箭点击器] 未找到火箭图像元素');
            // 如果没找到火箭图像，也尝试点击确认按钮
            // setTimeout(testConfirmButton, 2000);
        }
    }

    // 监控和点击确认按钮
    function testConfirmButton() {
        console.log('[火箭点击器] 开始测试确认按钮点击...');
        
        // 尝试多种可能的确认按钮选择器
        const selectors = [
            '.rocket-popup-confirm-button .confirm-button-scale .image-button',
            '.rocket-popup-confirm-button button',
            '.confirm-button-scale .image-button',
            '.confirm-button-scale button',
            'button.image-button',
            '.popup-window button',
            '.popup-container button',
            'button:contains("确认")',
            'button:contains("确定")',
            'button:contains("Confirm")',
            'button:contains("OK")'
        ];
        
        let foundButtons = false;
        
        for (const selector of selectors) {
            const buttons = document.querySelectorAll(selector);
            if (buttons && buttons.length > 0) {
                console.log(`[火箭点击器] 使用选择器 "${selector}" 找到 ${buttons.length} 个确认按钮`);
                foundButtons = true;
                
                for (const button of buttons) {
                    try {
                        if (simulateClick(button)) {
                            console.log('[火箭点击器] 成功点击确认按钮');
                            return; // 只点击第一个找到的确认按钮
                        } else {
                            console.log('[火箭点击器] 点击确认按钮失败');
                        }
                    } catch (e) {
                        console.error(`[火箭点击器] 点击确认按钮时出错: ${e.message}`);
                    }
                }
            }
        }
        
        if (!foundButtons) {
            console.log('[火箭点击器] 未找到确认按钮');
        }
    }

    // 定义一个函数来运行测试
    function runTest() {
        console.log('[火箭点击器] 开始执行测试...');
        testRocketImage();
    }

    // 立即运行一次测试
    runTest();
    
    // 然后每10秒运行一次测试
    setInterval(runTest, 10000);

})();
