// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./contracts/token/ERC20/ERC20.sol";
import "./contracts/access/Ownable.sol";

contract PBRP is ERC20, Ownable {
    constructor() ERC20("pBRP", "pBRP") {}

    function mint(address user, uint amount) external onlyOwner {
        _mint(user, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(false, "cant transfer");
    }
}
