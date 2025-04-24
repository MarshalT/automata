#!/usr/bin/env node
'use strict';

// 提款命令解析脚本
// 输入格式: node decode_withdraw_command.js <命令十六进制字符串>

// 解析命令参数
const commandHex = process.argv[2] || '06051500000000000000000000000000640000005d9d56ccc48b04cc466f48f17c157d40160f923a';

console.log('解析提款命令:', commandHex);

// 将十六进制字符串转换为BigUint64Array
function hexToBigUint64Array(hexString) {
  // 移除0x前缀(如果有)
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  const bytes = [];
  
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }
  
  // 创建Uint8Array
  const uint8Array = new Uint8Array(bytes);
  
  // 创建BigUint64Array
  const length = Math.ceil(uint8Array.length / 8);
  const result = new BigUint64Array(length);
  
  // 填充BigUint64Array
  const dataView = new DataView(uint8Array.buffer);
  for (let i = 0; i < length; i++) {
    if (i * 8 + 7 < uint8Array.length) {
      // 完整的8字节
      result[i] = dataView.getBigUint64(i * 8, true); // little-endian
    } else {
      // 不完整的8字节，手动填充
      let value = 0n;
      for (let j = 0; j < Math.min(8, uint8Array.length - i * 8); j++) {
        value |= BigInt(uint8Array[i * 8 + j]) << BigInt(j * 8);
      }
      result[i] = value;
    }
  }
  
  return result;
}

// 解析命令
function decodeCommand(commandArray) {
  // 第一个元素包含nonce, params.length, command
  const firstElement = commandArray[0];
  const command = firstElement & 0xFFn;
  const paramsLength = (firstElement >> 8n) & 0xFFn;
  const nonce = firstElement >> 16n;
  
  // 参数
  const params = [];
  for (let i = 1; i < commandArray.length; i++) {
    params.push(commandArray[i]);
  }
  
  return {
    nonce,
    command,
    paramsLength,
    params
  };
}

// 将字节数组转为十六进制字符串
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 解析提款命令 - 参考atm/convention.ts中的createWithdrawCommand方法
function decodeWithdrawCommand(decoded) {
  const tokenIndex = decoded.params[0];
  const firstLimbWithAmount = decoded.params[1];
  const amount = firstLimbWithAmount & 0xFFFFFFFFn;
  const firstLimb = firstLimbWithAmount >> 32n;
  const sndLimb = decoded.params[2];
  const thirdLimb = decoded.params[3];
  
  console.log('提款命令解析过程:');
  console.log('- tokenIndex:', tokenIndex.toString());
  console.log('- 金额:', amount.toString());
  console.log('- 地址部分1 (firstLimb):', '0x' + firstLimb.toString(16).padStart(8, '0'));
  console.log('- 地址部分2 (sndLimb):', '0x' + sndLimb.toString(16).padStart(16, '0'));
  console.log('- 地址部分3 (thirdLimb):', '0x' + thirdLimb.toString(16).padStart(16, '0'));
  
  // 将地址各部分转为字节数组并反转
  // 注意: 在createWithdrawCommand中，地址被拆分为3部分，并且每部分都进行了字节反转
  // 所以这里需要反向操作来还原地址
  function bigintToReversedBytes(value, length) {
    const bytes = [];
    let tempValue = value;
    for (let i = 0; i < length; i++) {
      bytes.push(Number(tempValue & 0xFFn));
      tempValue = tempValue >> 8n;
    }
    return bytes;
  }
  
  // 按照convention.ts中的逻辑反向操作
  const firstLimbBytes = bigintToReversedBytes(firstLimb, 4);
  const sndLimbBytes = bigintToReversedBytes(sndLimb, 8);
  const thirdLimbBytes = bigintToReversedBytes(thirdLimb, 8);
  
  // 按照big-endian顺序组合字节数组
  const addressBytes = [
    ...firstLimbBytes,
    ...sndLimbBytes,
    ...thirdLimbBytes
  ];
  
  // 转换为十六进制
  const addressHex = bytesToHex(addressBytes);
  
  console.log('- 地址字节处理:');
  console.log('  - 第一部分字节:', firstLimbBytes.map(b => b.toString(16).padStart(2, '0')));
  console.log('  - 第二部分字节:', sndLimbBytes.map(b => b.toString(16).padStart(2, '0')));
  console.log('  - 第三部分字节:', thirdLimbBytes.map(b => b.toString(16).padStart(2, '0')));
  console.log('  - 组合后字节:', addressBytes.map(b => b.toString(16).padStart(2, '0')));
  
  // 最终的以太坊地址
  const ethAddress = '0x' + addressHex;
  
  return {
    tokenIndex,
    amount,
    address: ethAddress
  };
}

// 执行解析
try {
  const commandArray = hexToBigUint64Array(commandHex);
  console.log('命令数组:', Array.from(commandArray).map(n => '0x' + n.toString(16)));
  
  const decoded = decodeCommand(commandArray);
  console.log('\n基本命令解析:');
  console.log('- Nonce:', decoded.nonce.toString());
  console.log('- Command ID:', decoded.command.toString());
  console.log('- 参数长度:', decoded.paramsLength.toString());
  console.log('- 参数:', decoded.params.map(p => '0x' + p.toString(16)));
  
  // 检查是否是提款命令 - 检查参数数量是否足够
  if (decoded.params.length >= 4) {
    console.log('\n提款命令详细信息:');
    const withdrawData = decodeWithdrawCommand(decoded);
    console.log('\n最终结果:');
    console.log('- 代币索引:', withdrawData.tokenIndex.toString());
    console.log('- 金额:', withdrawData.amount.toString());
    console.log('- 地址:', withdrawData.address);
    
    // 检查地址是否与预期相符
    const expectedAddress = '0x5d9d56ccc48b04cc466f48f17c157d40160f923a';
    const matches = withdrawData.address.toLowerCase() === expectedAddress.toLowerCase();
    console.log('- 地址是否匹配预期:', matches ? '是' : '否');
    if (!matches) {
      console.log('  预期地址:', expectedAddress);
    }
  } else {
    console.log('\n警告: 这不像是标准的提款命令 (参数不足)');
  }
} catch (error) {
  console.error('解析命令时出错:', error.message);
} 