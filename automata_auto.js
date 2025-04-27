#!/usr/bin/env node
// 启用严格模式，防止使用未声明的变量等
'use strict';

const { ethers } = require('ethers');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sha256 = require('sha256');
const BN = require('bn.js');

const game = require('./game_simplified.js');

// 导入delphinus-curves库
const { PrivateKey, bnToHexLe, CurveField, Point } = require('./atm/delphinus-curves/altjubjub.js');
const { Field } = require('./atm/delphinus-curves/field.js');
const { poseidon } = require('./atm/delphinus-curves/poseidon.js');

// 配置
const config = {
    // AUTOMATA API端点
    apiEndpoint: 'https://rpc.zkwasm-automata.zkwasm.ai/',
    queryEndpoint: 'http://114.119.173.203:8085',
    configEndpoint: 'http://114.119.173.203:8085',
    signingMessage: '0xAUTOMATA', // 要签名的消息
    walletConfigPath: path.join(__dirname, 'wallet_config.json')
};

// 辅助函数: 延迟执行
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 将字节转换为十六进制
function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// SHA-256哈希函数
function sha256Hash(data) {
    // 如果输入是字符串，将其转换为Buffer
    const buffer = typeof data === 'string'
        ? Buffer.from(data)
        : Buffer.from(data);

    // 使用Node.js的crypto模块计算SHA-256哈希
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return hash;
}

// 添加创建命令函数
function createCommand(nonce, command, params) {
    console.log('创建命令...');
    console.log('- Nonce:', nonce);
    console.log('- Command:', command);
    console.log('- Params:', params);

    // 参数必须是BigInt数组
    const paramsArray = Array.isArray(params) ? params : [params];

    // 计算命令值：nonce << 16 + (params.length + 1) << 8 + command
    const cmd = (BigInt(nonce) << 16n) + (BigInt(paramsArray.length + 1) << 8n) + BigInt(command);

    // 创建缓冲区，首元素是命令，后面是参数
    let buf = [cmd];
    buf = buf.concat(paramsArray.map(p => BigInt(p)));

    // 创建BigUint64Array
    const barray = new BigUint64Array(buf.length);
    for (let i = 0; i < buf.length; i++) {
        barray[i] = buf[i];
    }

    console.log('命令创建成功，长度:', barray.length);
    return barray;
}

// 创建提款命令函数
function createWithdrawCommand(nonce, commandWithdraw, address, tokenIndex, amount) {
    console.log('创建提款命令...');
    console.log('- 地址:', address);
    console.log('- 代币索引:', tokenIndex);
    console.log('- 金额:', amount);

    // 移除地址前缀并转换为字节数组
    const cleanAddress = address.startsWith('0x') ? address.substring(2) : address;
    const addressBytes = [];
    for (let i = 0; i < cleanAddress.length; i += 2) {
        addressBytes.push(parseInt(cleanAddress.substring(i, i + 2), 16));
    }

    // 按照convention.ts中的方法处理地址
    const firstLimbBytes = addressBytes.slice(0, 4).reverse();
    const sndLimbBytes = addressBytes.slice(4, 12).reverse();
    const thirdLimbBytes = addressBytes.slice(12, 20).reverse();

    const firstLimb = BigInt('0x' + bytesToHex(firstLimbBytes));
    const sndLimb = BigInt('0x' + bytesToHex(sndLimbBytes));
    const thirdLimb = BigInt('0x' + bytesToHex(thirdLimbBytes));

    console.log('地址处理结果:');
    console.log('- 第一部分:', firstLimb.toString(16));
    console.log('- 第二部分:', sndLimb.toString(16));
    console.log('- 第三部分:', thirdLimb.toString(16));

    // 创建命令
    return createCommand(
        nonce,
        commandWithdraw,
        [BigInt(tokenIndex), (firstLimb << 32n) + BigInt(amount), sndLimb, thirdLimb]
    );
}

