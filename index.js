const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const ethers = require("ethers");

const data = [
  ["0x00b864dceb858f2fd1e24ff592c45400b6f4d007", 799],
  ["0x084d519d448763e46992596828b08034de32bac3", 799],
  ["0x0ce2d74a8f415c82395f21a01c931d4a900c8e9f", 799],
];

const leaves = data.map((item) =>
  keccak256(
    ethers.utils.solidityPack(["address", "uint256"], [item[0], item[1]])
  )
);

const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

const proof = tree.getProof(
  keccak256(
    ethers.utils.solidityPack(
      ["address", "uint256"],
      ["0x00b864dceb858f2fd1e24ff592c45400b6f4d007", "799"]
    )
  )
);

const root = tree.getHexRoot();
console.log(root);
console.log(proof.toString("hex"));
