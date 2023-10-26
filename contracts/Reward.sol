// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./contracts/access/Ownable.sol";
import "./contracts/utils/cryptography/MerkleProof.sol";
import "./contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./contracts/token/ERC20/utils/SafeERC20.sol";
import "./PBRP.sol";

contract Reward is Ownable {
    using SafeERC20 for IERC20Metadata;

    bytes32 public merkleRoot;
    address public token;
    PBRP public pBRP;

    mapping(address => uint) public claimed;

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
        transferOwnership(0x34B4B2fCF8EbB1e4E346806F629C392EE333A833);
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
        bytes32 node = keccak256(abi.encodePacked(account, amount));
        if (claimed[account] == epoch) return false;
        return MerkleProof.verify(proof, merkleRoot, node);
    }

    function claim(
        address account,
        uint256 amount,
        bytes32[] memory proof,
        uint ratio
    ) public {
        bytes32 node = keccak256(abi.encodePacked(account, amount));
        require(claimed[account] != epoch, "Already claimed.");
        require(MerkleProof.verify(proof, merkleRoot, node), "Invalid proof.");

        claimed[account] = epoch;

        // USDT
        uint tokenAmount = (amount * ratio) / 10000;
        uint balThis = IERC20Metadata(token).balanceOf(address(this));
        require(balThis >= tokenAmount, "Not enough token");
        if (tokenAmount > 0)
            IERC20Metadata(token).safeTransfer(account, tokenAmount);

        // bBRP
        uint bBRPAmount = (amount *
            (10000 - ratio) *
            10 ** (18 - IERC20Metadata(token).decimals())) / 10000;
        if (bBRPAmount > 0) pBRP.mint(account, bBRPAmount / 2);

        emit Claimed(account, tokenAmount, token);
        emit Claimed(account, bBRPAmount / 2, address(pBRP));
    }

    function updateToken(address token_) external onlyOwner {
        require(IERC20Metadata(token).decimals() <= 18, "error decimals");
        reclaim();
        emit RewardTokenChanged(msg.sender, token, token_);
        token = token_;
    }

    function adminBatchMint(address[] memory accounts, uint256[] memory amounts) external onlyOwner {
        require(accounts.length == amounts.length, "length not match");
        for (uint i = 0; i < accounts.length; i++) {
            pBRP.mint(accounts[i], amounts[i]);
            emit Claimed(account, amounts[i], address(pBRP));
        }
    }
}
