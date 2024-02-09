const fs = require("fs");
const { network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../deploy_info.json');

//=========CHANGE_THIS==========
const NEW_OWNER = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
//==============================

async function main() {

  // ElysiumERC20 contract
  const ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
  const elysiumToken = await ElysiumERC20.attach(deployInfo[network.name].elysiumToken);
  // transfer ownership
  console.log(`ElysiumERC20 current owner ${await elysiumToken.owner()}`);
  await elysiumToken.transferOwnership(NEW_OWNER);
  console.log(`Ownership of ElysiumERC20 transferred to ${NEW_OWNER}`);

  // Verifier contract
  const UserLicenses = await ethers.getContractFactory("UserLicenses");
  const userLicenses = await UserLicenses.attach(deployInfo[network.name].userLicenses);
  // transfer ownership
  console.log(`UserLicenses current owner ${await userLicenses.owner()}`);
  await userLicenses.transferOwnership(NEW_OWNER);
  console.log(`Ownership of Verifier transferred to ${NEW_OWNER}`);

  // ReputationLicenses contract
  const ReputationLicenses = await ethers.getContractFactory("ReputationLicenses");
  const reputationLicenses = await ReputationLicenses.attach(deployInfo[network.name].reputationLicenses);
  // transfer ownership
  console.log(`ReputationLicenses current owner ${await reputationLicenses.owner()}`);
  await reputationLicenses.transferOwnership(NEW_OWNER);
  console.log(`Ownership of ReputationLicenses transferred to ${NEW_OWNER}`);

  // VestingPreExchange contract
  const VestingPreExchange = await ethers.getContractFactory("VestingPreExchange");
  const vestingPreExchange = await VestingPreExchange.attach(deployInfo[network.name].vestingPreExchange);
  // transfer ownership
  console.log(`VestingPreExchange current owner ${await vestingPreExchange.owner()}`);
  await vestingPreExchange.transferOwnership(NEW_OWNER);
  console.log(`Ownership of VestingPreExchange transferred to ${NEW_OWNER}`);

  // VestingTeamAndAdvisors contract
  const VestingTeamAndAdvisors = await ethers.getContractFactory("VestingTeamAndAdvisors");
  const vestingTeamAndAdvisors = await VestingTeamAndAdvisors.attach(deployInfo[network.name].vestingTeamAndAdvisors);
  // transfer ownership
  console.log(`VestingTeamAndAdvisors current owner ${await vestingTeamAndAdvisors.owner()}`);
  await vestingTeamAndAdvisors.transferOwnership(NEW_OWNER);
  console.log(`Ownership of VestingTeamAndAdvisors transferred to ${NEW_OWNER}`);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
