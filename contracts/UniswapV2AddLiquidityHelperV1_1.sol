//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./libraries2/UniswapV2Library.sol";
import "./libraries2/TransferHelper.sol";
// import "./libraries2/Math.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IWETH.sol";

/// @author Roger Wu (Twitter: @rogerwutw, GitHub: Roger-Wu)
// updates from V1:
// * use binary search to find amountAToSwap, which fix ETH-USDT and ETH-USDC tx failure problem and saves gas
// * remove deadline to save gas
// * make _receiveToken inline to save gas
// * make _swapToSyncRatio inline to save gas
// * remove 1 _approveTokenToRouterIfNecessary call to save gas.
// * replace SafeERC20 with TransferHelper to save gas.
// * remove _approveTokenToRouterIfNecessary to save gas.
// * replace some public with external
// total gas saving: ~28852
contract UniswapV2AddLiquidityHelperV1_1 is Ownable {
    // using SafeMath for uint;
    // using SafeERC20 for IERC20;

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
    function swapAndAddLiquidityTokenAndToken(
        address tokenAddressA,
        address tokenAddressB,
        uint112 amountA,
        uint112 amountB,
        uint112 minLiquidityOut,
        address to
    ) external returns(uint liquidity) {
        require(amountA > 0 || amountB > 0, "amounts can not be both 0");

        // transfer user's tokens to this contract
        if (amountA > 0) {
            // _receiveToken(tokenAddressA, amountA);
            TransferHelper.safeTransferFrom(tokenAddressA, msg.sender, address(this), uint(amountA));
        }
        if (amountB > 0) {
            // _receiveToken(tokenAddressB, amountB);
            TransferHelper.safeTransferFrom(tokenAddressB, msg.sender, address(this), uint(amountB));
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
    function swapAndAddLiquidityEthAndToken(
        address tokenAddressB,
        uint112 amountB,
        uint112 minLiquidityOut,
        address to
    ) external payable returns(uint liquidity) {
        uint amountA = msg.value;
        address tokenAddressA = _wethAddress;

        require(amountA > 0 || amountB > 0, "amounts can not be both 0");

        // convert ETH to WETH
        IWETH(_wethAddress).deposit{value: amountA}();
        // transfer user's tokenB to this contract
        if (amountB > 0) {
            // _receiveToken(tokenAddressB, amountB);
            TransferHelper.safeTransferFrom(tokenAddressB, msg.sender, address(this), uint(amountB));
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
        (uint reserveA, uint reserveB) = UniswapV2Library.getReserves(_uniswapV2FactoryAddress, tokenAddressA, tokenAddressB);

        // Swap tokenA and tokenB s.t. amountA / reserveA >= amountB / reserveB
        // (or amountA * reserveB >= reserveA * amountB)
        // which means we will swap part of tokenA to tokenB before adding liquidity.
        if (amountA * reserveB < reserveA * amountB) {
            (tokenAddressA, tokenAddressB) = (tokenAddressB, tokenAddressA);
            (reserveA, reserveB) = (reserveB, reserveA);
            (amountA, amountB) = (amountB, amountA);
        }
        uint amountAToAdd = amountA;
        uint amountBToAdd = amountB;
        // _approveTokenToRouterIfNecessary(tokenAddressA, amountA);
        if (IERC20(tokenAddressA).allowance(address(this), _uniswapV2Router02Address) < amountA) {
            TransferHelper.safeApprove(tokenAddressA, _uniswapV2Router02Address, 2**256 - 1);
        }

        uint amountAToSwap = calcAmountAToSwap(reserveA, reserveB, amountA, amountB);
        require(amountAToSwap <= amountA, "bugs in calcAmountAToSwap cause amountAToSwap > amountA");
        if (amountAToSwap > 0) {
            address[] memory path = new address[](2);
            path[0] = tokenAddressA;
            path[1] = tokenAddressB;

            uint[] memory swapOutAmounts = IUniswapV2Router02(_uniswapV2Router02Address).swapExactTokensForTokens(
                amountAToSwap, // uint amountIn,
                1, // uint amountOutMin,
                path, // address[] calldata path,
                address(this), // address to,
                2**256-1 // uint deadline
            );

            amountAToAdd -= amountAToSwap;
            amountBToAdd += swapOutAmounts[swapOutAmounts.length - 1];
        }

        // _approveTokenToRouterIfNecessary(tokenAddressB, amountBToAdd);
        if (IERC20(tokenAddressB).allowance(address(this), _uniswapV2Router02Address) < amountBToAdd) {
            TransferHelper.safeApprove(tokenAddressB, _uniswapV2Router02Address, 2**256 - 1);
        }
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

        // Due to the inaccuracy of integer division,
        // there may be a small amount of tokens left in this contract.
        // Usually it doesn't worth it to spend more gas to transfer them out.
        // These tokens will be considered as a donation to the owner.
        // All ether and tokens directly sent to this contract will be considered as a donation to the contract owner.
    }

    function calcAmountAToSwap(
        uint reserveA,
        uint reserveB,
        uint amountA,
        uint amountB
    ) public pure returns(
        uint amountAToSwap
    ) {
        // require(reserveA > 0 && reserveB > 0, "reserves can't be empty");
        // require(reserveA < 2**112 && reserveB < 2**112, "reserves must be < 2**112");
        // require(amountA < 2**112 && amountB < 2**112, "amounts must be < 2**112");
        // require(amountA * reserveB >= reserveA * amountB, "require amountA / amountB >= reserveA / reserveB");

        // separating requirements somehow saves gas.
        require(reserveA > 0, "reserveA can't be empty");
        require(reserveB > 0, "reserveB can't be empty");
        require(reserveA < 2**112, "reserveA must be < 2**112");
        require(reserveB < 2**112, "reserveB must be < 2**112");
        require(amountA < 2**112, "amountA must be < 2**112");
        require(amountB < 2**112, "amountB must be < 2**112");
        require(amountA * reserveB >= reserveA * amountB, "require amountA / amountB >= reserveA / reserveB");

        uint l = 0; // minAmountAToSwap
        uint r = amountA; // maxAmountAToSwap
        // avoid binary search going too deep. saving gas
        uint tolerance = amountA / 10000;
        if (tolerance == 0) { tolerance = 1; }
        uint newReserveA;
        uint newReserveB;
        uint newAmountA;
        uint newAmountB;

        // cache rA_times_1000 and rA_times_rB_times_1000 to save gas
        // Since reserveA, reserveB are both < 2**112,
        // rA_times_rB_times_1000 won't overflow.
        uint rA_times_1000 = reserveA * 1000;
        uint rA_times_rB_times_1000 = rA_times_1000 * reserveB;

        // goal:
        //   after swap l tokenA,
        //     newAmountA / newAmountB >= newReserveA / newReserveB
        //   after swap r tokenA,
        //     newAmountA / newAmountB < newReserveA / newReserveB
        //   r <= l + tolerance
        while (l + tolerance < r) {
            amountAToSwap = (l + r) / 2;

            newReserveA = reserveA + amountAToSwap;
            // (1000 * reserveA + 997 * amountAToSwap) * newReserveB = 1000 * reserveA * reserveB
            newReserveB = rA_times_rB_times_1000 / (rA_times_1000 + 997 * amountAToSwap);
            newAmountA = amountA - amountAToSwap; // amountAToSwap <= amountA
            newAmountB = amountB + (reserveB - newReserveB); // newReserveB <= reserveB
            if (newAmountA * newReserveB >= newReserveA * newAmountB) {
                l = amountAToSwap;
            } else {
                r = amountAToSwap;
            }
        }
        return l;
    }

    // function _receiveToken(address tokenAddress, uint amount) internal {
    //     TransferHelper.safeTransferFrom(tokenAddress, msg.sender, address(this), amount);
    // }

    // function _approveTokenToRouterIfNecessary(address tokenAddress, uint amount) internal {
    //     if (IERC20(tokenAddress).allowance(address(this), _uniswapV2Router02Address) < amount) {
    //         TransferHelper.safeApprove(tokenAddress, _uniswapV2Router02Address, 2**256 - 1);
    //     }
    // }

    function emergencyWithdrawEther() external onlyOwner {
        (msg.sender).transfer(address(this).balance);
    }

    function emergencyWithdrawErc20(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        TransferHelper.safeTransfer(tokenAddress, msg.sender, token.balanceOf(address(this)));
    }
}
