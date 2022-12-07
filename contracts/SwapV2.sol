pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract SwapV2 is Initializable, ReentrancyGuardUpgradeable, OwnableUpgradeable  {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    mapping (address => mapping (address => decimal)) public rate;
    uint x;

    struct decimal {
        uint value;
        uint8 digits;
    }

    function initialize() public initializer {
         __Ownable_init();
         __ReentrancyGuard_init();
    }

    event SwapToken (
        address indexed _swaper, 
        address _token1, 
        address _token2, 
        uint _token1Amount, 
        uint _token2Amount
    );                                

    event SetRate(
        address _token1, 
        address _token2,
        uint _rate, 
        uint8 _digits
    );

    // function swap(address _token1, address _token2, uint _amountIn) public payable nonReentrant {
    //     require(_token1 !=  _token2, "Token1 must be different than token2");
    //     require(_amountIn > 0, "Amount must be greater than 0");
    //     uint _amountOut = _amountIn * rate[_token1][_token2].value / ( 10 ** rate[_token1][_token2].digits);
    //     _handlerInCome(_token1, _amountIn);
    //     _handlerOutCome(_token2, _amountOut);
    //     emit SwapToken(msg.sender, _token1, _token2, _amountIn, _amountOut);
    // }

    function setRate(address _token1, address _token2, uint _rate, uint8 _digits) public onlyOwner {
        require(_token1 !=  _token2, "Token1 must be different than token2");
        rate[_token1][_token2] = decimal(_rate, _digits);
        // realToken1ToToken2Rate = _rate / 10**_digits
        //  realToken2ToToken1Rate = 1 / realToken1ToToken2Rate = 10**_digits /_rate
        //  _token2ToToken1RateValue = realToken2ToToken1Rate * 10**_digits =  10**(2 * _digits) / _rate
        rate[_token2][_token1] = decimal(10**(2 * _digits) / _rate, _digits);
        emit SetRate(_token1, _token2, _rate, _digits);
        emit SetRate(_token2, _token1, 10**(2 * _digits) / _rate, _digits);
    }

    function depositToken(address _token, uint _amount) public payable onlyOwner {
        _handlerInCome(_token, _amount);
    }

    function withdraw(address _token, uint _amount) public payable onlyOwner {
        _handlerOutCome(_token, _amount);
    }

    function _handlerInCome(address _tokenIn, uint _amount) internal {
        if(_isNativeToken(_tokenIn)) {
            require(_amount == msg.value, "Amount must be equal to msg.value");        
            return;
        }
        IERC20Upgradeable(_tokenIn).transferFrom(msg.sender, address(this), _amount);
    }

    function _handlerOutCome(address _tokenOut, uint _amount) internal {
        if(_isNativeToken(_tokenOut)) {
            (bool sent,) = msg.sender.call{value: _amount}("");
            require(sent, "Failed to send Ether");  
            return;
        }
        IERC20Upgradeable(_tokenOut).safeTransfer(msg.sender, _amount);
    }

    function _isNativeToken(address _address) internal pure returns(bool) {
        return _address == address(0);
    }


}