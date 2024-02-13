const fs = require("fs");
const { network, upgrades  } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../deploy_info.json');

//=========CHANGE_THIS==========
const STKAING_LIQUIDITY =  ethers.utils.parseEther("5100000000.0");
const VESTING_PREEXCHANGE_LIQUIDITY =  ethers.utils.parseEther("1200000000.0");
const VESTING_TEAM_LIQUIDITY =  ethers.utils.parseEther("1750000000.0");
//==============================

deployInfo[network.name] = {
  "elysiumToken": "",
  "userLicenses": "",
  "reputationLicenses": "",
  "vestingPreExchange": "",
  "vestingTeamAndAdvisors": ""
}

async function main() {
  [owner] = await ethers.getSigners();
  console.log("DEPLOYER:", owner.address);

  console.log("DEPLOYING ELYSIUM SCHEME");
  console.log("------------------------");
  const ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
  const elysiumToken = await ElysiumERC20.deploy();
  await elysiumToken.deployed();
  deployInfo[network.name].elysiumToken = elysiumToken.address;
  console.log("ElysiumERC20:", elysiumToken.address);
  const UserLicenses = await ethers.getContractFactory("UserLicenses");
  const userLicensesProxy = await upgrades.deployProxy(UserLicenses, [elysiumToken.address]);
  // const userLicensesProxy = await UserLicenses.deploy(elysiumToken.address);
  await userLicensesProxy.deployed();
  deployInfo[network.name].userLicenses = userLicensesProxy.address;
  console.log("UserLicenses:", userLicensesProxy.address);
  const ReputationLicenses = await ethers.getContractFactory("ReputationLicenses");
  const reputationLicensesProxy = await upgrades.deployProxy(ReputationLicenses, [elysiumToken.address, userLicensesProxy.address]);
  // const reputationLicensesProxy = await ReputationLicenses.deploy(elysiumToken.address, userLicensesProxy.address);
  await reputationLicensesProxy.deployed();
  deployInfo[network.name].reputationLicenses = reputationLicensesProxy.address;
  console.log("ReputationLicenses:", reputationLicensesProxy.address);
  const VestingPreExchange = await ethers.getContractFactory("VestingPreExchange");
  const vestingPreExchange = await VestingPreExchange.deploy(elysiumToken.address);
  await vestingPreExchange.deployed();
  deployInfo[network.name].vestingPreExchange = vestingPreExchange.address;
  console.log("VestingPreExchange:", vestingPreExchange.address);
  const VestingTeamAndDevelopment = await ethers.getContractFactory("VestingTeamAndDevelopment");
  const vestingTeamAndAdvisors = await VestingTeamAndDevelopment.deploy(elysiumToken.address);
  await vestingTeamAndAdvisors.deployed();
  deployInfo[network.name].vestingTeamAndAdvisors = vestingTeamAndAdvisors.address;
  console.log("VestingTeamAndDevelopment:", vestingTeamAndAdvisors.address);

  console.log("------------------------");
  await elysiumToken.excludeFromFee(userLicensesProxy.address);
  console.log("Verifier is excluded from fee");
  await elysiumToken.excludeFromFee(reputationLicensesProxy.address);
  console.log("ReputationLicenses is excluded from fee");
  await elysiumToken.excludeFromFee(vestingPreExchange.address);
  console.log("VestingPreExchange is excluded from fee");
  await elysiumToken.excludeFromFee(vestingTeamAndAdvisors.address);
  console.log("VestingTeamAndDevelopment is excluded from fee");

  console.log("------------------------");
  await elysiumToken.excludeFromReward(userLicensesProxy.address);
  console.log("Verifier is excluded from reward");
  await elysiumToken.excludeFromReward(reputationLicensesProxy.address);
  console.log("ReputationLicenses is excluded from reward");
  await elysiumToken.excludeFromReward(vestingPreExchange.address);
  console.log("VestingPreExchange is excluded from reward");
  await elysiumToken.excludeFromReward(vestingTeamAndAdvisors.address);
  console.log("VestingTeamAndDevelopment is excluded from reward");
  
  console.log("------------------------");
  await elysiumToken.setTrustedBurner(userLicensesProxy.address);
  console.log("Set trusted burner UserLicenses contract");

  console.log("------------------------");
  await elysiumToken.transfer(reputationLicensesProxy.address, STKAING_LIQUIDITY);
  console.log("Transfer", ethers.utils.formatEther(STKAING_LIQUIDITY), "ELYS to ReputationLicenses contract");
  await elysiumToken.transfer(reputationLicensesProxy.address, VESTING_PREEXCHANGE_LIQUIDITY);
  console.log("Transfer", ethers.utils.formatEther(VESTING_PREEXCHANGE_LIQUIDITY), "ELYS to VestingPreExchange contract");
  await elysiumToken.transfer(reputationLicensesProxy.address, VESTING_TEAM_LIQUIDITY);
  console.log("Transfer", ethers.utils.formatEther(VESTING_TEAM_LIQUIDITY), "ELYS to VestingTeamAndDevelopment contract");
  
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
