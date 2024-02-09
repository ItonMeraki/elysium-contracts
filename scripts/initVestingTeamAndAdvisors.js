const { network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../deploy_info.json')

//=========CHANGE_THIS==========
const TGE_START_TIME = "123"; 
const BENEFICIARY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
//==============================

async function main() {
  console.log("Initialize VestingTeamAndAdvisors");
  console.log("-----------------------------");

  const VestingTeamAndAdvisors = await ethers.getContractFactory("VestingTeamAndAdvisors");
  const vestingTeamAndAdvisors = await VestingTeamAndAdvisors.attach(deployInfo[network.name].vestingPreExchange);
 
  let tx =  await vestingTeamAndAdvisors.init(TGE_START_TIME, BENEFICIARY_ADDRESS);
  console.log("VestingTeamAndAdvisors initialized:", tx.hash );
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
