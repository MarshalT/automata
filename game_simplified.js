// 命令ID
const CMD_INSTALL_PLAYER = 1n; // 安装玩家
const CMD_INSTALL_OBJECT = 2n; // 安装机器人
const CMD_RESTART_OBJECT = 3n; // 重启机器人
const CMD_UPGRADE_OBJECT = 4n; // 升级机器人
const CMD_INSTALL_CARD = 5n; // 购买新程序
const CMD_WITHDRAW = 6n; // 提现
const CMD_DEPOSIT = 7n; // 存款
const CMD_BOUNTY = 8n; // 领取奖励
const CMD_COLLECT_ENERGY = 9n; // 收集能量

/**
 * 编码修饰符
 * @param {Array<bigint>} modifiers - 修饰符数组
 * @returns {bigint} - 编码后的修饰符
 */
function encode_modifier(modifiers) {
  let c = 0n;
  for (const m of modifiers) {
    c = (c << 8n) + m;
  }
  return c;
}

/**
 * 创建命令
 * @param {bigint} nonce - 随机数
 * @param {bigint} cmdType - 命令类型
 * @param {Array<bigint>} params - 参数数组
 * @returns {BigUint64Array} - 命令数组
 */
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

/**
 * 创建提现命令
 * @param {bigint} nonce - 随机数
 * @param {bigint} cmdType - 命令类型
 * @param {string} address - 地址
 * @param {bigint} tokenId - 代币ID
 * @param {bigint} amount - 金额
 * @returns {BigUint64Array} - 命令数组
 */
function createWithdrawCommand(nonce, cmdType, address, tokenId, amount) {
  // 简化版实现，实际实现可能更复杂
  const result = new BigUint64Array(5);
  result[0] = nonce;
  result[1] = cmdType;
  // 这里简化处理地址，实际应该将地址转换为 bigint
  result[2] = BigInt('0x' + address) & ((1n << 64n) - 1n);
  result[3] = tokenId;
  result[4] = amount;
  return result;
}

/**
 * 安装程序
 * @param {bigint} nonce - 随机数
 * @param {number[]} programIndexes - 程序索引数组
 * @param {number} selectingCreatureIndex - 选中的生物索引
 * @param {boolean} isCreating - 是否创建新对象
 * @returns {BigUint64Array} - 命令数组
 */
function getInstallProgramTransactionCommandArray(
  nonce,
  programIndexes,
  selectingCreatureIndex,
  isCreating
) {
  const mslice = programIndexes.slice();
  const index = mslice.reverse().map((id) => {
    return BigInt(id);
  });
  const modifiers = encode_modifier(index);
  const objIndex = BigInt(selectingCreatureIndex);
  const command = createCommand(
    nonce,
    isCreating ? CMD_INSTALL_OBJECT : CMD_RESTART_OBJECT,
    [objIndex, modifiers]
  );
  return command;
}

/**
 * 安装玩家
 * @param {bigint} nonce - 随机数
 * @returns {BigUint64Array} - 命令数组
 */
function getInsPlayerTransactionCommandArray(nonce) {
  const command = createCommand(nonce, CMD_INSTALL_PLAYER, []);
  return command;
}

/**
 * 升级机器人
 * @param {bigint} nonce - 随机数
 * @param {number} selectingCreatureIndex - 选中的生物索引
 * @param {bigint} attrIndex - 属性索引
 * @returns {BigUint64Array} - 命令数组
 */
function getUpgradeBotTransactionCommandArray(
  nonce,
  selectingCreatureIndex,
  attrIndex
) {
  const objIndex = BigInt(selectingCreatureIndex);
  const command = createCommand(nonce, CMD_UPGRADE_OBJECT, [
    objIndex,
    attrIndex,
  ]);
  return command;
}

/**
 * 购买新程序
 * @param {bigint} nonce - 随机数
 * @returns {BigUint64Array} - 命令数组
 */
function getNewProgramTransactionCommandArray(nonce) {
  const command = createCommand(nonce, CMD_INSTALL_CARD, []);
  return command;
}

/**
 * 提现
 * @param {bigint} nonce - 随机数
 * @param {bigint} amount - 金额
 * @param {Object} account - 账户信息
 * @returns {BigUint64Array} - 命令数组
 */
function getWithdrawTransactionCommandArray(
  nonce,
  amount,
  account
) {
  const address = account.address.slice(2);
  const command = createWithdrawCommand(
    nonce,
    CMD_WITHDRAW,
    address,
    0n,
    amount
  );
  return command;
}

/**
 * 领取奖励
 * @param {bigint} nonce - 随机数
 * @param {number} index - 奖励索引
 * @returns {BigUint64Array} - 命令数组
 */
function getRedeemTransactionCommandArray(
  nonce,
  index
) {
  const bountyIndex = BigInt(index);
  const command = createCommand(nonce, CMD_BOUNTY, [bountyIndex]);
  return command;
}

/**
 * 收集能量
 * @param {bigint} nonce - 随机数
 * @returns {BigUint64Array} - 命令数组
 */
function getCollectEnergyTransactionCommandArray(nonce) {
  const command = createCommand(nonce, CMD_COLLECT_ENERGY, []);
  return command;
}

/**
 * 将 BigUint64Array 转换为十六进制字符串
 * @param {BigUint64Array} array - 命令数组
 * @returns {string} - 十六进制字符串
 */
function bigUint64ArrayToHex(array) {
  let result = '0x';
  for (let i = 0; i < array.length; i++) {
    result += array[i].toString(16).padStart(16, '0');
  }
  return result;
}

/**
 * 生成随机 nonce
 * @returns {bigint} - 随机 nonce
 */
function generateNonce() {
  return BigInt(Date.now());
}

// 导出函数和常量
module.exports = {
  // 命令常量
  CMD_INSTALL_PLAYER,
  CMD_INSTALL_OBJECT,
  CMD_RESTART_OBJECT,
  CMD_UPGRADE_OBJECT,
  CMD_INSTALL_CARD,
  CMD_WITHDRAW,
  CMD_DEPOSIT,
  CMD_BOUNTY,
  CMD_COLLECT_ENERGY,
  
  // 辅助函数
  encode_modifier,
  createCommand,
  createWithdrawCommand,
  bigUint64ArrayToHex,
  generateNonce,
  
  // 命令生成函数
  getInstallProgramTransactionCommandArray,

  getInsPlayerTransactionCommandArray,
  getUpgradeBotTransactionCommandArray,
  getNewProgramTransactionCommandArray,
  getWithdrawTransactionCommandArray,
  getRedeemTransactionCommandArray,
  getCollectEnergyTransactionCommandArray
};
