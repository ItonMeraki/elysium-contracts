const { expect } = require("chai");
const { ethers } = require("hardhat");

before(async () => {
  [owner, user1, user2, user3, ...addrs] = await ethers.getSigners();
  domainName = "TestDomainName"
  ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
  elysiumToken = await ElysiumERC20.deploy();
  await elysiumToken.deployed();
  UserLicenses = await ethers.getContractFactory("UserLicenses");
  userLicenses = await upgrades.deployProxy(UserLicenses, [elysiumToken.address]);
  await userLicenses.deployed();
  await elysiumToken.excludeFromFee(userLicenses.address)
  await elysiumToken.setTrustedBurner(userLicenses.address)

  await elysiumToken.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MODERATOR_ROLE")), userLicenses.address)

  // await elysiumToken.excludeFromReward(userLicenses.address)
});

describe("UserLicenses", function () {

  it("Get verification plan 'Special'", async function () {
    const scheme = await userLicenses.getVerificationSchemeByIndex(1);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user2.address, verifyAmount)
    await elysiumToken.connect(user2).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user2).verifyPlan(1, domainName)
    expect(await userLicenses.getUserPlan(user2.address)).equals(1)
  });

  it("Get verification plan 'Ambassador'", async function () {
    const scheme = await userLicenses.getVerificationSchemeByIndex(2);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user3.address, verifyAmount)
    await elysiumToken.connect(user3).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user3).verifyPlan(2, domainName)
    expect(await userLicenses.getUserPlan(user3.address)).equals(2)
  });

  it("Upgrade verification plan 'Special -> Ambassador'", async function () {
    const schemeAmbassador = await userLicenses.getVerificationSchemeByIndex(2);
    const schemeSpecial = await userLicenses.getVerificationSchemeByIndex(1);
    const verifyAmount =  BigInt(schemeAmbassador.tokenAmountRequired) -  BigInt(schemeSpecial.tokenAmountRequired)
    await elysiumToken.transfer(user2.address, verifyAmount)
    await elysiumToken.connect(user2).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user2).verifyPlan(2, domainName)
    expect(await userLicenses.getUserPlan(user2.address)).equals(2)
  });

  it("Cancel user's verification plan", async function () {
    await userLicenses.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MODERATOR_ROLE")), owner.address)
    await userLicenses.cancelUserVerification(user2.address)
    expect(await userLicenses.getUserPlan(user2.address)).equals(0)
  });

});