// 读取钱包配置
function readWalletConfig() {
    try {
        const configData = fs.readFileSync(config.walletConfigPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('读取钱包配置失败:', error.message);
        throw error;
    }
}

// 连接钱包
async function connectWallet() {
    console.log('正在连接钱包...');

    // 读取钱包配置获取私钥
    const walletConfig = readWalletConfig();
    if (!walletConfig.privateKey) {
        throw new Error('钱包配置中未找到私钥');
    }

    console.log('使用配置文件中的私钥');

    // 使用JSON-RPC连接到以太坊网络
    const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    const wallet = new ethers.Wallet(walletConfig.privateKey, provider);

    console.log(`钱包地址: ${wallet.address}`);
    return wallet;
}

// 获取钱包签名
async function getSignature(wallet) {
    console.log(`请求签名消息: ${config.signingMessage}`);
    const signature = await wallet.signMessage(config.signingMessage);
    console.log(`签名结果: ${signature}`);
    return signature;
}

// 实现sign函数 - 基于atm/sign.ts中的实现
function sign(cmd, prikey) {
    console.log('开始使用私钥签名...');
    // 将字符串命令转换为BigUint64Array
    let cmdArray;
    if (typeof cmd === 'string') {
        console.log('- 消息(字符串):', cmd);
        // 将字符串转换为字节数组
        const encoder = new TextEncoder();
        const bytes = encoder.encode(cmd);

        // 创建BigUint64Array，每8个字节一个元素
        const length = Math.ceil(bytes.length / 8);
        cmdArray = new BigUint64Array(length);

        // 填充数组
        for (let i = 0; i < length; i++) {
            let value = 0n;
            for (let j = 0; j < 8; j++) {
                const byteIndex = i * 8 + j;
                if (byteIndex < bytes.length) {
                    // 将字节值左移相应位置并添加到value
                    value |= BigInt(bytes[byteIndex]) << BigInt(j * 8);
                }
            }
            cmdArray[i] = value;
        }
        console.log('- 转换后的消息数组:', Array.from(cmdArray).map(n => n.toString()));
    } else if (Array.isArray(cmd)) {
        // 如果输入是普通数组，将其转换为BigUint64Array
        console.log('- 消息(数组):', cmd);
        cmdArray = new BigUint64Array(cmd.length);
        for (let i = 0; i < cmd.length; i++) {
            cmdArray[i] = BigInt(cmd[i]);
        }
    } else {
        // 假设已经是BigUint64Array
        cmdArray = cmd;
    }

    console.log('- 消息数组长度:', cmdArray.length);

    // 创建私钥对象
    let pkey = PrivateKey.fromString(prikey);
    let r = pkey.r();
    let R = Point.base.mul(r);

    // 计算哈希
    let H;
    let fvalues = [];
    let h = 0n;

    for (let i = 0; i < cmdArray.length;) {
        let v = 0n;
        let j = 0;
        for (; j < 3; j++) {
            if (i + j < cmdArray.length) {
                v = v + (cmdArray[i + j] << (64n * BigInt(j)));
                h = h + (cmdArray[i + j] << (64n * BigInt(j + i)));
            }
        }
        i = i + j;
        fvalues.push(new Field(new BN(v.toString(10), 10)));
    }

    // 使用Poseidon哈希函数
    H = poseidon(fvalues).v;
    let hbn = new BN(H.toString(10));
    let msgbn = new BN(h.toString(10));

    // 计算签名
    let S = r.add(pkey.key.mul(new CurveField(hbn)));
    let pubkey = pkey.publicKey;

    // 返回签名数据
    const data = {
        msg: bnToHexLe(msgbn, cmdArray.length * 8),
        hash: bnToHexLe(hbn),
        pkx: bnToHexLe(pubkey.key.x.v),
        pky: bnToHexLe(pubkey.key.y.v),
        sigx: bnToHexLe(R.x.v),
        sigy: bnToHexLe(R.y.v),
        sigr: bnToHexLe(S.v),
    };

    return data;
}

// 从签名派生L2账户 - 完全按照reduxstate.ts中的方式
function deriveL2AccountFromSignature(signature) {
    console.log('开始从签名派生L2账户公钥...');
    try {
        // 完全按照reduxstate.ts中的loginL2Account实现
        // 取前17字节(34个字符)作为私钥
        // console.log('\n使用签名前17字节作为私钥');
        const privateKeyHex = signature.substring(0, 34);
        // console.log(`签名前17字节: ${privateKeyHex}`);

        // 创建L2AccountInfo实例
        const l2Account = new L2AccountInfo(privateKeyHex);

        // 获取公钥和十六进制字符串形式 
        const pubkeyHex = l2Account.toHexStr();
        // console.log(`派生的L2公钥(大端序): ${pubkeyHex}`);

        const pubkeyLE = bnToHexLe(l2Account.pubkey, 32);
        // console.log(`派生的L2公钥(小端序): ${pubkeyLE}`);

        return {
            success: true,
            pubkey: pubkeyLE,
            privateKeyHex: privateKeyHex.startsWith('0x') ? privateKeyHex.substring(2) : privateKeyHex,
        };
    } catch (error) {
        console.error('派生L2账户公钥失败:', error.message);
        return {
            success: false,
            message: `派生失败: ${error.message}`
        };
    }
}

// 从reduxstate.ts中的L2AccountInfo类
class L2AccountInfo {
    #prikey;
    pubkey;
    pubkeyy;

    constructor(address0x) {
        // 移除0x前缀如果存在
        this.#prikey = address0x.startsWith('0x') ? address0x.substring(2) : address0x;
        console.log('私钥:', this.#prikey);
        const pkey = PrivateKey.fromString(this.#prikey);
        this.pubkey = pkey.publicKey.key.x.v;
        this.pubkeyy = pkey.publicKey.key.y.v;
    }

    getPrivateKey() {
        return this.#prikey;
    }

    toHexStr() {
        console.log('公钥X:', this.pubkey.toString("hex"));
        return this.pubkey.toString("hex");
    }
    toHexStr1() {
        console.log('公钥Y:', this.pubkeyy.toString("hex"));
        return this.pubkeyy.toString("hex");
    }
}

// ZKWasmAppRpc类处理与后端API的通信
class ZKWasmAppRpc {
    constructor(endpoint, queryEndpoint, configEndpoint) {
        this.endpoint = endpoint;
        this.queryEndpoint = queryEndpoint;
        this.configEndpoint = configEndpoint;
        console.log('ZKWasmAppRpc初始化:', {
            endpoint,
            queryEndpoint,
            configEndpoint
        });
    }

    // 查询用户状态
    async queryState(pkx) {
        try {
            console.log('查询用户状态, PKX:', pkx);
            const response = await axios.post(`${this.queryEndpoint}/query`, { pkx });
            if (!response.data) {
                throw new Error('查询状态返回空数据');
            }
            if (response.data.code === 500) {
                throw new Error(`查询状态错误: ${response.data.msg || '未知错误'}`);
            }
            console.log('状态查询成功:', response.data);
            return response.data;
        } catch (error) {
            console.error('查询状态失败:', error.message);
            throw error;
        }
    }

    // 查询配置
    async queryConfig() {
        try {
            console.log('查询配置...');
            const response = await axios.post(`${this.configEndpoint}/queryConfig`, {});
            if (!response.data) {
                throw new Error('查询配置返回空数据');
            }
            console.log('配置查询成功:', response.data);
            return response.data;
        } catch (error) {
            console.error('查询配置失败:', error.message);
            throw error;
        }
    }



    // 发送交易 
    async sendWithdrawTransaction(signatureData) {
        try {
            console.log('发送...');
            console.log('- 接口:', `${this.queryEndpoint}/send`);
            // 发送POST请求到指定接口
            const response = await axios.post(`${this.queryEndpoint}/send`, signatureData);

            if (!response.data) {
                throw new Error('发送提款交易返回空数据');
            }
            if (response.data.code === 500) {
                throw new Error(`发送交易错误: ${response.data.msg || '未知错误'}`);
            }

            console.log('交易发送成功:', response.data);
            return response.data;
        } catch (error) {
            console.error('发送交易失败:', error.message);
            throw error;
        }
    }



    async sendandsign(cmd, privateKey) {
        // 将命令转换为十六进制字符串
        const commandBytes = new Uint8Array(cmd.length * 8);
        const dataView = new DataView(commandBytes.buffer);

        for (let i = 0; i < cmd.length; i++) {
            dataView.setBigUint64(i * 8, cmd[i], true); // true = littleEndian
        }

        let commandHex = '';
        for (let i = 0; i < commandBytes.length; i++) {
            commandHex += commandBytes[i].toString(16).padStart(2, '0');
        }

        console.log('命令十六进制表示:', '0x' + commandHex);
        console.log('命令:', Array.from(cmd).map(n => '0x' + n.toString(16)));

        const signatureData = sign(cmd, privateKey);
        // console.log('签名结果:', signatureData);
        // 构建交易请求参数
        const buynewprogramParams = {
            msg: commandHex,
            hash: signatureData.hash,
            pkx: signatureData.pkx,
            pky: signatureData.pky,
            sigx: signatureData.sigx,
            sigy: signatureData.sigy,
            sigr: signatureData.sigr
        };

        const state = await this.sendWithdrawTransaction(buynewprogramParams)
        return state;
        console.log('命令发送成功:', state);
    }

    // 查询任务状态
    async queryJobStatus(jobId) {
        try {
            console.log('查询任务状态, JobID:', jobId);
            const response = await axios.post(`${this.endpoint}/queryJobStatus`, { job_id: jobId });

            if (!response.data) {
                throw new Error('查询任务状态返回空数据');
            }
            console.log('任务状态:', response.data);
            return response.data;
        } catch (error) {
            console.error('查询任务状态失败:', error.message);
            throw error;
        }
    }
}


// 等待任务完成
async function waitForJobCompletion(rpc, jobId, maxAttempts = 30, interval = 2000) {
    console.log(`等待任务完成, JobID: ${jobId}, 最大尝试次数: ${maxAttempts}, 间隔: ${interval}ms`);
    let attempts = 0;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            const status = await rpc.queryJobStatus(jobId);
            console.log(`任务状态 (${attempts}/${maxAttempts}):`, status);

            if (status && status.finished) {
                console.log('任务已完成!');
                return status;
            }

            if (status && status.step) {
                console.log(`当前步骤: ${status.step}, 进度: ${status.currentSubStep}/${status.totalSubSteps}`);
            }

            console.log(`等待 ${interval}ms 后再次检查...`);
            await delay(interval);
        } catch (error) {
            console.error(`检查任务状态时出错 (${attempts}/${maxAttempts}):`, error.message);
            await delay(interval);
        }
    }

    console.warn(`达到最大尝试次数 (${maxAttempts}), 任务可能仍在处理中`);
    throw new Error('等待任务完成超时');
}

// 派生L2账户
async function deriveL2Account(signature) {
    // 使用签名派生L2账户公钥
    const result = deriveL2AccountFromSignature(signature);

    if (!result.success) {
        console.error('L2账户派生失败:', result.message);
        return {
            success: false,
            message: result.message
        };
    }

    // 格式化返回结果
    return {
        success: true,
        publicKey: result.pubkey,
        privateKeyHex: result.privateKeyHex,
        method: result.message
    };
}

// 生成PKX - 通过L2账户公钥生成PKX值
async function getPkx(l2PublicKey) {
    try {
        console.log('正在生成PKX...');
        console.log('使用的L2账户公钥:', l2PublicKey);

        // 直接使用L2公钥生成PKX - 已经是小端序格式的十六进制字符串
        const pkx = l2PublicKey.startsWith('0x')
            ? l2PublicKey.substring(2)
            : l2PublicKey;

        console.log('生成的PKX值:', pkx);

        return {
            success: true,
            data: pkx
        };
    } catch (error) {
        console.error('生成PKX失败:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}


// 从convention.ts复制的PlayerConvention类
class PlayerConvention {
    constructor(key, rpc) {
        this.processingKey = key;
        this.rpc = rpc;
    }

    async getConfig() {
        let config = await this.rpc.queryConfig();
        return config;
    }

    async getState() {
        try {
            // 获取状态响应
            console.log('查询状态...');
            let state = await this.rpc.queryState(this.processingKey);

            // 解析响应确保它是简单的JSON对象
            const parsedState = JSON.parse(JSON.stringify(state));

            // 从解析的响应中提取数据
            if (parsedState.data) {
                const data = JSON.parse(parsedState.data);
                return data;
            }
            return parsedState;
        } catch (error) {
            console.error('获取状态失败:', error.message);
            throw error;
        }
    }

    async getNonce() {
        console.log(`获取nonce...`);

        try {
            const data = await this.getState();
            console.log('(Data-GetNonce)', JSON.stringify(data));
            if (data.player && data.player.nonce) {
                let nonce = BigInt(data.player.nonce);
                return nonce;
            }
            return 1n; // 默认nonce值
        } catch (error) {
            console.error('获取nonce失败:', error.message);
            return 1n; // 默认nonce值
        }
    }

    async deposit(pid_1, pid_2, tokenIndex, amount, privateKey) {
        let nonce = await this.getNonce();
        try {
            console.log('开始存款操作...');
            console.log('- Nonce:', nonce.toString());
            console.log('- PID_1:', pid_1.toString());
            console.log('- PID_2:', pid_2.toString());
            console.log('- 代币索引:', tokenIndex.toString());
            console.log('- 金额:', amount.toString());


            const cmd = createCommand(nonce, game.CMD_DEPOSIT, [pid_1, pid_2, tokenIndex, amount]);
            console.log('存款命令创建成功，长度:', cmd.length);

            // 将命令转换为十六进制字符串
            const commandBytes = new Uint8Array(cmd.length * 8);
            const dataView = new DataView(commandBytes.buffer);

            for (let i = 0; i < cmd.length; i++) {
                dataView.setBigUint64(i * 8, cmd[i], true); // true = littleEndian
            }

            let commandHex = '';
            for (let i = 0; i < commandBytes.length; i++) {
                commandHex += commandBytes[i].toString(16).padStart(2, '0');
            }

            console.log('命令十六进制表示:', '0x' + commandHex);
            console.log('购买新程序命令:', Array.from(cmd).map(n => '0x' + n.toString(16)));

            const signatureData = sign(cmd, privateKey);
            console.log('签名结果:', signatureData);

            // 构建交易请求参数
            const buynewprogramParams = {
                msg: commandHex,
                hash: signatureData.hash,
                pkx: signatureData.pkx,
                pky: signatureData.pky,
                sigx: signatureData.sigx,
                sigy: signatureData.sigy,
                sigr: signatureData.sigr
            };

            console.log('购买新程序交易参数:', buynewprogramParams);

            // 使用新方法发送交易
            const state = await this.rpc.sendWithdrawTransaction(buynewprogramParams);
            console.log('购买新程序交易发送成功:', state);
            return state;


        } catch (e) {
            console.error('存款失败:', e.message);
            console.log('存款参数:', { pid_1, pid_2, tokenIndex, amount });
            throw e;
        }
    }

    async buynewprogram(privateKey) {
        let nonce = await this.getNonce();
        try {
            console.log('开始购买新程序...');
            console.log('- Nonce:', nonce.toString());

            // 修改命令ID为5，而不是之前的1
            const cmd = createCommand(
                nonce, game.CMD_INSTALL_CARD, []
            );

            console.log('购买新程序命令创建成功，长度:', cmd.length);

            // 将命令转换为十六进制字符串
            const commandBytes = new Uint8Array(cmd.length * 8);
            const dataView = new DataView(commandBytes.buffer);

            for (let i = 0; i < cmd.length; i++) {
                dataView.setBigUint64(i * 8, cmd[i], true); // true = littleEndian
            }

            let commandHex = '';
            for (let i = 0; i < commandBytes.length; i++) {
                commandHex += commandBytes[i].toString(16).padStart(2, '0');
            }

            console.log('命令十六进制表示:', '0x' + commandHex);
            console.log('购买新程序命令:', Array.from(cmd).map(n => '0x' + n.toString(16)));

            const signatureData = sign(cmd, privateKey);
            console.log('签名结果:', signatureData);

            // 构建交易请求参数
            const buynewprogramParams = {
                msg: commandHex,
                hash: signatureData.hash,
                pkx: signatureData.pkx,
                pky: signatureData.pky,
                sigx: signatureData.sigx,
                sigy: signatureData.sigy,
                sigr: signatureData.sigr
            };

            console.log('购买新程序交易参数:', buynewprogramParams);

            // 使用新方法发送交易
            const state = await this.rpc.sendWithdrawTransaction(buynewprogramParams);
            console.log('购买新程序交易发送成功:', state);
            return state;


        } catch (e) {
            console.error('购买新程序失败:', e.message);

            throw e;
        }
    }


    //创建机器人

    async createRobot(privateKey, programIndexes, objectIndex, isCreating) {
        let nonce = await this.getNonce();

        console.log(`程序索引: ${programIndexes.join(', ')}`);
        console.log(`对象索引: ${objectIndex}`);
        console.log(`是否创建新对象: ${isCreating}`);

        // 创建安装程序命令
        const cmd = game.getInstallProgramTransactionCommandArray(
            nonce,
            programIndexes,
            objectIndex,
            isCreating
        );

        console.log('创建机器人命令创建成功，长度:', cmd.length);

        // 将命令转换为十六进制字符串
        const commandBytes = new Uint8Array(cmd.length * 8);
        const dataView = new DataView(commandBytes.buffer);

        for (let i = 0; i < cmd.length; i++) {
            dataView.setBigUint64(i * 8, cmd[i], true); // true = littleEndian
        }

        let commandHex = '';
        for (let i = 0; i < commandBytes.length; i++) {
            commandHex += commandBytes[i].toString(16).padStart(2, '0');
        }

        console.log('命令十六进制表示:', '0x' + commandHex);
        console.log('创建机器人命令     :', Array.from(cmd).map(n => '0x' + n.toString(16)));

        const signatureData = sign(cmd, privateKey);
        console.log('签名结果:', signatureData);

        // 构建交易请求参数
        const buynewprogramParams = {
            msg: commandHex,
            hash: signatureData.hash,
            pkx: signatureData.pkx,
            pky: signatureData.pky,
            sigx: signatureData.sigx,
            sigy: signatureData.sigy,
            sigr: signatureData.sigr
        };

        console.log('创建机器人交易参数:', buynewprogramParams);

        // 使用新方法发送交易
        const state = await this.rpc.sendWithdrawTransaction(buynewprogramParams);
        console.log('购买新程序交易发送成功:', state);
        return state;


    }


    async rocket(privateKey) {
        let nonce = await this.getNonce();
        const cmd = game.getCollectEnergyTransactionCommandArray(nonce);


        console.log('收取能量命令创建成功，长度:', cmd.length);

        const state = await this.rpc.sendandsign(cmd, privateKey);
        return state;
    }



    async withdrawRewards(privateKey, address, tokenIndex, amount) {
        let nonce = await this.getNonce();
        try {
            console.log('开始提款操作...');
            console.log('- Nonce:', nonce.toString());
            console.log('- 地址:', address);

            console.log('- 代币索引:', tokenIndex.toString());
            console.log('- 金额:', amount.toString());

            // 创建提款命令
            const cmd = createWithdrawCommand(
                nonce,
                game.CMD_WITHDRAW,
                address,
                tokenIndex,
                amount
            );




            console.log('提款命令:', Array.from(cmd).map(n => '0x' + n.toString(16)));


            // 将命令转换为十六进制字符串格式
            let commandHex = '';
            const commandBytes = new Uint8Array(cmd.length * 8);
            const dataView = new DataView(commandBytes.buffer);

            for (let i = 0; i < cmd.length; i++) {
                dataView.setBigUint64(i * 8, cmd[i], true); // true = littleEndian
            }

            for (let i = 0; i < commandBytes.length; i++) {
                commandHex += commandBytes[i].toString(16).padStart(2, '0');
            }

            console.log('命令十六进制表示:', '0x' + commandHex);

            // 使用私钥签名
            const signatureData = sign(cmd, privateKey);
            console.log('签名结果:', signatureData);

            // 构建提款交易请求参数
            const withdrawParams = {
                msg: commandHex,
                hash: signatureData.hash,
                pkx: signatureData.pkx,
                pky: signatureData.pky,
                sigx: signatureData.sigx,
                sigy: signatureData.sigy,
                sigr: signatureData.sigr
            };

            console.log('提款交易参数:', withdrawParams);

            // 使用新方法发送提款交易
            const state = await this.rpc.sendWithdrawTransaction(withdrawParams);
            console.log('提款交易发送成功:', state);
            return state;
        } catch (e) {
            console.error('提款失败:', e.message);
            console.log('提款地址:', address);
            throw e;
        }
    }


    async UpgradeBot(privateKey, selectingCreatureIndex, attrIndex) {

        const nonce = await this.getNonce();

        // 创建升级机器人命令
        const cmd = game.getUpgradeBotTransactionCommandArray(nonce, selectingCreatureIndex, attrIndex);

        const state = await this.rpc.sendandsign(cmd, privateKey);
        return state;

    }

}


// 主函数 - 连接钱包、获取签名、派生L2账户、查询状态
async function main() {
    console.log('开始执行...');
    const rpc = new ZKWasmAppRpc(config.apiEndpoint, config.queryEndpoint, config.configEndpoint);

    // 1. 连接钱包
    const wallet = await connectWallet();
    console.log('钱包连接成功:', wallet.address);

    // 2. 获取钱包签名
    const signature = await getSignature(wallet);
    console.log('获取到签名:', signature);

    // 3. 从签名派生L2账户公钥
    const l2Account = await deriveL2Account(signature);
    if (!l2Account.success) {
        throw new Error(`L2账户派生失败: ${l2Account.message}`);
    }

    // 4. 基于L2公钥生成PKX
    const pkxResult = await getPkx(l2Account.publicKey);
    if (!pkxResult.success) {
        throw new Error(`PKX生成失败: ${pkxResult.error}`);
    }

    console.log('PKX生成成功:', pkxResult.data);


    // 9. 示例：初始化PlayerConvention
    console.log('\n==== 示例4: 初始化PlayerConvention ====');

    const player = new PlayerConvention(
        pkxResult.data, // 使用派生的PKX
        rpc
    );
    console.log('PlayerConvention已初始化');



    // 获取状态
    const userinfo = await player.getState();

    //购买程序
    for (let i = 0; i < 2; i++) {

        const buynewprogramResult = await player.buynewprogram(
            l2Account.privateKeyHex
        );
        console.log('购买新程序结果:', buynewprogramResult);
        console.log(i.toString() + '次');
        await delay(1000);
    }


    // 创建机器人
    const programIndexes = [1, 0, 1, 2, 0, 1, 1, 2]; // 示例程序索引
    const objectIndex = 0; // 示例对象索引

    const createRobotResult = await player.createRobot(
        l2Account.privateKeyHex,
        programIndexes,
        objectIndex,
        false // 创建新对象
    );
    console.log('创建机器人结果:', createRobotResult);


    const rocketResult = await player.rocket(l2Account.privateKeyHex);
    console.log('收集能量结果:', rocketResult);


    //升级机器人
    for (let i = 0; i < 31; i++) {
        const upgradeBotResult = await player.UpgradeBot(l2Account.privateKeyHex, 0, 1);
        console.log('升级机器人结果:', upgradeBotResult);

    }

    for (let i = 0; i < 31; i++) {
        const upgradeBotResult = await player.UpgradeBot(l2Account.privateKeyHex, 0, 2);
        console.log('升级机器人结果:', upgradeBotResult);

    }


    for (let i = 0; i < 31; i++) {
        const upgradeBotResult = await player.UpgradeBot(l2Account.privateKeyHex, 0, 3);
        console.log('升级机器人结果:', upgradeBotResult);

    }

    //提款
    const withdrawResult = await player.withdrawRewards(
        l2Account.privateKeyHex,
        wallet.address,
        0n,
        100, // 
        true
    );
    console.log('提款结果:', withdrawResult);





    console.log('脚本执行完成');

    return {
        success: true,
        wallet: wallet.address,
        l2PublicKey: l2Account.publicKey,
        pkx: pkxResult.data,
    };
}

// Node.js环境下直接执行
main().then(result => {
    console.log('执行结果:', JSON.stringify(result, null, 2));
}).catch(error => {
    console.error('执行失败:', error);
});

// 导出函数供其他模块使用
module.exports = {
    connectWallet,
    getSignature,
    deriveL2Account,
    sign,
    main
}; 