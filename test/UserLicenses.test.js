const { expect } = require("chai");
const { ethers } = require("hardhat");

before(async () => {
  [owner, user1, user2, user3, ...addrs] = await ethers.getSigners();
  ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
  elysiumToken = await ElysiumERC20.deploy();
  await elysiumToken.deployed();
  UserLicenses = await ethers.getContractFactory("UserLicenses");
  userLicenses = await UserLicenses.deploy(elysiumToken.address);
  await userLicenses.deployed();
  await elysiumToken.excludeFromFee(userLicenses.address)

});

describe("UserLicenses", function () {
  it("Get verification plan 'Standart'", async function () {
    const scheme = await userLicenses.getVerificationSchemeByIndex(0);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user1.address, verifyAmount)
    await elysiumToken.connect(user1).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user1).verifyPlan(1)
    expect(await userLicenses.getUserPlan(user1.address)).equals(1)
  });

  it("Get verification plan 'Special'", async function () {
    const scheme = await userLicenses.getVerificationSchemeByIndex(1);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user2.address, verifyAmount)
    await elysiumToken.connect(user2).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user2).verifyPlan(2)
    expect(await userLicenses.getUserPlan(user2.address)).equals(2)
  });

  it("Get verification plan 'Ambassador'", async function () {
    const scheme = await userLicenses.getVerificationSchemeByIndex(2);
    const tokenAmountRequired = ethers.utils.formatEther(scheme.tokenAmountRequired);
    const verifyAmount = ethers.utils.parseEther(tokenAmountRequired)
    await elysiumToken.transfer(user3.address, verifyAmount)
    await elysiumToken.connect(user3).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user3).verifyPlan(3)
    expect(await userLicenses.getUserPlan(user3.address)).equals(3)
  });

  it("Upgrade verification plan 'Standart -> Special'", async function () {
    const verifyAmount = ethers.utils.parseEther("74777.0")
    await elysiumToken.transfer(user1.address, verifyAmount)
    await elysiumToken.connect(user1).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user1).verifyPlan(2)
    expect(await userLicenses.getUserPlan(user1.address)).equals(2)
  });

  it("Upgrade verification plan 'Special -> Ambassador'", async function () {
    const verifyAmount = ethers.utils.parseEther("172223.0")
    await elysiumToken.transfer(user1.address, verifyAmount)
    await elysiumToken.connect(user1).approve(userLicenses.address, verifyAmount);
    await userLicenses.connect(user1).verifyPlan(3)
    expect(await userLicenses.getUserPlan(user1.address)).equals(3)
  });

  it("Cancel user's verification plan", async function () {
    await userLicenses.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MODERATOR_ROLE")), owner.address)
    await userLicenses.cancelUserVerification(user1.address)
    expect(await userLicenses.getUserPlan(user1.address)).equals(0)
  });

});