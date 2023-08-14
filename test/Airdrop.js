const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

describe("Lock", function () {
  async function mockData() {
    let accounts = await ethers.getSigners();

    accounts = accounts.map((addr, index) => [
      addr.address,
      ethers.utils.parseEther(index.toString()),
    ]);

    const leaves = accounts.map((item) =>
      keccak256(
        ethers.utils.solidityPack(["address", "uint256"], [item[0], item[1]])
      )
    );

    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    return { tree, accounts };
  }

  async function deployer() {
    const { tree } = await mockData();
    const [owner, otherAccount] = await ethers.getSigners();

    const MTK = await ethers.getContractFactory("MyToken");
    const mtk = await MTK.deploy();

    const AIRDROP = await ethers.getContractFactory("Airdrop");
    const airdrop = await AIRDROP.deploy(mtk.address);

    await mtk.approve(airdrop.address, ethers.utils.parseEther("2100"));
    await airdrop.setMerkleRoot(tree.getHexRoot());

    return { mtk, airdrop, owner, otherAccount, tree };
  }

  describe("Deployment", function () {
    it("check the config and balance of airdrop and mtk", async function () {
      const { mtk, airdrop, tree, owner } = await loadFixture(deployer);

      const ownerBal = await mtk.balanceOf(owner.address);
      const airdropBal = await mtk.balanceOf(airdrop.address);
      const epoch = await airdrop.epoch();

      await expect(airdrop.setMerkleRoot(tree.getHexRoot())).to.be.reverted;

      expect(epoch).equal(1);
      expect(ownerBal.toString()).equal(ethers.utils.parseEther("630"));
      expect(airdropBal.toString()).equal(ethers.utils.parseEther("1470"));
    });

    it("verify user airdrop reward", async function () {
      const { airdrop, tree } = await loadFixture(deployer);
      const addrs = await ethers.getSigners();
      const addr1 = addrs[1].address;

      const proof = tree.getHexProof(
        keccak256(
          ethers.utils.solidityPack(
            ["address", "uint256"],
            [addr1, ethers.utils.parseEther("1")]
          )
        )
      );

      const verifyResult = await airdrop.verify(
        addr1,
        ethers.utils.parseEther("1"),
        proof
      );
      expect(verifyResult).equal(true);

      const errorVeifyResult = await airdrop.verify(
        addrs[2].address,
        ethers.utils.parseEther("1"),
        proof
      );

      expect(errorVeifyResult).equal(false);
    });

    it("claim reward", async function () {
      const { airdrop, tree, mtk, owner } = await loadFixture(deployer);
      const addrs = await ethers.getSigners();
      const addr1 = addrs[1].address;

      const proof = tree.getHexProof(
        keccak256(
          ethers.utils.solidityPack(
            ["address", "uint256"],
            [addr1, ethers.utils.parseEther("1")]
          )
        )
      );

      const proof2 = tree.getHexProof(
        keccak256(
          ethers.utils.solidityPack(
            ["address", "uint256"],
            [addr1, ethers.utils.parseEther("2")]
          )
        )
      );

      await airdrop.claim(addr1, ethers.utils.parseEther("1"), proof);
      const balUser1 = await mtk.balanceOf(addr1);

      expect(balUser1.toString()).equal(ethers.utils.parseEther("1"));
      await expect(airdrop.claim(addr1, ethers.utils.parseEther("1"), proof)).to
        .be.reverted;
      await expect(
        airdrop.claim(addrs[2].address, ethers.utils.parseEther("1"), proof2)
      ).to.be.reverted;

      await airdrop.reclaim();

      const balOwnerAfter = await mtk.balanceOf(owner.address);

      expect(balOwnerAfter).equal(ethers.utils.parseEther("2099"));
    });
  });
});
