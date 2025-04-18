// BSCScan代币交易记录获取与解析脚本
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 尝试加载配置文件
let config = {
  TOKEN_ADDRESS: '0x9070c2db45f011e5bf66f544b20f10150f2754d0',
  WALLET_ADDRESS: '0x48129238be8af277433662711d86e6cf235118d3',
  OUTPUT_FILE: 'transactions.json',
  API_KEY: '' // 默认空API密钥
};

// 加载配置文件
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(configData);
      
      // 合并配置，保留默认值
      config = { ...config, ...userConfig };
      console.log('已从配置文件加载设置');
    } else {
      // 如果配置文件不存在，创建一个默认配置文件
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('已创建默认配置文件: config.json，请根据需要进行修改');
    }
  } catch (error) {
    console.error('加载配置文件失败:', error.message);
    console.log('将使用默认配置');
  }
}

// 加载配置
loadConfig();

// 解构配置
const { TOKEN_ADDRESS, WALLET_ADDRESS, OUTPUT_FILE, API_KEY } = config;

/**
 * 使用网页爬取方式获取交易记录(备选方案)
 */
async function scrapeTransactionsFromWeb() {
  console.log('开始从BSCScan网页获取交易记录...');
  
  try {
    const url = `https://bscscan.com/token/${TOKEN_ADDRESS}?a=${WALLET_ADDRESS}`;
    const response = await axios.get(url);
    
    if (response.status !== 200) {
      throw new Error(`请求失败，状态码: ${response.status}`);
    }
    
    const $ = cheerio.load(response.data);
    const transactions = [];
    
    // 解析交易表格
    $('#tokentxnstable tbody tr').each((index, element) => {
      const txHash = $(element).find('td:nth-child(2) a').text().trim();
      const date = $(element).find('td:nth-child(3)').attr('data-order');
      const dateFormatted = $(element).find('td:nth-child(3)').text().trim();
      const from = $(element).find('td:nth-child(5) a').text().trim();
      const to = $(element).find('td:nth-child(7) a').text().trim();
      const value = $(element).find('td:nth-child(8)').text().trim();
      
      transactions.push({
        txHash,
        timestamp: date,
        date: dateFormatted,
        from,
        to,
        value,
        isIncoming: to.toLowerCase() === WALLET_ADDRESS.toLowerCase()
      });
    });
    
    console.log(`成功获取 ${transactions.length} 条交易记录`);
    return transactions;
  } catch (error) {
    console.error('从网页获取交易记录失败:', error.message);
    return [];
  }
}

/**
 * 使用BSCScan API获取交易记录(推荐，但需要API密钥)
 */
