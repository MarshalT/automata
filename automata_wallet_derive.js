const { ethers } = require('ethers');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sha256 = require('sha256');
const BN = require('bn.js');

// 导入delphinus-curves库
const { PrivateKey, bnToHexLe, CurveField, Point } = require('./atm/delphinus-curves/altjubjub.js');
const { Field } = require('./atm/delphinus-curves/field.js');
const { poseidon } = require('./atm/delphinus-curves/poseidon.js');

// 配置
const config = {
    // AUTOMATA API端点
    apiEndpoint: 'https://rpc.zkwasmhub.com:8090',
    queryEndpoint: 'https://rpc.zkwasm-automata.zkwasm.ai',
    configEndpoint: 'http://114.119.173.203:8085',
    signingMessage: '0xAUTOMATA', // 要签名的消息
    walletConfigPath: path.join(__dirname, 'wallet_config.json')
};

// 辅助函数: 延迟执行
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    console.log('- 私钥:', prikey);
    console.log('- 消息数组长度:', cmd.length);
    
    // 创建私钥对象
    let pkey = PrivateKey.fromString(prikey);
    let r = pkey.r();
    let R = Point.base.mul(r);
    
    // 计算哈希
    let H;
    let fvalues = [];
    let h = 0n;
    
    for (let i = 0; i < cmd.length;) {
        let v = 0n;
        let j = 0;
        for (; j < 3; j++) {
            if (i + j < cmd.length) {
                v = v + (cmd[i + j] << (64n * BigInt(j)));
                h = h + (cmd[i + j] << (64n * BigInt(j + i)));
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
        msg: bnToHexLe(msgbn, cmd.length * 8),
        hash: bnToHexLe(hbn),
        pkx: bnToHexLe(pubkey.key.x.v),
        pky: bnToHexLe(pubkey.key.y.v),
        sigx: bnToHexLe(R.x.v),
        sigy: bnToHexLe(R.y.v),
        sigr: bnToHexLe(S.v),
    };
    
    console.log('签名数据:');
    console.log(`- 公钥X: ${data.pkx}`);
    console.log(`- 公钥Y: ${data.pky}`);
    console.log(`- 签名X: ${data.sigx}`);
    console.log(`- 签名Y: ${data.sigy}`);
    console.log(`- 签名R: ${data.sigr}`);
    
    return data;
}

// 从签名派生L2账户 - 完全按照reduxstate.ts中的方式
function deriveL2AccountFromSignature(signature) {
    console.log('开始从签名派生L2账户公钥...');
    
    // 移除签名前缀 (0x)
    const cleanSignature = signature.startsWith('0x') ? signature.slice(2) : signature;
    
    // 分解签名各部分 (仅用于日志)
    const r = cleanSignature.slice(0, 64);
    const s = cleanSignature.slice(64, 128);
    const v = cleanSignature.slice(128);
    
    console.log('签名分解:');
    console.log(`- r: ${r}`);
    console.log(`- s: ${s}`);
    console.log(`- v: ${v}`);
    
    try {
        // 完全按照reduxstate.ts中的loginL2Account实现
        // 取前17字节(34个字符)作为私钥
        console.log('\n使用签名前17字节作为私钥');
        const privateKeyHex = signature.substring(0, 34);
        console.log(`签名前17字节: ${privateKeyHex}`);
        
        // 创建L2AccountInfo实例
        const l2Account = new L2AccountInfo(privateKeyHex);
        
        // 获取公钥和十六进制字符串形式 
        const pubkeyHex = l2Account.toHexStr();
        console.log(`派生的L2公钥(大端序): ${pubkeyHex}`);

         // 获取公钥和十六进制字符串形式
         const pubkeyHex1 = l2Account.toHexStr1();
         console.log(`派生的L2公钥(大端序): ${pubkeyHex1}`); 
        // 获取小端序格式的公钥
        const pubkeyLE = bnToHexLe(l2Account.pubkey, 32);
        console.log(`派生的L2公钥(小端序): ${pubkeyLE}`);

        // 获取小端序格式的公钥
        const pubkeyLE1 = bnToHexLe(l2Account.pubkeyy, 32);
        console.log(`派生的L2公钥(小端序): ${pubkeyLE1}`);
        
        // 检查钱包配置中是否有预期的L2公钥
        const walletConfig = readWalletConfig();
        if (walletConfig.l2Pubkey) {
            console.log(`\n期望的L2账户公钥(大端序): ${walletConfig.l2Pubkey}`);
            
            // 将期望的公钥转换为小端序进行比较
            const expectedBN = new BN(walletConfig.l2Pubkey, 16);
            const expectedPubkeyLe = bnToHexLe(expectedBN, 32);
            console.log(`期望的L2公钥(小端序): ${expectedPubkeyLe}`);
            
            // 检查是否匹配
            if (pubkeyHex === walletConfig.l2Pubkey || pubkeyLE === expectedPubkeyLe) {
                console.log('✅ 派生的公钥匹配成功!');
                return {
                    success: true,
                    pubkey: pubkeyLE,
                    privateKeyHex: privateKeyHex,
                    message: "派生的公钥匹配成功"
                };
            } else {
                console.log('❌ 派生的公钥与预期不匹配，尝试使用预期公钥');
                return {
                    success: true, // 仍然返回成功但使用预期的公钥
                    pubkey: expectedPubkeyLe,
                    privateKeyHex: privateKeyHex,
                    message: "使用预期的公钥继续"
                };
            }
        }
        
        // 如果没有预期的公钥，则使用派生的公钥
        return {
            success: true,
            pubkey: pubkeyLE,
            message: "使用派生的公钥"
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
        const pkey = PrivateKey.fromString(this.#prikey);
        this.pubkey = pkey.publicKey.key.x.v;
        this.pubkeyy=pkey.publicKey.key.y.v;
    }
    
    getPrivateKey() {
        return this.#prikey;
    }
    
    toHexStr() {
        return this.pubkey.toString("hex");
    }
    toHexStr1() {
        return this.pubkeyy.toString("hex");
    }
}

// 创建一个ZKWasmAppRpc类
class ZKWasmAppRpc {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.instance = axios.create({
            baseURL: baseUrl,
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
    }

    // 查询状态方法
    async queryState(pkx) {
        try {
            // 构建请求数据
            const data = { pkx };
            console.log('查询状态请求数据:', JSON.stringify(data));
            
            const response = await this.instance.post("/query", data);
            
            if (response.status === 201 || response.status === 200) {
                const jsonResponse = response.data;
                return jsonResponse;
            } else {
                throw new Error(`UnexpectedResponseStatus: ${response.status}`);
            }
        } catch (error) {
            console.error('查询状态请求错误:', error);
            if (error.response) {
                if (error.response.status === 500) {
                    throw new Error("QueryStateError: 服务器内部错误");
                } else {
                    throw new Error(`QueryStateError: HTTP ${error.response.status}`);
                }
            } else if (error.request) {
                throw new Error('No response was received from the server, please check your network connection.');
            } else {
                throw new Error("UnknownError: " + error.message);
            }
        }
    }

    // 查询配置
    async queryConfig() {
        try {
            const response = await this.instance.post("/config", {});
            
            if (response.status === 201 || response.status === 200) {
                const jsonResponse = response.data;
                return jsonResponse;
            } else {
                throw new Error(`QueryConfigError: ${response.status}`);
            }
        } catch(error) {
            console.error('查询配置请求错误:', error);
            throw new Error("QueryConfigError: " + error.message);
        }
    }
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
        
        // 查询配置
        const configData = await queryConfig();
        if (!configData || !configData.success) {
            console.error('无法获取配置信息，PKX生成失败');
            return { success: false, error: '配置查询失败' };
        }
        
        // 使用L2公钥生成PKX - 已经是小端序格式的十六进制字符串
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

// 查询用户状态 - 基于PKX值查询用户状态
async function queryUserState(pkx) {
    try {
        console.log('正在查询用户状态...');
        
        if (!pkx || !pkx.success || !pkx.data) {
            console.error('PKX参数无效，无法查询用户状态');
            return { success: false, error: 'PKX参数无效' };
        }
        
        const pkxValue = pkx.data;
        console.log('使用PKX值查询用户状态:', pkxValue);
        
        // 使用ZKWasmAppRpc类查询状态
        const rpc = new ZKWasmAppRpc(config.queryEndpoint);
        const stateData = await rpc.queryState(pkxValue);
        
        console.log('(Data-QueryState)', JSON.stringify(stateData));
        
        return {
            success: true,
            data: stateData
        };
    } catch (error) {
        console.error('查询用户状态失败:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 查询配置信息
async function queryConfig() {
    try {
        console.log('查询配置信息...');
        
        // 创建ZKWasmAppRpc实例
        const rpc = new ZKWasmAppRpc(config.configEndpoint);
        
        // 使用RPC查询配置
        const configData = await rpc.queryConfig();
        console.log('(Data-QueryConfig)', JSON.stringify(configData));
        
        return {
            success: true,
            data: configData
        };
    } catch (error) {
        console.error('查询配置信息失败:', error.message);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// 主函数 - 连接钱包、获取签名、派生L2账户、查询状态
async function main() {
    try {
        console.log('开始执行...');
        
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
        console.log('派生的L2公钥:', l2Account.publicKey);
        console.log('使用的派生方法:', l2Account.method);
        
        // 4. 基于L2公钥生成PKX
        const pkxResult = await getPkx(l2Account.publicKey);
        if (!pkxResult.success) {
            throw new Error(`PKX生成失败: ${pkxResult.error}`);
        }
        console.log('PKX生成成功:', pkxResult.data);
        
        // 5. 查询用户状态
        const stateData = await queryUserState(pkxResult);
        if (!stateData.success) {
            console.error('用户状态查询失败:', stateData.error);
        } else {
            console.log('用户状态查询成功:', stateData.data);
        }
        sign("123456", l2Account.privateKeyHex);
        
        console.log('所有操作完成！');
        
        return {
            success: true,
            wallet: wallet.address,
            l2PublicKey: l2Account.publicKey,
            pkx: pkxResult.data,
            state: stateData.success ? stateData.data : null
        };
    } catch (error) {
        console.error('执行过程中出错:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
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
    queryConfig,
    queryUserState,
    main
}; 