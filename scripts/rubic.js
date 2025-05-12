const { ethers } = require("ethers");
const colors = require("colors");
const readline = require("readline");
const fs = require("fs");

const RPC_URL = "https://testnet-rpc.monad.xyz/";
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
const WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
const WALLET_FILE = "wallet.txt";
const ACCOUNT_SWITCH_DELAY = 3000;

function readPrivateKeys() {
  try {
    const data = fs.readFileSync(WALLET_FILE, 'utf8');
    const privateKeys = data.split('\n')
      .map(key => key.trim())
      .filter(key => key !== '');
    
    return privateKeys;
  } catch (error) {
    console.error(`❌ Không đọc được file wallet.txt: ${error.message}`.red);
    process.exit(1);
  }
}

async function getRandomAmount(wallet) {
  try {
    const balance = await wallet.getBalance();
    const min = balance.mul(1).div(100); // 1% of balance
    const max = balance.mul(5).div(100); // 5% of balance
    
    if (min.lt(ethers.utils.parseEther("0.0001"))) {
      console.log("⚠️ Số dư quá thấp, sử dụng số lượng tối thiểu".yellow);
      return ethers.utils.parseEther("0.0001");
    }
    
    const range = max.sub(min);
    const randomValue = ethers.BigNumber.from(
      ethers.utils.randomBytes(32)
    ).mod(range);
    const amount = min.add(randomValue);
    
    return amount;
  } catch (error) {
    console.error("❌ Error calculating random amount:".red, error);
    return ethers.utils.parseEther("0.01");
  }
}


function getRandomDelay() {
  const minDelay = 30 * 1000;
  const maxDelay = 1 * 60 * 1000;
  return Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
}

async function wrapMON(amount, contract) {
  try {
    console.log(
      `🔄 Wrap ${ethers.utils.formatEther(amount)} MON → WMON...`.magenta
    );
    const tx = await contract.deposit({ value: amount, gasLimit: 500000 });
    console.log(`✔️  Wrap MON → WMON thành công`.green.underline);
    console.log(`➡️  Transaction sent: ${EXPLORER_URL}${tx.hash}`.yellow);
    await tx.wait();
    return true;
  } catch (error) {
    console.error("❌ Lỗi rồi:".red, error);
    return false;
  }
}

async function unwrapMON(amount, contract) {
  try {
    console.log(
      `🔄 Unwrap ${ethers.utils.formatEther(amount)} WMON → MON...`
        .magenta
    );
    const tx = await contract.withdraw(amount, { gasLimit: 500000 });
    console.log(`✔️  Unwrap WMON → MON thành công`.green.underline);
    console.log(`➡️  Transaction sent: ${EXPLORER_URL}${tx.hash}`.yellow);
    await tx.wait();
    return true;
  } catch (error) {
    console.error("❌ Lỗi rồi:".red, error);
    return false;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function performSwapCycle(wallet, contract, cycleNumber, totalCycles) {
  try {
    console.log(`Chu kì ${cycleNumber} / ${totalCycles}:`.magenta);
    const randomAmount = await getRandomAmount(wallet);
    
    const wrapSuccess = await wrapMON(randomAmount, contract);
    if (!wrapSuccess) return false;
    
    const unwrapSuccess = await unwrapMON(randomAmount, contract);
    if (!unwrapSuccess) return false;
    
    return true;
  } catch (error) {
    console.error(`❌ Lỗi rồi: ${error.message}`.red);
    return false;
  }
}

async function runSwapCyclesForAccount(privateKey, cycles) {
  try {
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(
      WMON_CONTRACT,
      [
        "function deposit() public payable",
        "function withdraw(uint256 amount) public",
      ],
      wallet
    );

    const address = wallet.address;
    const truncatedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    console.log(`\n👤 Đang xử lý tài khoản: ${truncatedAddress}`.cyan);
    
    const balance = await wallet.getBalance();
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} MON`.cyan);

    let completedCycles = 0;
    for (let i = 0; i < cycles; i++) {
      const success = await performSwapCycle(wallet, contract, i + 1, cycles);
      if (success) {
        completedCycles++;
      } else {
        console.log(`⚠️ Chu kỳ ${i + 1} thất bại, chuyển sang chu kỳ tiếp theo`.yellow);
      }
    }
    
    console.log(`✅ Hoàn thành ${completedCycles}/${cycles} chu kì cho tài khoản ${truncatedAddress}`.green);
    return true;
  } catch (error) {
    console.error(`❌ Lỗi xử lý tài khoản, xem lại privatekey đã đúng chưa ${privateKey.substring(0, 6)}...: ${error.message}`.red);
    return false;
  }
}

async function processAllAccounts(cycles, interval) {
  try {
    const privateKeys = readPrivateKeys();
    console.log(`📋 Tìm thấy ${privateKeys.length} tài khoản trong wallet.txt`.cyan);
    
    for (let i = 0; i < privateKeys.length; i++) {
      console.log(`\n🔄 Đang xử lý tài khoản ${i + 1} of ${privateKeys.length}`.cyan);
      const success = await runSwapCyclesForAccount(privateKeys[i], cycles);
      
      if (!success) {
        console.log(`⚠️ Không thể xử lý tài khoản ${i + 1}, chuyển sang tài khoản tiếp theo`.yellow);
      }
      
      if (i < privateKeys.length - 1) {
        console.log(`⏱️ Chờ 3 giây trước khi chuyển sang tài khoản tiếp theo...`.cyan);
        await delay(ACCOUNT_SWITCH_DELAY);
      }
    }
    
    if (interval) {
      console.log(`\n⏱️ Tất cả các tài khoản được xử lý. Đợt tiếp theo sẽ chạy vào ${interval} giờ`.cyan);
      setTimeout(() => processAllAccounts(cycles, interval), interval * 60 * 60 * 1000);
    } else {
      console.log(`\n✅ Tất cả các tài khoản được xử lý thành công`.green.bold);
    }
  } catch (error) {
    console.error(`❌ Lỗi rồi: ${error.message}`.red);
  }
}

function run() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "Bạn muốn thực hiện bao nhiêu chu kỳ cho mỗi tài khoản? (Enter mặc định 1): ",
    (cycles) => {
      rl.question(
        "Bạn muốn mỗi chu kì chạy bao lâu một lần (tính bằng giờ)? (Nhấn enter để chạy luôn): ",
        (hours) => {
          let cyclesCount = cycles ? parseInt(cycles) : 1;
          let intervalHours = hours ? parseInt(hours) : null;

          if (
            isNaN(cyclesCount) ||
            (intervalHours !== null && isNaN(intervalHours))
          ) {
            console.log("❌ Vui lòng nhập số hợp lệ.".red);
            rl.close();
            return;
          }
          
          processAllAccounts(cyclesCount, intervalHours);
          rl.close();
        }
      );
    }
  );
}

async function runAutomated(cycles = 1, intervalHours = null) {
  await processAllAccounts(cycles, intervalHours);
  return true;
}

module.exports = { 
  run, 
  runAutomated 
};

if (require.main === module) {
  run();
}