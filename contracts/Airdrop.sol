// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

interface IJXT {
    function whiteList(address addr) external view returns(bool);
}

contract Airdrop is Ownable {
    bytes32 public merkleRoot;
    address public token;
    mapping(bytes32 => uint) public claimed;

    uint public epoch;

    event Claimed(address indexed account, uint256 indexed amount);

    constructor(address _token) {
        token = _token;
    }

    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        require(_merkleRoot != merkleRoot,"the same root node");
        epoch++;
        merkleRoot = _merkleRoot;
    }

    function reclaim() public onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(
            IERC20(token).transfer(msg.sender, balance),
            "Airdrop: Transfer failed."
        );
    }

    function verify(
        address account,
        uint256 amount,
        bytes32[] memory proof
    ) public view returns (bool) {
        return
            MerkleProof.verify(
                proof,
                merkleRoot,
                keccak256(abi.encodePacked(account, amount))
            );
    }

    function claim(
        address account,
        uint256 amount,
        bytes32[] memory proof
    ) public {
        bytes32 node = keccak256(abi.encodePacked(account, amount));
        require(IJXT(token).whiteList(account) == false, "white list can not claim");
        require(claimed[node] != epoch, "Airdrop: Already claimed.");
        require(
            MerkleProof.verify(proof, merkleRoot, node),
            "Airdrop: Invalid proof."
        );

        claimed[node] = epoch;
        require(
            IERC20(token).transfer(account, amount),
            "Airdrop: Transfer failed."
        );
        emit Claimed(account, amount);
    }
}
