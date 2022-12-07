const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const fromWei = (value) => {
  return Number(ethers.utils.formatEther(value));
}

const toWei = (value) => {
  return ethers.utils.parseUnits(value.toString(), "ether");
}
describe("Token", async function () {
  let deployer, token
  const name = "token";
  const symbol = "TOKEN";
  const supply = 5* 10**9;
  beforeEach(async function () {
    const TOKEN = await ethers.getContractFactory("Token");
    [deployer, addr1, addr2] = await ethers.getSigners();
    token = await upgrades.deployProxy(TOKEN, [name, symbol, toWei(supply)], {
      initializer: "initialize",
    });
    await token.deployed();
  });

  describe("Deployment", function () {
    it("Track name and symbol of the token", async function () {
      expect(await token.name()).to.equal(name);
      expect(await token.symbol()).to.equal(symbol);
    });

    it("Mint and check the token", async function () {
      expect(fromWei( await token.totalSupply())).to.equal(supply)
      expect(fromWei( await token.balanceOf(deployer.address))).to.equal(supply)
    });
  })
})