# **Elysium Project**

<!-- ## **Contracts:** -->

### **ElysiumERC20** - A custom ERC20 token with a reflection mechanism. 
### **UserLicenses** - Controls user access to specific features or plans.
### **ReputationLicenses** - Manages reputation and staking schemes.
### **VestingPreExchange** - Implements a vesting schedule for users who participate in a pre-exchange event.
### **VestingTeamAndDevelopment** - Implements a vesting schedule for team members and advisors. 

------------------
## **IMPORTANT!**
### Change constant variables accordingly before running these commands.
### **Available networks:** polygon, bsctestnet, mumbai.
###### <br />
## Deploy all
```
npx hardhat run scripts/deployAll.js --network NETWORK_NAME
```

## Change owners in all contracts 
```
npx hardhat run scripts/changeOwner.js --network NETWORK_NAME
```

## Initialize Vesting Pre-Exchange 
```
npx hardhat run scripts/initVestingPreExchange.js --network NETWORK_NAME
```

## Initialize Vesting Team and Advisors
```
npx hardhat run scripts/initVestingTeamAndDevelopment.js --network NETWORK_NAME
```

## Test
```
npx hardhat test test/ContractName.test.js
```