const prompts = require("prompts");

const availableScripts = [
  { title: "Rubics (Swap)", value: "rubic" },
  { title: "Izumi (Swap)", value: "izumi" },
  { title: "Beanswap (Swap)", value: "beanswap" },
  { title: "Magma (Stake)", value: "magma" },
  { title: "Apriori (Stake)", value: "apriori" },
  { title: "Chạy auto lần lượt", value: "all" },
  { title: "Exit", value: "exit" },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scriptConfigs = {
  rubic: { cycles: 1, intervalHours: null },
  magma: { cycles: 1, intervalHours: null },
  izumi: { cycles: 1, intervalHours: null },
  apriori: { cycles: 1, intervalHours: null },
  beanswap: { cycles: 1, intervalHours: null }
};

async function runScript(scriptName, automated = false) {
  try {
    let scriptModule;
    
    switch (scriptName) {
      case "rubic":
        console.log("Chạy Rubics (Swap)...");
        scriptModule = require("./scripts/rubic");
        break;

      case "magma":
        console.log("Chạy Magma (Stake)...");
        scriptModule = require("./scripts/magma");
        break;

      case "izumi":
        console.log("Chạy Izumi (Swap)...");
        scriptModule = require("./scripts/izumi");
        break;

      case "apriori":
        console.log("Chạy Apriori (Stake)...");
        scriptModule = require("./scripts/apriori");
        break;
        
      case "beanswap":
        console.log("Chạy Beanswap (Swap)...");
        scriptModule = require("./scripts/beanswap");
        break;

      default:
        console.log(`Unknown script: ${scriptName}`);
        return;
    }
    
    if (automated && scriptModule.runAutomated) {
      await scriptModule.runAutomated(
        scriptConfigs[scriptName].cycles, 
        scriptConfigs[scriptName].intervalHours
      );
    } else if (automated) {
      console.log(`Warning: ${scriptName} tập lệnh không hỗ trợ chế độ auto.`);
      await scriptModule.run();
    } else {
      await scriptModule.run();
    }
  } catch (error) {
    console.error(`Không thể chạy ${scriptName} script:`, error.message);
  }
}

// async function runAllScriptsSequentially() {
//   const scriptOrder = ["rubic", "magma", "izumi", "apriori", "beanswap"];
  
//   console.log("-".repeat(60));
//   console.log("Đang ở chế độ tự động chạy lần lượt");
//   console.log("-".repeat(60));
  
//   const response = await prompts([
//     {
//       type: 'number',
//       name: 'cycles',
//       message: 'How many cycles would you like to run for each script?',
//       initial: 1
//     },
//     {
//       type: 'number',
//       name: 'intervalHours',
//       message: 'Run interval in hours (0 for no repetition):',
//       initial: 0
//     }
//   ]);
  
//   for (const script of scriptOrder) {
//     scriptConfigs[script].cycles = response.cycles || 1;
//     scriptConfigs[script].intervalHours = response.intervalHours > 0 ? response.intervalHours : null;
//   }
  
//   for (let i = 0; i < scriptOrder.length; i++) {
//     const scriptName = scriptOrder[i];
//     console.log(`\n[${i + 1}/${scriptOrder.length}] Bắt đầu chạy ${scriptName.toUpperCase()}...`);
    
//     await runScript(scriptName, true);
    
//     if (i < scriptOrder.length - 1) {
//       console.log(`\nĐã chạy xong ${scriptName.toUpperCase()}. Chờ 5 giây trước khi tiếp tục...`);
//       await delay(5000);
//     } else {
//       console.log(`\nĐã chạy xong ${scriptName.toUpperCase()}.`);
//     }
//   }
  
//   console.log("-".repeat(60));
//   console.log("Đã chạy xong tất cả");
//   console.log("-".repeat(60));
// }
// Hàm chạy lần lượt các script (cải tiến)
async function runAllScriptsSequentially() {
  const scriptOrder = ["rubic", "magma", "izumi", "apriori", "beanswap"];
  console.log("Chế độ tự động chạy lần lượt");

  for (const script of scriptOrder) {
    await runScript(script, true);
    console.log("-".repeat(60));
    console.log(`Đã chạy xong ${script}`);
    console.log("-".repeat(60));
  }
}

// async function run() {
//   const response = await prompts({
//     type: "select",
//     name: "script",
//     message: "Chọn bất kì để bắt đầu chạy:",
//     choices: availableScripts,
//   });

//   const selectedScript = response.script;

//   if (!selectedScript) {
//     console.log("Không có tập lệnh nào được chọn. Dừng bot...");
//     return;
//   }

//   if (selectedScript === "all") {
//     await runAllScriptsSequentially();
//   } else if (selectedScript === "exit") {
//     console.log("Dừng bot...");
//     process.exit(0);
//   } else {
//     await runScript(selectedScript);
//   }
// }

// Hàm khởi động tự động cải tiến
async function run() {
  await runAllScriptsSequentially();
}

run().catch((error) => {
  console.error("Error occurred:", error);
});

module.exports = { runScript, runAllScriptsSequentially };