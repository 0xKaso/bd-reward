const MTree = require("./src/tools");

// 快照奖励列表
// 用户地址和奖励数量

const data = [
  ["0x00b864dceb858f2fd1e24ff592c45400b6f4d007", "79900000000000000000000"],
  ["0x084d519d448763e46992596828b08034de32bac3", "79900000000000000000000"],
  ["0x0ce2d74a8f415c82395f21a01c931d4a900c8e9f", "79900000000000000000000"],
];

// 根据奖励数据生成加密树
const mtree = new MTree(data);

// 后端
// 1.根据树拿到root节点
// 2.与合约交互将root节点传给合约进行存储
const root = mtree.getRoot();

// 前端
// 1.根据用户地址和奖励数量拿到验证树
// 2.与合约交互将验证树传给合约进行校验
// tips:此步骤可由后端计算，前端传地址给后端进行查询即可
const proof = mtree.getProof(
  "0x00b864dceb858f2fd1e24ff592c45400b6f4d007",
  "79900000000000000000000"
);

console.log(root, proof);
