const fs = require("fs");
const { network, upgrades } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../deploy_info.json');
const { getImplementationAddress }  = require('@openzeppelin/upgrades-core');
    

async function main() {
    console.log("VERIFY ELYSIUM SCHEME");
    console.log("------------------------");


      try {
        await hre.run("verify:verify", {
          address: deployInfo[network.name].elysiumToken,
          constructorArguments: [],
          contract: "contracts/ElysiumERC20.sol:ElysiumERC20",
        });
      } catch (e) {
        console.log(e.message);
      }


    const userLicensesImplAddress = await getImplementationAddress(ethers.provider, deployInfo[network.name].userLicenses);
    console.log(userLicensesImplAddress)
    try {
        await hre.run("verify:verify", {
            address: userLicensesImplAddress,
            constructorArguments: [],
            contract: "contracts/UserLicenses.sol:UserLicenses",
        });
    } catch (e) {
        console.log(e.message);
    }

    const reputationLicensesImplAddress = await getImplementationAddress(ethers.provider, deployInfo[network.name].reputationLicenses);
    try {
        await hre.run("verify:verify", {
            address: reputationLicensesImplAddress,
            constructorArguments: [],
            contract: "contracts/ReputationLicenses.sol:ReputationLicenses",
        });
    } catch (e) {
        console.log(e.message);
    }

    try {
        await hre.run("verify:verify", {
            address: deployInfo[network.name].vestingPreExchange,
            constructorArguments: [deployInfo[network.name].elysiumToken],
            contract: "contracts/VestingPreExchange.sol:VestingPreExchange",
        });
    } catch (e) {
        console.log(e.message);
    }

    try {
        await hre.run("verify:verify", {
            address: deployInfo[network.name].vestingTeamAndAdvisors,
            constructorArguments: [deployInfo[network.name].elysiumToken],
            contract: "contracts/VestingTeamAndDevelopment.sol:VestingTeamAndDevelopment",
        });
    } catch (e) {
        console.log(e.message);
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });