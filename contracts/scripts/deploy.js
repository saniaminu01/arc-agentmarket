const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  Arc AgentMarket — Contract Deployment");
  console.log("=".repeat(60));
  console.log("Network:  Arc Testnet (Chain ID: 5042002)");
  console.log("Deployer:", deployer.address);
  console.log("=".repeat(60));

  // Arc Testnet USDC address
  const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
  const PLATFORM_FEE = 100; // 1%

  console.log("\n[1/2] Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const registryAddress = await agentRegistry.getAddress();
  console.log("  ✓ AgentRegistry:", registryAddress);

  console.log("\n[2/2] Deploying JobFactory...");
  const JobFactory = await hre.ethers.getContractFactory("JobFactory");
  const jobFactory = await JobFactory.deploy(
    USDC_ADDRESS,
    registryAddress,
    deployer.address,
    PLATFORM_FEE
  );
  await jobFactory.waitForDeployment();
  const factoryAddress = await jobFactory.getAddress();
  console.log("  ✓ JobFactory:", factoryAddress);

  console.log("\n" + "=".repeat(60));
  console.log("  DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("AgentRegistry:", registryAddress);
  console.log("JobFactory:   ", factoryAddress);
  console.log("Deployer:     ", deployer.address);
  console.log("Explorer:      https://testnet.arcscan.app");
  console.log("=".repeat(60));

  console.log("\nVerify commands:");
  console.log(`npx hardhat verify --network arc_testnet ${registryAddress}`);
  console.log(`npx hardhat verify --network arc_testnet ${factoryAddress} "${USDC_ADDRESS}" "${registryAddress}" "${deployer.address}" ${PLATFORM_FEE}`);

  const fs = require("fs");
  fs.writeFileSync("deployed-addresses.json", JSON.stringify({
    network: "Arc Testnet",
    chainId: 5042002,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AgentRegistry: { address: registryAddress, description: "ERC-8004 AI agent identity registry" },
      JobFactory: { address: factoryAddress, description: "Deploys JobEscrow per job, tracks all jobs" },
      USDC: { address: USDC_ADDRESS, description: "Circle USDC — native Arc token" },
    }
  }, null, 2));
  console.log("\n✓ Saved to deployed-addresses.json");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