async function getTransactionsFromAPI() {
  if (!API_KEY) {
    console.log('未提供API密钥，将使用网页爬取方式获取数据');
    return await scrapeTransactionsFromWeb();
  }
  
  console.log('开始从BSCScan API获取交易记录...');
  
  try {
    // 获取代币转入记录
    const incomingUrl = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${TOKEN_ADDRESS}&address=${WALLET_ADDRESS}&sort=desc&apikey=${API_KEY}`;
    const incomingResponse = await axios.get(incomingUrl);
    
    if (incomingResponse.data.status !== '1') {
      throw new Error(`API请求失败: ${incomingResponse.data.message}`);
    }
    
    // 处理API返回的数据
    const transactions = incomingResponse.data.result.map(tx => {
      // 计算实际值 (考虑代币小数位)
      const decimals = parseInt(tx.tokenDecimal) || 18;
      const actualValue = (parseFloat(tx.value) / Math.pow(10, decimals)).toFixed(decimals);
      
      return {
        txHash: tx.hash,
        timestamp: tx.timeStamp,
        date: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
        from: tx.from,
        to: tx.to,
        value: `${actualValue} ${tx.tokenSymbol}`,
        isIncoming: tx.to.toLowerCase() === WALLET_ADDRESS.toLowerCase()
      };
    });
    
    console.log(`成功获取 ${transactions.length} 条交易记录`);
    return transactions;
  } catch (error) {
    console.error('从API获取交易记录失败:', error.message);
    console.log('尝试使用网页爬取方式作为备选...');
    return await scrapeTransactionsFromWeb();
  }
}

/**
 * 分析交易记录并生成统计数据
 */
function analyzeTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      totalTransactions: 0,
      incoming: 0,
      outgoing: 0,
      summary: '没有交易记录可供分析'
    };
  }
  
  // 按时间排序
  const sortedTx = [...transactions].sort((a, b) => {
    return parseInt(a.timestamp) - parseInt(b.timestamp);
  });
  
  // 基本统计
  const incomingTx = transactions.filter(tx => tx.isIncoming);
  const outgoingTx = transactions.filter(tx => !tx.isIncoming);
  
  // 交易金额分析 (注意：这里假设所有交易都是同一种代币)
  const incomingValueString = incomingTx.map(tx => tx.value.split(' ')[0]);
  const outgoingValueString = outgoingTx.map(tx => tx.value.split(' ')[0]);
  
  // 将字符串转换为数字进行计算
  const incomingValues = incomingValueString.map(v => parseFloat(v.replace(/,/g, '')));
  const outgoingValues = outgoingValueString.map(v => parseFloat(v.replace(/,/g, '')));
  
  // 计算总和
  const totalIncoming = incomingValues.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
  const totalOutgoing = outgoingValues.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
  
  // 获取代币符号
  const tokenSymbol = transactions[0]?.value.split(' ')[1] || '';
  
  // 获取频繁交互的地址
  const topIncomingAddresses = getTopAddresses(incomingTx, 'from', 5);
  const topOutgoingAddresses = getTopAddresses(outgoingTx, 'to', 5);
  
  return {
    totalTransactions: transactions.length,
    firstTransaction: sortedTx[0],
    lastTransaction: sortedTx[sortedTx.length - 1],
    incoming: {
      count: incomingTx.length,
      total: `${totalIncoming.toFixed(4)} ${tokenSymbol}`
    },
    outgoing: {
      count: outgoingTx.length,
      total: `${totalOutgoing.toFixed(4)} ${tokenSymbol}`
    },
    netBalance: `${(totalIncoming - totalOutgoing).toFixed(4)} ${tokenSymbol}`,
    topSenders: topIncomingAddresses,
    topReceivers: topOutgoingAddresses,
    // 添加详细的频率统计
    frequentAddressStats: {
      incoming: calculateAddressValueStats(incomingTx, 'from', tokenSymbol),
      outgoing: calculateAddressValueStats(outgoingTx, 'to', tokenSymbol)
    }
  };
}

/**
 * 计算各地址的交易金额统计
 */
function calculateAddressValueStats(transactions, field, tokenSymbol) {
  const addressStats = {};
  
  transactions.forEach(tx => {
    const address = tx[field];
    if (!addressStats[address]) {
      addressStats[address] = {
        count: 0,
        totalValue: 0,
        transactions: []
      };
    }
    
    const valueNum = parseFloat(tx.value.split(' ')[0].replace(/,/g, ''));
    if (!isNaN(valueNum)) {
      addressStats[address].count += 1;
      addressStats[address].totalValue += valueNum;
      addressStats[address].transactions.push({
        hash: tx.hash,
        date: tx.date,
        timestamp: parseInt(tx.timestamp),
        value: valueNum
      });
    }
  });
  
  // 对每个地址的交易记录按时间戳排序
  Object.values(addressStats).forEach(stats => {
    stats.transactions.sort((a, b) => a.timestamp - b.timestamp);
  });
  
  return Object.entries(addressStats)
    .map(([address, stats]) => ({
      address,
      count: stats.count,
      totalValue: `${stats.totalValue.toFixed(4)} ${tokenSymbol}`,
      totalValueRaw: stats.totalValue, // 添加原始数值用于排序
      averageValue: `${(stats.totalValue / stats.count).toFixed(4)} ${tokenSymbol}`,
      firstTransaction: stats.transactions[0]?.date || 'N/A',
      lastTransaction: stats.transactions[stats.transactions.length - 1]?.date || 'N/A'
    }))
    .sort((a, b) => b.totalValueRaw - a.totalValueRaw); // 按交易金额排序
}

/**
 * 获取交易最频繁的地址
 */
function getTopAddresses(transactions, field, limit = 3) {
  const addressCount = {};
  
  transactions.forEach(tx => {
    const address = tx[field];
    addressCount[address] = (addressCount[address] || 0) + 1;
  });
  
  return Object.entries(addressCount)
    .map(([address, count]) => ({ address, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * 保存结果到文件
 */
function saveToFile(data, filename) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`数据已保存到 ${filename}`);
  } catch (error) {
    console.error('保存文件失败:', error.message);
  }
}

/**
 * 生成HTML报告
 */
function generateHTMLReport(transactions, analysis) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATM奖池分析报告</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1, h2 { color: #2c3e50; }
    .stats { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #f8f9fa; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex: 1; min-width: 200px; }
    .stat-card h3 { margin-top: 0; color: #3498db; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f2f2f2; position: sticky; top: 0; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr:hover { background-color: #f1f1f1; }
    .incoming { color: #27ae60; }
    .outgoing { color: #e74c3c; }
    .address { font-family: monospace; word-break: break-all; }
    .hash { font-family: monospace; word-break: break-all; }
    .pagination { margin: 20px 0; }
    .pagination button { padding: 8px 16px; margin-right: 5px; cursor: pointer; }
    .search { margin-bottom: 20px; }
    .search input { padding: 8px; width: 300px; }
    .tabs { display: flex; margin-bottom: 10px; }
    .tab { padding: 10px 20px; cursor: pointer; background: #f2f2f2; margin-right: 5px; border-radius: 5px 5px 0 0; }
    .tab.active { background: #3498db; color: white; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>ATM奖池分析报告</h1>
    <p>钱包地址: <span class="address">${WALLET_ADDRESS}</span></p>
    <p>代币合约: <span class="address">${TOKEN_ADDRESS}</span></p>
    <p>报告生成时间: <span>${new Date().toLocaleString()}</span></p>
    
    <h2>交易统计</h2>
    <div class="stats">
      <div class="stat-card">
        <h3>总交易数</h3>
        <p>${analysis.totalTransactions}</p>
      </div>
      <div class="stat-card">
        <h3>充值交易</h3>
        <p>${analysis.incoming.count} 笔</p>
        <p>${analysis.incoming.total}</p>
      </div>
      <div class="stat-card">
        <h3>提现交易</h3>
        <p>${analysis.outgoing.count} 笔</p>
        <p>${analysis.outgoing.total}</p>
      </div>
      <div class="stat-card">
        <h3>净余额</h3>
        <p>${analysis.netBalance}</p>
      </div>
    </div>
    
    <h2>交易时间范围</h2>
    <div class="stats">
      <div class="stat-card">
        <h3>首次交易</h3>
        <p>${analysis.firstTransaction?.date || 'N/A'}</p>
      </div>
      <div class="stat-card">
        <h3>最近交易</h3>
        <p>${analysis.lastTransaction?.date || 'N/A'}</p>
      </div>
    </div>
    
    <h2>频繁交互地址</h2>
    
    <div class="tabs no-print">
      <div class="tab active" id="tab-incoming" data-target="incoming">充值金额排行榜</div>
      <div class="tab" id="tab-outgoing" data-target="outgoing">提现金额排行榜</div>
    </div>
    
    <div id="incoming" class="tab-content active">
      <h3>充值地址统计 (充值金额最多的前10名地址)</h3>
      <table>
        <thead>
          <tr>
            <th>地址</th>
            <th>交易次数</th>
            <th>总充值金额</th>
            <th>平均每笔</th>
            <th>首次交易</th>
            <th>最近交易</th>
          </tr>
        </thead>
        <tbody>
          ${analysis.frequentAddressStats.incoming.slice(0, 10).map(addr => `
            <tr>
              <td class="address">${addr.address}</td>
              <td>${addr.count}</td>
              <td>${addr.totalValue}</td>
              <td>${addr.averageValue}</td>
              <td>${addr.firstTransaction}</td>
              <td>${addr.lastTransaction}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div id="outgoing" class="tab-content">
      <h3>提现地址统计 (提现金额最多的前10名地址)</h3>
      <table>
        <thead>
          <tr>
            <th>地址</th>
            <th>交易次数</th>
            <th>总提现金额</th>
            <th>平均每笔</th>
            <th>首次交易</th>
            <th>最近交易</th>
          </tr>
        </thead>
        <tbody>
          ${analysis.frequentAddressStats.outgoing.slice(0, 10).map(addr => `
            <tr>
              <td class="address">${addr.address}</td>
              <td>${addr.count}</td>
              <td>${addr.totalValue}</td>
              <td>${addr.averageValue}</td>
              <td>${addr.firstTransaction}</td>
              <td>${addr.lastTransaction}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <h3>主要充值来源</h3>
        <ul>
          ${analysis.topSenders.map(s => `
            <li>${s.count}笔交易: <span class="address">${s.address}</span></li>
          `).join('')}
        </ul>
      </div>
      <div class="stat-card">
        <h3>主要提现去向</h3>
        <ul>
          ${analysis.topReceivers.map(r => `
            <li>${r.count}笔交易: <span class="address">${r.address}</span></li>
          `).join('')}
        </ul>
      </div>
    </div>
    
    <h2>交易记录</h2>
    <div class="search no-print">
      <input type="text" id="searchInput" placeholder="搜索交易哈希、地址...">
    </div>
    
    <div class="pagination no-print" id="pagination"></div>
    
    <table id="transactionsTable">
      <thead>
        <tr>
          <th>交易哈希</th>
          <th>日期</th>
          <th>发送方</th>
          <th>接收方</th>
          <th>金额</th>
          <th>类型</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map(tx => `
          <tr>
            <td class="hash">
              <a href="https://bscscan.com/tx/${tx.txHash}" target="_blank">${tx.txHash}</a>
            </td>
            <td>${tx.date}</td>
            <td class="address">${tx.from}</td>
            <td class="address">${tx.to}</td>
            <td>${tx.value}</td>
            <td class="${tx.isIncoming ? 'incoming' : 'outgoing'}">${tx.isIncoming ? '充值' : '提现'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="pagination no-print" id="paginationBottom"></div>
  </div>

  <script>
    // 分页和搜索功能
    document.addEventListener('DOMContentLoaded', function() {
      const table = document.getElementById('transactionsTable');
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const rowsPerPage = 25;
      let currentPage = 1;
      let filteredRows = [...rows];
      
      const searchInput = document.getElementById('searchInput');
      
      function renderTable() {
        const startIdx = (currentPage - 1) * rowsPerPage;
        const visibleRows = filteredRows.slice(startIdx, startIdx + rowsPerPage);
        
        tbody.innerHTML = '';
        visibleRows.forEach(row => tbody.appendChild(row));
        
        renderPagination();
      }
      
      function renderPagination() {
        const pageCount = Math.ceil(filteredRows.length / rowsPerPage);
        const pagination = document.getElementById('pagination');
        const paginationBottom = document.getElementById('paginationBottom');
        
        const paginationHTML = \`
          <button \${currentPage === 1 ? 'disabled' : ''} onclick="changePage(1)">首页</button>
          <button \${currentPage === 1 ? 'disabled' : ''} onclick="changePage(\${currentPage - 1})">上一页</button>
          <span>第 \${currentPage} 页，共 \${pageCount} 页</span>
          <button \${currentPage === pageCount ? 'disabled' : ''} onclick="changePage(\${currentPage + 1})">下一页</button>
          <button \${currentPage === pageCount ? 'disabled' : ''} onclick="changePage(\${pageCount})">末页</button>
        \`;
        
        pagination.innerHTML = paginationHTML;
        paginationBottom.innerHTML = paginationHTML;
      }
      
      window.changePage = function(page) {
        currentPage = page;
        renderTable();
      };
      
      function filterTable() {
        const query = searchInput.value.toLowerCase();
        
        if (!query) {
          filteredRows = [...rows];
        } else {
          filteredRows = rows.filter(row => {
            return row.textContent.toLowerCase().includes(query);
          });
        }
        
        currentPage = 1;
        renderTable();
      }
      
      searchInput.addEventListener('input', filterTable);
      
      // 初始化表格
      renderTable();
      
      // 为标签页添加切换功能
      function switchTab(tabId) {
        // 隐藏所有标签内容
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // 取消所有标签的活动状态
        document.querySelectorAll('.tab').forEach(tab => {
          tab.classList.remove('active');
        });
        
        // 激活选中的标签和内容
        document.getElementById(tabId).classList.add('active');
        document.getElementById('tab-' + tabId).classList.add('active');
      }
      
      // 绑定标签页点击事件
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
          const target = this.getAttribute('data-target');
          switchTab(target);
        });
      });
      
      // 初始化标签页
      switchTab('incoming');
    });
  </script>
</body>
</html>
`;

  try {
    fs.writeFileSync('transaction_report.html', html);
    console.log('HTML报告已生成: transaction_report.html');
  } catch (error) {
    console.error('生成HTML报告失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(`开始获取地址 ${WALLET_ADDRESS} 的代币 ${TOKEN_ADDRESS} 交易记录...`);
  
  // 优先尝试使用API获取
  const transactions = await getTransactionsFromAPI();
  
  if (transactions.length === 0) {
    console.log('未能获取到交易记录');
    return;
  }
  
  // 分析交易数据
  const analysis = analyzeTransactions(transactions);
  
  // 保存原始交易数据
  saveToFile({
    walletAddress: WALLET_ADDRESS,
    tokenAddress: TOKEN_ADDRESS,
    transactionCount: transactions.length,
    transactions: transactions,
    analysis: analysis
  }, OUTPUT_FILE);
  
  // 生成HTML报告
  generateHTMLReport(transactions, analysis);
  
  console.log('=========================================');
  console.log('交易分析摘要:');
  console.log(`总交易数: ${analysis.totalTransactions}`);
  console.log(`充值交易: ${analysis.incoming.count} 笔, 总计 ${analysis.incoming.total}`);
  console.log(`提现交易: ${analysis.outgoing.count} 笔, 总计 ${analysis.outgoing.total}`);
  console.log(`净余额: ${analysis.netBalance}`);
  console.log('数据源: ' + (API_KEY ? 'BSCScan API' : '网页爬取'));
  console.log(`配置文件: ${path.join(__dirname, 'config.json')}`);
  console.log('=========================================');
}

// 运行主函数
main().catch(error => {
  console.error('程序执行出错:', error);
}); 