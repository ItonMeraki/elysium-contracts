const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../deploy_info.json');

//=========CHANGE_THIS==========
const STKAING_LIQUIDITY =  ethers.utils.parseEther("4300000000.0");
const VESTING_PREEXCHANGE_LIQUIDITY =  ethers.utils.parseEther("1200000000.0");
const VESTING_TEAM_LIQUIDITY =  ethers.utils.parseEther("750000000.0");
//==============================

deployInfo[network.name] = {
  "elysiumToken": "",
  "userLicenses": "",
  "reputationLicenses": "",
  "vestingPreExchange": "",
  "vestingTeamAndAdvisors": ""
}

async function main() {
  console.log("DEPLOYING ELYSIUM SCHEME");
  console.log("------------------------");
  const ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
  const elysiumToken = await ElysiumERC20.deploy();
  await elysiumToken.deployed();
  deployInfo[network.name].elysiumToken = elysiumToken.address;
  console.log("ElysiumERC20:", elysiumToken.address);
  const UserLicenses = await ethers.getContractFactory("UserLicenses");
  const userLicenses = await UserLicenses.deploy(elysiumToken.address);
  await userLicenses.deployed();
  deployInfo[network.name].userLicenses = userLicenses.address;
  console.log("UserLicenses:", userLicenses.address);
  const ReputationLicenses = await ethers.getContractFactory("ReputationLicenses");
  const reputationLicenses = await ReputationLicenses.deploy(elysiumToken.address, userLicenses.address);
  await reputationLicenses.deployed();
  deployInfo[network.name].reputationLicenses = reputationLicenses.address;
  console.log("ReputationLicenses:", reputationLicenses.address);
  const VestingPreExchange = await ethers.getContractFactory("VestingPreExchange");
  const vestingPreExchange = await VestingPreExchange.deploy(elysiumToken.address);
  await vestingPreExchange.deployed();
  deployInfo[network.name].vestingPreExchange = vestingPreExchange.address;
  console.log("VestingPreExchange:", vestingPreExchange.address);
  const VestingTeamAndAdvisors = await ethers.getContractFactory("VestingTeamAndAdvisors");
  const vestingTeamAndAdvisors = await VestingTeamAndAdvisors.deploy(elysiumToken.address);
  await vestingTeamAndAdvisors.deployed();
  deployInfo[network.name].vestingTeamAndAdvisors = vestingTeamAndAdvisors.address;
  console.log("VestingTeamAndAdvisors:", vestingTeamAndAdvisors.address);

  console.log("------------------------");
  await elysiumToken.excludeFromFee(userLicenses.address);
  console.log("Verifier is excluded from fee");
  await elysiumToken.excludeFromFee(reputationLicenses.address);
  console.log("ReputationLicenses is excluded from fee");
  await elysiumToken.excludeFromFee(vestingPreExchange.address);
  console.log("VestingPreExchange is excluded from fee");
  await elysiumToken.excludeFromFee(vestingTeamAndAdvisors.address);
  console.log("VestingTeamAndAdvisors is excluded from fee");

  console.log("------------------------");
  await elysiumToken.excludeFromReward(userLicenses.address);
  console.log("Verifier is excluded from reward");
  await elysiumToken.excludeFromReward(reputationLicenses.address);
  console.log("ReputationLicenses is excluded from reward");
  await elysiumToken.excludeFromReward(vestingPreExchange.address);
  console.log("VestingPreExchange is excluded from reward");
  await elysiumToken.excludeFromReward(vestingTeamAndAdvisors.address);
  console.log("VestingTeamAndAdvisors is excluded from reward");

  console.log("------------------------");
  await elysiumToken.transfer(reputationLicenses.address, STKAING_LIQUIDITY);
  console.log("Transfer", ethers.utils.formatEther(STKAING_LIQUIDITY), "ELYS to ReputationLicenses contract");
  await elysiumToken.transfer(reputationLicenses.address, VESTING_PREEXCHANGE_LIQUIDITY);
  console.log("Transfer", ethers.utils.formatEther(VESTING_PREEXCHANGE_LIQUIDITY), "ELYS to VestingPreExchange contract");
  await elysiumToken.transfer(reputationLicenses.address, VESTING_TEAM_LIQUIDITY);
  console.log("Transfer", ethers.utils.formatEther(VESTING_TEAM_LIQUIDITY), "ELYS to VestingTeamAndAdvisors contract");
  
  fs.writeFileSync(process.env.HHC_PASS ? process.env.HHC_PASS : "./deploy_info.json",
  JSON.stringify(deployInfo, undefined, 2));
  console.log("------------------------");
  console.log("Saved to deploy_info.json");
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
