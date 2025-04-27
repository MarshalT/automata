import { AccountSlice } from "zkwasm-minirollup-browser";
import {
  ZKWasmAppRpc,
  LeHexBN,
  createCommand,
  createWithdrawCommand,
} from "zkwasm-minirollup-rpc";
import BN from "bn.js";

// Get the current URL components
const currentLocation = window.location;
const protocol = currentLocation.protocol; // e.g., 'http:' or 'https:'
const hostname = currentLocation.hostname; // e.g., 'sinka' or 'localhost'

const fullUrl = `${protocol}//${hostname}` + ":8085";
const rpc = new ZKWasmAppRpc(fullUrl);

export async function queryConfig() {
  try {
    const state = await rpc.queryConfig();
    return state;
  } catch (error) {
    throw "QueryStateError " + error;
  }
}

export async function send_transaction(cmd: BigUint64Array, prikey: string) {
  try {
    const state = await rpc.sendTransaction(cmd, prikey);
    return state;
  } catch (error) {
    throw "SendTransactionError " + error;
  }
}

export async function query_state(prikey: string) {
  try {
    const state = await rpc.queryState(prikey);
    return state;
  } catch (error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 500) {
        throw "QueryStateError";
      } else {
        throw "UnknownError";
      }
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      throw "No response was received from the server, please check your network connection.";
    } else {
      throw "UnknownError";
    }
  }
}

function encode_modifier(modifiers: Array<bigint>) {
  let c = 0n;
  for (const m of modifiers) {
    c = (c << 8n) + m;
  }
  return c;
}

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

// 安装程序
export function getInstallProgramTransactionCommandArray(
  nonce: bigint,
  programIndexes: number[],
  selectingCreatureIndex: number,
  isCreating: boolean
): BigUint64Array {
  const mslice = programIndexes.slice();
  const index = mslice.reverse().map((id) => {
    return BigInt(id);
  });
  const modifiers: bigint = encode_modifier(index);
  const objIndex = BigInt(selectingCreatureIndex);
  const command = createCommand(
    nonce,
    isCreating ? CMD_INSTALL_OBJECT : CMD_RESTART_OBJECT,
    [objIndex, modifiers]
  );
  return command;
}
// 安装玩家
export function getInsPlayerTransactionCommandArray(nonce: bigint) {
  const command = createCommand(nonce, CMD_INSTALL_PLAYER, []);
  return command;
}
// 升级机器人
export function getUpgradeBotTransactionCommandArray(
  nonce: bigint,
  selectingCreatureIndex: number,
  attrIndex: bigint
): BigUint64Array {
  const objIndex = BigInt(selectingCreatureIndex);
  const command = createCommand(nonce, CMD_UPGRADE_OBJECT, [
    objIndex,
    attrIndex,
  ]);
  return command;
}
// 购买新程序
export function getNewProgramTransactionCommandArray(
  nonce: bigint
): BigUint64Array {
  const command = createCommand(nonce, CMD_INSTALL_CARD, []);
  return command;
}
// 提现
export function getWithdrawTransactionCommandArray(
  nonce: bigint,
  amount: bigint,
  account: AccountSlice.L1AccountInfo
): BigUint64Array {
  const address = account!.address.slice(2);
  const command = createWithdrawCommand(
    nonce,
    CMD_WITHDRAW,
    address,
    0n,
    amount
  );
  return command;
}
// 领取奖励
export function getRedeemTransactionCommandArray(
  nonce: bigint,
  index: number
): BigUint64Array {
  const bountyIndex = BigInt(index);
  const command = createCommand(nonce, CMD_BOUNTY, [bountyIndex]);
  return command;
}
// 收集能量
export function getCollectEnergyTransactionCommandArray(nonce: bigint) {
  const command = createCommand(nonce, CMD_COLLECT_ENERGY, []);
  return command;
}
