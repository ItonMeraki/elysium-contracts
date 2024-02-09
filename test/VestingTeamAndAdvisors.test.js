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

const OFFSET = 10;
const MONTH = 2592000;
const YEAR = 31536000;

before(async () => {
  [owner, user1, user2, user3, ...addrs] = await ethers.getSigners();
});

beforeEach(async () => {
  snapshot = await takeSnapshot();
  tgeStartTime = Math.floor(Date.now() / 1000)
  ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
  elysiumToken = await ElysiumERC20.deploy();
  await elysiumToken.deployed();
  VestingTeamAndAdvisors = await ethers.getContractFactory("VestingTeamAndAdvisors");
  vesting = await VestingTeamAndAdvisors.deploy(elysiumToken.address);
  await vesting.deployed();
  await elysiumToken.excludeFromFee(vesting.address)

  beneficiary = user1.address

  totalVestedAmount = await vesting.totalVestedAmount();
  await elysiumToken.approve(vesting.address, totalVestedAmount);
  
  await vesting.init(tgeStartTime + OFFSET, user1.address)

});

afterEach(async () => {
  await restoreSnapshot(snapshot)
});

describe("VestingTeamAndAdvisors", function () {

  const cliffTimeAddition1 = YEAR + OFFSET;
  const cliffTimeAddition2 = YEAR + (5 * MONTH) + OFFSET;
  const cliffTimeAddition3 = (2 * YEAR) + OFFSET;
  const cliffTimeAddition4 = (2 * YEAR) + (5 * MONTH) + OFFSET;
  const cliffTimeAddition5 = (3 * YEAR) + OFFSET;
  const cliffTimeAddition6 = (3 * YEAR) + (5 * MONTH) + OFFSET;

  it("Claim cliff #1", async function () {
    await increaseTime(cliffTimeAddition1)
    cliff1 = await vesting.cliff(0)
    const cliffAmount1 = ethers.utils.formatEther(cliff1.amount)
    await vesting.connect(user1).claimTokens(user1.address, ethers.utils.parseEther(cliffAmount1))
    expect(await elysiumToken.balanceOf(user1.address)).equals(cliff1.amount)
  });

  it("Claim cliff #2", async function () {
    await increaseTime(cliffTimeAddition2)
    cliff2 = await vesting.cliff(1)
    const cliffAmount2 = ethers.utils.formatEther(cliff2.amount)
    await vesting.connect(user1).claimTokens(user1.address, ethers.utils.parseEther(cliffAmount2))
    expect(await elysiumToken.balanceOf(user1.address)).equals(cliff2.amount)
  });

  it("Claim cliff #3", async function () {
    await increaseTime(cliffTimeAddition3)
    cliff3 = await vesting.cliff(2)
    const cliffAmount3 = ethers.utils.formatEther(cliff3.amount)
    await vesting.connect(user1).claimTokens(user1.address, ethers.utils.parseEther(cliffAmount3))
    expect(await elysiumToken.balanceOf(user1.address)).equals(cliff3.amount)
  });

  it("Claim cliff #4", async function () {
    await increaseTime(cliffTimeAddition4)
    cliff4 = await vesting.cliff(3)
    const cliffAmount4 = ethers.utils.formatEther(cliff4.amount)
    await vesting.connect(user1).claimTokens(user1.address, ethers.utils.parseEther(cliffAmount4))
    expect(await elysiumToken.balanceOf(user1.address)).equals(cliff4.amount)
  });

  it("Claim cliff #5", async function () {
    await increaseTime(cliffTimeAddition5)
    cliff5 = await vesting.cliff(4)
    const cliffAmount5 = ethers.utils.formatEther(cliff5.amount)
    await vesting.connect(user1).claimTokens(user1.address, ethers.utils.parseEther(cliffAmount5))
    expect(await elysiumToken.balanceOf(user1.address)).equals(cliff5.amount)
  });

  it("Claim cliff #6", async function () {
    await increaseTime(cliffTimeAddition6)
    cliff6 = await vesting.cliff(5)
    const cliffAmount6 = ethers.utils.formatEther(cliff6.amount)
    await vesting.connect(user1).claimTokens(user1.address, ethers.utils.parseEther(cliffAmount6))
    expect(await elysiumToken.balanceOf(user1.address)).equals(cliff6.amount)
  });

  it("Claim all at once", async function () {
    await increaseTime(cliffTimeAddition6)
    await vesting.connect(user1).claimTokens(user1.address, totalVestedAmount)
    expect(await elysiumToken.balanceOf(user1.address)).equals(totalVestedAmount)
  });

  it("Claim part by part", async function () {
    await increaseTime(cliffTimeAddition6)
    const part = BigInt(totalVestedAmount) / BigInt(2)
    await vesting.connect(user1).claimTokens(user1.address, part)
    await vesting.connect(user1).claimTokens(user1.address, part)
    expect(await elysiumToken.balanceOf(user1.address)).equals(totalVestedAmount)
  });

  it("Claim before time (revert)", async function () {
    await expect(vesting.connect(user1).claimTokens(user1.address, totalVestedAmount)).to.be.reverted;
    expect(await elysiumToken.balanceOf(user1.address)).not.equal(totalVestedAmount)
  });
});
