// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const USDT = await hre.ethers.getContractFactory("USDT");
  const usdt = await USDT.deploy();
  await usdt.deployed();

  const Reward = await hre.ethers.getContractFactory("Reward");
  const reward = await Reward.deploy(usdt.address);
  await reward.deployed();

  await usdt.transfer(reward.address, hre.ethers.utils.parseEther("1000"));
  await usdt.transfer("0x34B4B2fCF8EbB1e4E346806F629C392EE333A833", hre.ethers.utils.parseEther("500"));
  await usdt.transfer("0x499405D5C660e71FaA42812A2DA29971f740C16F", hre.ethers.utils.parseEther("500"));

  console.table({
    reward: reward.address,
    usdt: usdt.address,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
