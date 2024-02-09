const { expect } = require("chai");
const { ethers } = require("hardhat");

const increaseTime = async (duration) => {
  if (!ethers.BigNumber.isBigNumber(duration)) {
    duration = ethers.BigNumber.from(duration);
  }

  if (duration.isNegative())
    throw Error(`Cannot increase time by a negative amount (${duration})`);

  await hre.network.provider.request({
    method: "evm_increaseTime",
    params: [duration.toNumber()],
  });

  await hre.network.provider.request({
    method: "evm_mine",
  });
};

const takeSnapshot = async () => {
  return await hre.network.provider.request({
    method: "evm_snapshot",
    params: [],
  })
};

const restoreSnapshot = async (id) => {
  await hre.network.provider.request({
    method: "evm_revert",
    params: [id],
  });
};

async function signPermission(stakingAddress, user, schemeId, locationId, domainName, userNonce) {
  const abi = ["function stakeTokens(uint256, bytes32, string, uint8, bytes32, bytes32)"]
  const iface = new ethers.utils.Interface(abi)
  const selector = iface.getSighash('stakeTokens');

  const resultHash = ethers.utils.solidityKeccak256(
    ["bytes4", "address", "address", "uint256", "bytes32", "string", "uint256"],
    [selector, stakingAddress, user, schemeId, locationId, domainName, userNonce]
  );

  const signature = await owner.signMessage(ethers.utils.arrayify(resultHash));

  return ethers.utils.splitSignature(signature);;
}

