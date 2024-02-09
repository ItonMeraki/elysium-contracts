const { expect } = require("chai");
const { ethers } = require("hardhat");

before(async () => {
  [owner, user1, user2, user3, dev, ...addrs] = await ethers.getSigners();

});

describe("ElysiumERC20", function () {
  it("Test", async function () {
    const ElysiumERC20 = await ethers.getContractFactory("ElysiumERC20");
    const elysiumToken = await ElysiumERC20.deploy();
    await elysiumToken.deployed();

    await elysiumToken.setDevAddress(dev.address)

    console.log(ethers.utils.formatEther(await elysiumToken.balanceOf(owner.address)))
    await elysiumToken.transfer(user1.address, ethers.utils.parseEther("100.0"))
    await elysiumToken.transfer(user3.address, ethers.utils.parseEther("100.0"))

    console.log("User1", ethers.utils.formatEther(await elysiumToken.balanceOf(user1.address)))
    await elysiumToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("100.0"))

    console.log("User1", ethers.utils.formatEther(await elysiumToken.balanceOf(user1.address)))
    console.log("User2", ethers.utils.formatEther(await elysiumToken.balanceOf(user2.address)))
    console.log("User3", ethers.utils.formatEther(await elysiumToken.balanceOf(user3.address)))
    console.log("Dev", ethers.utils.formatEther(await elysiumToken.balanceOf(dev.address)))

  });
});
