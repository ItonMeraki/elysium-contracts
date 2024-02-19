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

const OFFSET = 10
const MONTH = 2592000;
const YEAR = 31536000;
let preExchangeStartTime;

before(async () => {
  [owner, user1, user2, user3, ...addrs] = await ethers.getSigners();
  preExchangeStartTime = Math.floor(Date.now() / 1000) + OFFSET
});

beforeEach(async () => {
  snapshot = await takeSnapshot();
  ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
  elysiumToken = await ElysiumERC20.deploy();
  await elysiumToken.deployed();
  VestingPreExchange = await ethers.getContractFactory("VestingPreExchange");
  vesting = await VestingPreExchange.deploy(elysiumToken.address);
  await vesting.deployed();
  await elysiumToken.excludeFromFee(vesting.address)

  beneficiary = user1.address

  totalVestedAmount = await vesting.totalVestedAmount();
  await elysiumToken.approve(vesting.address, totalVestedAmount);
  await vesting.init(preExchangeStartTime);
  await vesting.setTrustedWorker(owner.address);
  // const preExchangeStartTime = await vesting._preExchangeStartTime();
});

afterEach(async () => {
  await restoreSnapshot(snapshot)
});


const getPercent = async (amount , precent) => {

  return amount * precent / 100
  };

describe("VestingPreExchange", function () {
  const cliffTimeAddition1 = OFFSET;
  const cliffTimeAddition2 = (4 * MONTH);
  const cliffTimeAddition3 = (8 * MONTH);
  const cliffTimeAddition4 = (12 * MONTH);
  const cliffTimeAddition5 = (16 * MONTH);
  const cliffTimeAddition6 = (20 * MONTH);

  it("Claim cliff #1", async function () {
    const vestedAmount = ethers.utils.parseEther("10000.0");
    await vesting.addUser(user1.address, vestedAmount)
    await increaseTime(cliffTimeAddition1)
    const scheme = await vesting.getIndividualVestingScheme(user1.address)
    await vesting.connect(user1).claimTokens(user1.address, scheme.cliffs[0].amount)
    expect(await elysiumToken.balanceOf(user1.address)).equals(scheme.cliffs[0].amount)
  });

  it("Claim cliff #2", async function () {
    const vestedAmount = ethers.utils.parseEther("10000.0");
    await vesting.addUser(user1.address, vestedAmount)
    await increaseTime(cliffTimeAddition2)
    const scheme = await vesting.getIndividualVestingScheme(user1.address)
    await vesting.connect(user1).claimTokens(user1.address, scheme.cliffs[1].amount)
    expect(await elysiumToken.balanceOf(user1.address)).equals(scheme.cliffs[1].amount)
  });

  it("Claim cliff #3", async function () {
    const vestedAmount = ethers.utils.parseEther("10000.0");
    await vesting.addUser(user1.address, vestedAmount)
    await increaseTime(cliffTimeAddition3)
    const scheme = await vesting.getIndividualVestingScheme(user1.address)
    await vesting.connect(user1).claimTokens(user1.address, scheme.cliffs[2].amount)
    expect(await elysiumToken.balanceOf(user1.address)).equals(scheme.cliffs[2].amount)
  });

  it("Claim cliff #4", async function () {
    const vestedAmount = ethers.utils.parseEther("10000.0");
    await vesting.addUser(user1.address, vestedAmount)
    await increaseTime(cliffTimeAddition4)
    const scheme = await vesting.getIndividualVestingScheme(user1.address)
    await vesting.connect(user1).claimTokens(user1.address, scheme.cliffs[3].amount)
    expect(await elysiumToken.balanceOf(user1.address)).equals(scheme.cliffs[3].amount)
  });

  it("Claim cliff #5", async function () {
    const vestedAmount = ethers.utils.parseEther("10000.0");
    await vesting.addUser(user1.address, vestedAmount)
    await increaseTime(cliffTimeAddition5)
    const scheme = await vesting.getIndividualVestingScheme(user1.address)
    await vesting.connect(user1).claimTokens(user1.address, scheme.cliffs[4].amount)
    expect(await elysiumToken.balanceOf(user1.address)).equals(scheme.cliffs[4].amount)
  });

  it("Claim cliff #6", async function () {
    const vestedAmount = ethers.utils.parseEther("10000.0");
    await vesting.addUser(user1.address, vestedAmount)
    await increaseTime(cliffTimeAddition6)
    const scheme = await vesting.getIndividualVestingScheme(user1.address)
    await vesting.connect(user1).claimTokens(user1.address, scheme.cliffs[5].amount)
    expect(await elysiumToken.balanceOf(user1.address)).equals(scheme.cliffs[5].amount)
  });

  it("Claim all at once", async function () {
    const vestedAmount = ethers.utils.parseEther("10000.0");
    await vesting.addUser(user1.address, vestedAmount)
    await increaseTime(cliffTimeAddition6 + OFFSET)
    await vesting.connect(user1).claimTokens(user1.address, vestedAmount)
    expect(await elysiumToken.balanceOf(user1.address)).equals(vestedAmount)
  });

  it("Claim part by part", async function () {
    const vestedAmount = ethers.utils.parseEther("10000.0");
    await vesting.addUser(user1.address, vestedAmount)
    await increaseTime(cliffTimeAddition6 + OFFSET)
    const part = BigInt(vestedAmount) / BigInt(2)
    await vesting.connect(user1).claimTokens(user1.address, part)
    await vesting.connect(user1).claimTokens(user1.address, part)
    expect(await elysiumToken.balanceOf(user1.address)).equals(vestedAmount)
  });

  it("Claim before time (revert)", async function () {
    await expect(vesting.connect(user1).claimTokens(user1.address, totalVestedAmount)).to.be.reverted;
    expect(await elysiumToken.balanceOf(user1.address)).not.equal(totalVestedAmount)
  });
});
