const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

describe("Reward", function () {
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

    const USDT = await ethers.getContractFactory("USDT");
    const usdt = await USDT.deploy();

    const AIRDROP = await ethers.getContractFactory("Reward");
    const airdrop = await AIRDROP.deploy(usdt.address);

    await usdt.approve(airdrop.address, ethers.utils.parseEther("2100"));
    await airdrop.setMerkleRoot(tree.getHexRoot());
    await usdt.transfer(airdrop.address, ethers.utils.parseEther("2100"));

    const pBRPAddr = await airdrop.pBRP();
    const pBRP = await ethers.getContractAt("PBRP", pBRPAddr);

    return { usdt, airdrop, owner, otherAccount, tree, pBRP };
  }

  describe("Deployment", function () {
    it("check the config and balance of airdrop and usdt", async function () {
      const { usdt, airdrop, tree, owner } = await loadFixture(deployer);

      const airdropBal = await usdt.balanceOf(airdrop.address);
      const epoch = await airdrop.epoch();

      expect(epoch).equal(1);
      expect(airdropBal.toString()).equal(ethers.utils.parseEther("2100"));
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

    it("claim reward 100% USDT", async function () {
      const { airdrop, tree, usdt } = await loadFixture(deployer);
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

      await airdrop.claim(addr1, ethers.utils.parseEther("1"), proof, 100);
      const balUser1 = await usdt.balanceOf(addr1);

      await expect(airdrop.setMerkleRoot(tree.getHexRoot())).to.be.reverted;
      await expect(airdrop.connect(addrs[1]).setMerkleRoot(tree.getHexRoot()))
        .to.be.reverted;
      expect(balUser1.toString()).equal(ethers.utils.parseEther("1"));
    });

    it("claim reward 80% USDT, 20% pBRP", async function () {
      const { airdrop, tree, usdt, owner, pBRP } = await loadFixture(deployer);
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

      await airdrop.claim(addr1, ethers.utils.parseEther("1"), proof, 80);
      const balUser1 = await usdt.balanceOf(addr1);

      const balBBRPUser1 = await pBRP.balanceOf(addr1);

      expect(balUser1.toString()).equal(ethers.utils.parseEther("0.8"));
      expect(balBBRPUser1.toString()).equal(ethers.utils.parseEther("0.2"));
      await expect(
        airdrop.claim(addr1, ethers.utils.parseEther("1"), proof, 100)
      ).to.be.reverted;
      await expect(
        airdrop.claim(
          addrs[2].address,
          ethers.utils.parseEther("1"),
          proof2,
          100
        )
      ).to.be.reverted;

      await airdrop.reclaim();

      await expect(airdrop.connect(addrs[1]).reclaim()).to.be.reverted;

      const balOwnerAfter = await usdt.balanceOf(owner.address);

      expect(balOwnerAfter).equal(ethers.utils.parseEther("2099.2"));
    });

    it("claim reward 50% USDT, 50% pBRP", async function () {
      const { airdrop, tree, usdt, owner, pBRP } = await loadFixture(deployer);
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

      await airdrop.claim(addr1, ethers.utils.parseEther("1"), proof, 50);
      const balUser1 = await usdt.balanceOf(addr1);

      const balBBRPUser1 = await pBRP.balanceOf(addr1);

      expect(balUser1.toString()).equal(ethers.utils.parseEther("0.5"));
      expect(balBBRPUser1.toString()).equal(ethers.utils.parseEther("0.5"));
    });
    it("claim reward 0% USDT, 100% pBRP", async function () {
      const { airdrop, tree, usdt, owner, pBRP } = await loadFixture(deployer);
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

      await airdrop.claim(addr1, ethers.utils.parseEther("1"), proof, 0);
      const balUser1 = await usdt.balanceOf(addr1);

      const balBBRPUser1 = await pBRP.balanceOf(addr1);

      expect(balUser1.toString()).equal(ethers.utils.parseEther("0"));
      expect(balBBRPUser1.toString()).equal(ethers.utils.parseEther("1"));
    });

    it("claim reward 100% pBRP then transfer", async function () {
      const { airdrop, tree, usdt, owner, pBRP } = await loadFixture(deployer);
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

      await airdrop.claim(addr1, ethers.utils.parseEther("1"), proof, 0);
      const balUser1 = await usdt.balanceOf(addr1);

      const balBBRPUser1 = await pBRP.balanceOf(addr1);

      expect(balUser1.toString()).equal(ethers.utils.parseEther("0"));
      expect(balBBRPUser1.toString()).equal(ethers.utils.parseEther("1"));

      await expect(
        pBRP
          .connect(addrs[1])
          .transfer(airdrop.address, ethers.utils.parseEther("0.1"))
      ).to.be.reverted;
    });
    it("claim reward 100% pBRP then mint", async function () {
      const { airdrop, tree, usdt, owner, pBRP } = await loadFixture(deployer);
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

      await airdrop.claim(addr1, ethers.utils.parseEther("1"), proof, 0);
      const balUser1 = await usdt.balanceOf(addr1);

      const balBBRPUser1 = await pBRP.balanceOf(addr1);

      expect(balUser1.toString()).equal(ethers.utils.parseEther("0"));
      expect(balBBRPUser1.toString()).equal(ethers.utils.parseEther("1"));

      await expect(
        pBRP
          .connect(addrs[1])
          .mint(airdrop.address, ethers.utils.parseEther("1"))
      ).to.be.reverted;
    });
  });
});