before(async () => {
  [owner, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
  MONTH = 2592000;
  domainName = "TestDomainName"
  snapshot = await takeSnapshot();
  const ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
  elysiumToken = await ElysiumERC20.deploy();
  await elysiumToken.deployed();
  const UserLicenses = await ethers.getContractFactory("UserLicenses");
  userLicenses = await upgrades.deployProxy(UserLicenses, [elysiumToken.address]);
  await userLicenses.deployed();
  const ReputationLicenses = await ethers.getContractFactory("ReputationLicenses");
  reputationLicenses = await upgrades.deployProxy(ReputationLicenses, [elysiumToken.address, userLicenses.address]);

  await reputationLicenses.setPenaltyIncomeVault(addrs[0].address)
  await reputationLicenses.deployed();

  await reputationLicenses.setTrustedSigner(owner.address)
  await elysiumToken.setTrustedBurner(userLicenses.address)

  await elysiumToken.excludeFromFee(userLicenses.address)
  await elysiumToken.excludeFromFee(reputationLicenses.address)

  await elysiumToken.transfer(reputationLicenses.address, ethers.utils.parseEther("4300000000.0"))
});


describe("ReputationLicenses", function () {

  it("Get all available schemes", async function () {
    await reputationLicenses.getAllSchemes()
  });

  it("Stake scheme #1 Special (with payout)", async function () {
    const locationId = ethers.utils.randomBytes(32);
    const scheme = await userLicenses.getVerificationSchemeByIndex(1);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user1.address, verifyAmount)
    await elysiumToken.connect(user1).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user1).verifyPlan(1, domainName)
    expect(await userLicenses.getUserPlan(user1.address)).equals(1)

    const stakingSchemeId = 0;
    const stakingScheme = await reputationLicenses.getAllSchemes();
    const stakeAmount = stakingScheme[stakingSchemeId].tokenAmount;
    const stakeDuration = stakingScheme[stakingSchemeId].duration;
    const apr = stakingScheme[stakingSchemeId].apr;
    const expectedBalance = BigInt(stakeAmount) + BigInt(stakeAmount) * BigInt(apr) / BigInt(100)

    const userNonce = await reputationLicenses.nonces(user1.address)
    const { v, r, s } = await signPermission(reputationLicenses.address, user1.address, stakingSchemeId, locationId, domainName, userNonce);

    await elysiumToken.transfer(user1.address, stakeAmount);

    await elysiumToken.connect(user1).approve(reputationLicenses.address, stakeAmount);
    await reputationLicenses.connect(user1).stakeTokens(stakingSchemeId, locationId, domainName, v, r, s);

    await increaseTime(stakeDuration);
    await reputationLicenses.connect(user1).claimRewards(0)

    expect(await elysiumToken.balanceOf(user1.address)).equals(expectedBalance)
  });

  it("Stake scheme #2 Ambassador (with payout)", async function () {
    const locationId = ethers.utils.randomBytes(32);
    const scheme = await userLicenses.getVerificationSchemeByIndex(2);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user2.address, verifyAmount)
    await elysiumToken.connect(user2).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user2).verifyPlan(2, domainName)
    expect(await userLicenses.getUserPlan(user2.address)).equals(2)

    const stakingSchemeId = 1;
    const stakingScheme = await reputationLicenses.getAllSchemes();
    const stakeAmount = stakingScheme[stakingSchemeId].tokenAmount;
    const stakeDuration = stakingScheme[stakingSchemeId].duration;
    const apr = stakingScheme[stakingSchemeId].apr;
    const expectedBalance = BigInt(stakeAmount) + BigInt(stakeAmount) * BigInt(apr) / BigInt(100)

    const userNonce = await reputationLicenses.nonces(user2.address)
    const { v, r, s } = await signPermission(reputationLicenses.address, user2.address, stakingSchemeId, locationId, domainName, userNonce);

    await elysiumToken.transfer(user2.address, stakeAmount)

    await elysiumToken.connect(user2).approve(reputationLicenses.address, stakeAmount);
    await reputationLicenses.connect(user2).stakeTokens(stakingSchemeId, locationId,domainName, v, r, s)

    await increaseTime(stakeDuration);
    await reputationLicenses.connect(user2).claimRewards(1)

    expect(await elysiumToken.balanceOf(user2.address)).equals(expectedBalance)
  });

  it("Get all user's stakes", async function () {
    const userStake1 = await reputationLicenses.getAllUserStakes(user1.address)
    expect(userStake1[0]).equals(0)
    const userStake2 = await reputationLicenses.getAllUserStakes(user2.address)
    expect(userStake2[0]).equals(1)
  });

  it("Cancel user's stake", async function () {
    const locationId = ethers.utils.randomBytes(32);
    const scheme = await userLicenses.getVerificationSchemeByIndex(1);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user3.address, verifyAmount)
    await elysiumToken.connect(user3).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user3).verifyPlan(1, domainName)
    expect(await userLicenses.getUserPlan(user3.address)).equals(1)

    await reputationLicenses.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MODERATOR_ROLE")), owner.address)
    const stakingSchemeId = 0;
    const stakingScheme = await reputationLicenses.getAllSchemes();
    const stakeAmount = stakingScheme[stakingSchemeId].tokenAmount;
    const stakeDuration = stakingScheme[stakingSchemeId].duration;
    const apr = stakingScheme[stakingSchemeId].apr;

    const userNonce = await reputationLicenses.nonces(user3.address)
    const { v, r, s } = await signPermission(reputationLicenses.address, user3.address, stakingSchemeId, locationId, domainName, userNonce);

    await elysiumToken.transfer(user3.address, stakeAmount)

    await elysiumToken.connect(user3).approve(reputationLicenses.address, stakeAmount);
    await reputationLicenses.connect(user3).stakeTokens(stakingSchemeId, locationId, domainName, v, r, s)

    await reputationLicenses.cancelUserStake(1, 50)
    const userStake = await reputationLicenses.getStakeById(1)
    expect(userStake.canceled).equals(true)

    await increaseTime(stakeDuration);
    await expect(reputationLicenses.connect(user3).claimRewards(1)).to.be.reverted;

  });

  it("Add available scheme", async function () {
    const access = 2;
    const duration = 3 * MONTH;
    const tokenAmount = ethers.utils.parseEther("1000.0");
    const apr = 25;
    await reputationLicenses.addStakingScheme({
      licenseType: 1,
      access: access,
      duration: duration,
      tokenAmount: tokenAmount,
      apr: apr
    })
    const allSchemes = await reputationLicenses.getAllSchemes();
    expect(allSchemes[7].access).equals(access);
    expect(allSchemes[7].duration).equals(duration);
    expect(allSchemes[7].tokenAmount).equals(tokenAmount);
    expect(allSchemes[7].apr).equals(apr);
  });

  it("Edit available scheme", async function () {
    const schemeId = 7;
    const licenseType = 1;
    const access = 1;
    const duration = 5 * MONTH;
    const tokenAmount = ethers.utils.parseEther("2000.0");
    const apr = 35;
    await reputationLicenses.editAvailableStakingScheme(
      schemeId,
      licenseType,
      access,
      duration,
      tokenAmount,
      apr
    );
    const allSchemes = await reputationLicenses.getAllSchemes();
    expect(allSchemes[7].duration).equals(duration);
    expect(allSchemes[7].access).equals(access);
    expect(allSchemes[7].tokenAmount).equals(tokenAmount);
    expect(allSchemes[7].apr).equals(apr);
  });

  it("Delete scheme", async function () {
    const schemeId = 7;
    await reputationLicenses.removeAvailableScheme(schemeId);
    const allSchemes = await reputationLicenses.getAllSchemes();
    expect(allSchemes[7]).equals(undefined);
  });

  it("Stake scheme #1 Ambassador (with payout part by part)", async function () {
    const locationId = ethers.utils.randomBytes(32);
    const scheme = await userLicenses.getVerificationSchemeByIndex(2);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user4.address, verifyAmount)
    await elysiumToken.connect(user4).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user4).verifyPlan(2, domainName)
    expect(await userLicenses.getUserPlan(user4.address)).equals(2)

    const stakingSchemeId = 1;
    const stakingScheme = await reputationLicenses.getAllSchemes();
    const stakeAmount = stakingScheme[stakingSchemeId].tokenAmount;
    const stakeDuration = stakingScheme[stakingSchemeId].duration;
    const apr = stakingScheme[stakingSchemeId].apr;
    const expectedBalance = BigInt((BigInt(stakeAmount) * BigInt(apr) / BigInt(100))) / (BigInt(stakeDuration) / BigInt(MONTH))

    if (expectedBalance * (BigInt(stakeDuration) / BigInt(MONTH) + BigInt(stakingScheme[stakingSchemeId].tokenAmount))
      < (BigInt(stakeAmount) * (BigInt(100) + BigInt(apr)) / BigInt(100))) {
      expectedFinalBalance = BigInt(expectedBalance) * BigInt(6) + BigInt(stakeAmount)
    } else { expectedFinalBalance = BigInt(stakeAmount) * (BigInt(100) + BigInt(apr)) / BigInt(100) }

    const userNonce = await reputationLicenses.nonces(user4.address)
    const { v, r, s } = await signPermission(reputationLicenses.address, user4.address, stakingSchemeId, locationId, domainName, userNonce);

    await elysiumToken.transfer(user4.address, stakeAmount)

    await elysiumToken.connect(user4).approve(reputationLicenses.address, stakeAmount);
    await reputationLicenses.connect(user4).stakeTokens(stakingSchemeId, locationId,domainName, v, r, s)

    await increaseTime(MONTH);
    await reputationLicenses.connect(user4).claimRewards(3)
    expect(await elysiumToken.balanceOf(user4.address)).equals(expectedBalance)
    await increaseTime(MONTH);
    await reputationLicenses.connect(user4).claimRewards(3)
    expect(await elysiumToken.balanceOf(user4.address)).equals(BigInt(expectedBalance) * BigInt(2))
    await increaseTime(MONTH);
    await reputationLicenses.connect(user4).claimRewards(3)
    expect(await elysiumToken.balanceOf(user4.address)).equals(BigInt(expectedBalance) * BigInt(3))
    await increaseTime(MONTH);
    await reputationLicenses.connect(user4).claimRewards(3)
    expect(await elysiumToken.balanceOf(user4.address)).equals(BigInt(expectedBalance) * BigInt(4))
    await increaseTime(MONTH);
    await reputationLicenses.connect(user4).claimRewards(3)
    expect(await elysiumToken.balanceOf(user4.address)).equals(BigInt(expectedBalance) * BigInt(5))
    await increaseTime(MONTH);
    await reputationLicenses.connect(user4).claimRewards(3)
    expect(await elysiumToken.balanceOf(user4.address)).equals(expectedFinalBalance)
    await increaseTime(MONTH);
    await expect(reputationLicenses.connect(user4).claimRewards(3)).to.be.reverted;
  });
});