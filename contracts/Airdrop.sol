// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./contracts/access/Ownable.sol";
import "./contracts/utils/cryptography/MerkleProof.sol";
import "./contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./contracts/token/ERC20/utils/SafeERC20.sol";
import "./PBRP.sol";

import "hardhat/console.sol";

contract Airdrop is Ownable {
    using SafeERC20 for IERC20Metadata;

    bytes32 public merkleRoot;
    address public token;
    PBRP public pBRP;

    mapping(bytes32 => uint) public claimed;

    uint public epoch;

    event Claimed(
        address indexed account,
        uint256 indexed amount,
        address token
    );

    event RewardTokenChanged(
        address indexed owner,
        address oldToken,
        address newToken
    );

    constructor(address _token) {
        token = _token;
        pBRP = new PBRP();
        require(IERC20Metadata(token).decimals() <= 18, "error decimals");
    }

    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        require(_merkleRoot != merkleRoot, "the same root node");
        epoch++;
        merkleRoot = _merkleRoot;
    }

    function reclaim() public onlyOwner {
        uint256 balance = IERC20Metadata(token).balanceOf(address(this));
        IERC20Metadata(token).safeTransfer(msg.sender, balance);
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
        bytes32[] memory proof,
        uint ratio
    ) public {
        bytes32 node = keccak256(abi.encodePacked(account, amount));
        require(claimed[node] != epoch, "Airdrop: Already claimed.");
        require(
            MerkleProof.verify(proof, merkleRoot, node),
            "Airdrop: Invalid proof."
        );

        claimed[node] = epoch;

        // USDT
        uint tokenAmount = (amount * ratio) / 100;
        IERC20Metadata(token).safeTransfer(account, tokenAmount);

        // bBRP
        uint bBRPAmount = (amount *
            (100 - ratio) *
            10 ** (18 - IERC20Metadata(token).decimals())) / 100;
        pBRP.mint(account, bBRPAmount);

        emit Claimed(account, tokenAmount, token);
        emit Claimed(account, bBRPAmount, address(pBRP));
    }

    function updateToken(address token_) external onlyOwner {
        reclaim();
        emit RewardTokenChanged(msg.sender, token, token_);
        token = token_;
    }
}
