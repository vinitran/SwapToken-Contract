// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract Token is Initializable, ERC20Upgradeable {

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _supply
    ) public initializer {
        __ERC20_init(_name, _symbol);
        _mint(msg.sender, _supply);
    }
}