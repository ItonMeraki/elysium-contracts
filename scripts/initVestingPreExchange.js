const { network } = require("hardhat");
let deployInfo = require(process.env.HHC_PASS ? process.env.HHC_PASS : '../deploy_info.json');

//=========CHANGE_THIS==========
const PREEXCHANGE_START_TIME = "123";
//==============================

async function main() {
  console.log("Initialize VestingPreExchange");
  console.log("-----------------------------");

  const VestingPreExchange = await ethers.getContractFactory("VestingPreExchange");
  const vestingPreExchange = await VestingPreExchange.attach(deployInfo[network.name].vestingPreExchange);
 
  let tx =  await vestingPreExchange.init(PREEXCHANGE_START_TIME);
  console.log("VestingPreExchange initialized:", tx.hash );
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
