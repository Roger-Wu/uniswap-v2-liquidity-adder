//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
// To avoid SafeMath being imported twice, we modified UniswapV2Library.sol.
import "./libraries2/UniswapV2Library.sol";
// We modified the pragma.
import "./libraries2/Math.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IWETH.sol";

/// @author Roger Wu (Twitter: @rogerwutw, GitHub: Roger-Wu)
contract UniswapV2AddLiquidityHelperV1 is Ownable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    address public immutable _uniswapV2FactoryAddress; // 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
    address public immutable _uniswapV2Router02Address; // 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    address public immutable _wethAddress; // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

    constructor(
        address uniswapV2FactoryAddress,
        address uniswapV2Router02Address,
        address wethAddress
    ) public {
        _uniswapV2FactoryAddress = uniswapV2FactoryAddress;
        _uniswapV2Router02Address = uniswapV2Router02Address;
        _wethAddress = wethAddress;
    }

    // fallback() external payable {}
    receive() external payable {}

    // Add as more tokenA and tokenB as possible to a Uniswap pair.
    // The ratio between tokenA and tokenB can be any.
    // Approve enough amount of tokenA and tokenB to this contract before calling this function.
    // Uniswap pair tokenA-tokenB must exist.
    // gas cost: ~320000
    function swapAndAddLiquidityTokenAndToken(
        address tokenAddressA,
        address tokenAddressB,
        uint112 amountA,
        uint112 amountB,
        uint112 minLiquidityOut,
        address to,
        uint64 deadline
    ) public returns(uint liquidity) {
        require(deadline >= block.timestamp, 'EXPIRED');
        require(amountA > 0 || amountB > 0, "amounts can not be both 0");
        // limited by Uniswap V2

        // transfer user's tokens to this contract
        if (amountA > 0) {
            _receiveToken(tokenAddressA, amountA);
        }
        if (amountB > 0) {
            _receiveToken(tokenAddressB, amountB);
        }

        return _swapAndAddLiquidity(
            tokenAddressA,
            tokenAddressB,
            uint(amountA),
            uint(amountB),
            uint(minLiquidityOut),
            to
        );
    }

    // Add as more ether and tokenB as possible to a Uniswap pair.
    // The ratio between ether and tokenB can be any.
    // Approve enough amount of tokenB to this contract before calling this function.
    // Uniswap pair WETH-tokenB must exist.
    // gas cost: ~320000
    function swapAndAddLiquidityEthAndToken(
        address tokenAddressB,
        uint112 amountB,
        uint112 minLiquidityOut,
        address to,
        uint64 deadline
    ) public payable returns(uint liquidity) {
        require(deadline >= block.timestamp, 'EXPIRED');

        uint amountA = msg.value;
        address tokenAddressA = _wethAddress;

        require(amountA > 0 || amountB > 0, "amounts can not be both 0");
        // require(amountA < 2**112, "amount of ETH must be < 2**112");

        // convert ETH to WETH
        IWETH(_wethAddress).deposit{value: amountA}();
        // transfer user's tokenB to this contract
        if (amountB > 0) {
            _receiveToken(tokenAddressB, amountB);
        }

        return _swapAndAddLiquidity(
            tokenAddressA,
            tokenAddressB,
            amountA,
            uint(amountB),
            uint(minLiquidityOut),
            to
        );
    }

    // add as more tokens as possible to a Uniswap pair
    function _swapAndAddLiquidity(
        address tokenAddressA,
        address tokenAddressB,
        uint amountA,
        uint amountB,
        uint minLiquidityOut,
        address to
    ) internal returns(uint liquidity) {
        (uint amountAToAdd, uint amountBToAdd) = _swapToSyncRatio(
            tokenAddressA,
            tokenAddressB,
            amountA,
            amountB
        );

        _approveTokenToRouterIfNecessary(tokenAddressA, amountAToAdd);
        _approveTokenToRouterIfNecessary(tokenAddressB, amountBToAdd);
        (, , liquidity) = IUniswapV2Router02(_uniswapV2Router02Address).addLiquidity(
            tokenAddressA, // address tokenA,
            tokenAddressB, // address tokenB,
            amountAToAdd, // uint amountADesired,
            amountBToAdd, // uint amountBDesired,
            1, // uint amountAMin,
            1, // uint amountBMin,
            to, // address to,
            2**256-1 // uint deadline
        );

        require(liquidity >= minLiquidityOut, "minted liquidity not enough");

        // There may be a small amount of tokens left in this contract.
        // Usually it doesn't worth it to spend more gas to transfer them out.
        // These tokens will be considered as a donation to the owner.
        // All ether and tokens directly sent to this contract will be considered as a donation to the contract owner.
    }

    // swap tokens to make newAmountA / newAmountB ~= newReserveA / newReserveB
    function _swapToSyncRatio(
        address tokenAddressA,
        address tokenAddressB,
        uint amountA,
        uint amountB
    ) internal returns(
        uint newAmountA,
        uint newAmountB
    ) {
        (uint reserveA, uint reserveB) = UniswapV2Library.getReserves(_uniswapV2FactoryAddress, tokenAddressA, tokenAddressB);

        bool isSwitched = false;
        // swap A and B s.t. amountA * reserveB >= reserveA * amountB
        if (amountA * reserveB < reserveA * amountB) {
            (tokenAddressA, tokenAddressB) = (tokenAddressB, tokenAddressA);
            (reserveA, reserveB) = (reserveB, reserveA);
            (amountA, amountB) = (amountB, amountA);
            isSwitched = true;
        }

        uint amountAToSwap = calcAmountAToSwap(reserveA, reserveB, amountA, amountB);
        require(amountAToSwap <= amountA, "bugs in calcAmountAToSwap cause amountAToSwap > amountA");
        if (amountAToSwap > 0) {
            address[] memory path = new address[](2);
            path[0] = tokenAddressA;
            path[1] = tokenAddressB;

            _approveTokenToRouterIfNecessary(tokenAddressA, amountAToSwap);
            uint[] memory swapOutAmounts = IUniswapV2Router02(_uniswapV2Router02Address).swapExactTokensForTokens(
                amountAToSwap, // uint amountIn,
                1, // uint amountOutMin,
                path, // address[] calldata path,
                address(this), // address to,
                2**256-1 // uint deadline
            );

            amountA -= amountAToSwap;
            amountB += swapOutAmounts[swapOutAmounts.length - 1];
        }

        return isSwitched ? (amountB, amountA) : (amountA, amountB);
    }

    function calcAmountAToSwap(
        uint reserveA,
        uint reserveB,
        uint amountA,
        uint amountB
    ) public pure returns(
        uint amountAToSwap
    ) {
        require(reserveA > 0 && reserveB > 0, "reserves can't be empty");
        require(reserveA < 2**112 && reserveB < 2**112, "reserves must be < 2**112");
        require(amountA < 2**112 && amountB < 2**112, "amounts must be < 2**112");
        require(amountA * reserveB >= reserveA * amountB, "require amountA / amountB >= reserveA / reserveB");

        // Let A = reserveA, B = reserveB, C = amountA, D = amountB
        // Let x = amountAToSwap, y = amountBSwapOut
        // We are solving:
        //   (C - x) / (D + y) = (A + C) / (B + D)
        //   (A + 0.997 * x) * (B - y) = A * B
        // Use WolframAlpha to solve:
        //    solve (C - x) * (B + D) = (A + C) * (D + y), (1000 * A + 997 * x) * (B - y) = 1000 * A * B
        // we will get
        //    x = (sqrt(A) sqrt(3988009 A B + 9 A D + 3988000 B C)) / (1994 sqrt(B + D)) - (1997 A) / 1994
        // which is also
        //    x = ((sqrt(A) sqrt(3988009 A B + 9 A D + 3988000 B C)) / sqrt(B + D) - (1997 A)) / 1994

        // A (3988009 B + 9 D) + 3988000 B C
        // = reserveA * (3988009 * reserveB + 9 * amountB) + 3988000 * reserveB * amountA
        // < 2^112 * (2^22 * 2^112 + 2^4 * 2^112) + 2^22 * 2^112 * 2^112
        // < 2^247 + 2^246
        // < 2^248
        // so we don't need SafeMath
        return ((
            Math.sqrt(reserveA)
            * Math.sqrt(reserveA * (3988009 * reserveB + 9 * amountB) + 3988000 * reserveB * amountA)
            / Math.sqrt(reserveB + amountB)
        ).sub(1997 * reserveA)) / 1994;
    }

    function _receiveToken(address tokenAddress, uint amount) internal {
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
    }

    function _approveTokenToRouterIfNecessary(address tokenAddress, uint amount) internal {
        uint currentAllowance = IERC20(tokenAddress).allowance(address(this), _uniswapV2Router02Address);
        if (currentAllowance < amount) {
            IERC20(tokenAddress).safeIncreaseAllowance(_uniswapV2Router02Address, 2**256 - 1 - currentAllowance);
        }
    }

    function emergencyWithdrawEther() public onlyOwner {
        (msg.sender).transfer(address(this).balance);
    }

    function emergencyWithdrawErc20(address tokenAddress) public onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        token.safeTransfer(msg.sender, token.balanceOf(address(this)));
    }
}
