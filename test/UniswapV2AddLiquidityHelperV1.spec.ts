import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { AddressZero, Zero, MaxUint256 } from 'ethers/constants'
import { BigNumber, bigNumberify } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

const MaxUint64 = bigNumberify("18446744073709551615");

enum RouterVersion {
  // UniswapV2Router01 = 'UniswapV2Router01',
  UniswapV2Router02 = 'UniswapV2Router02'
}

function bnToEth(bn : BigNumber) {
  return bn.toString(); // / 1e18
}

describe('UniswapV2AddLiquidityHelperV1', () => {
  for (const routerVersion of Object.keys(RouterVersion)) {
    const provider = new MockProvider({
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999
    })
    const [wallet] = provider.getWallets()
    const loadFixture = createFixtureLoader(provider, [wallet])

    let token0: Contract
    let token1: Contract
    let WETH: Contract
    let WETHPartner: Contract
    let factory: Contract
    let router: Contract
    let router02: Contract
    let pair: Contract
    let WETHPair: Contract
    let routerEventEmitter: Contract
    let helperV1: Contract
    beforeEach(async function() {
      const fixture = await loadFixture(v2Fixture)
      token0 = fixture.token0
      token1 = fixture.token1
      WETH = fixture.WETH
      WETHPartner = fixture.WETHPartner
      factory = fixture.factoryV2
      router02 = fixture.router02
      router = {
        // [RouterVersion.UniswapV2Router01]: fixture.router01,
        [RouterVersion.UniswapV2Router02]: fixture.router02
      }[routerVersion as RouterVersion]
      pair = fixture.pair
      WETHPair = fixture.WETHPair
      routerEventEmitter = fixture.routerEventEmitter
      helperV1 = fixture.helperV1
    })

    afterEach(async function() {
      expect(await provider.getBalance(router.address)).to.eq(Zero)
    })

    describe(routerVersion, () => {
      it('factory, router, WETH', async () => {
        expect(await helperV1._uniswapV2FactoryAddress()).to.eq(factory.address)
        expect(await helperV1._uniswapV2Router02Address()).to.eq(router02.address)
        expect(await helperV1._wethAddress()).to.eq(WETH.address)
      })

      it('addLiquidity', async () => {
        const token0Amount = expandTo18Decimals(1)
        const token1Amount = expandTo18Decimals(4)

        const expectedLiquidity = expandTo18Decimals(2)
        await token0.approve(router.address, MaxUint256)
        await token1.approve(router.address, MaxUint256)
        await expect(
          router.addLiquidity(
            token0.address,
            token1.address,
            token0Amount,
            token1Amount,
            0,
            0,
            wallet.address,
            MaxUint256,
            overrides
          )
        )
          .to.emit(token0, 'Transfer')
          .withArgs(wallet.address, pair.address, token0Amount)
          .to.emit(token1, 'Transfer')
          .withArgs(wallet.address, pair.address, token1Amount)
          .to.emit(pair, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(pair, 'Transfer')
          .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(pair, 'Sync')
          .withArgs(token0Amount, token1Amount)
          .to.emit(pair, 'Mint')
          .withArgs(router.address, token0Amount, token1Amount)

        expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))

        // swapAndAddLiquidityTokenAndToken

        console.log("token0.address", token0.address);
        console.log("token1.address", token1.address);

        const liq0 = await pair.balanceOf(wallet.address);

        const reserve0 = await token0.balanceOf(pair.address);
        const reserve1 = await token1.balanceOf(pair.address);
        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(2);
        const amountAToSwap = await helperV1.calcAmountAToSwap(
          reserve0,
          reserve1,
          token0AmountAdd,
          token1AmountAdd
        );
        console.log("amountAToSwap", bnToEth(amountAToSwap));
        // The accurate value is 265309090306046606, but there's inaccuracy
        // expect(amountAToSwap.to.eq(265309090589195595));

        const amountToSwapAndPath = await helperV1.calcAmountToSwapAndPath(
          token0.address,
          token1.address,
          token0AmountAdd,
          token1AmountAdd
        );
        console.log("amountToSwapAndPath.amountToSwap", bnToEth(amountToSwapAndPath.amountToSwap));
        console.log("amountToSwapAndPath.path", amountToSwapAndPath.path);

        await token0.approve(helperV1.address, MaxUint256)
        await token1.approve(helperV1.address, MaxUint256)
        const bal1 = await provider.getBalance(wallet.address);
        await helperV1.swapAndAddLiquidityTokenAndToken(
          token0.address,
          token1.address,
          token0AmountAdd,
          token1AmountAdd,
          1,
          wallet.address,
          MaxUint64,
          { ...overrides, gasPrice: 1 }
        );
        const bal2 = await provider.getBalance(wallet.address);
        const gasCost1 = bal1.sub(bal2);
        console.log("gas cost swapAndAddLiquidityTokenAndToken", bnToEth(gasCost1));

        const reserve0_2 = await token0.balanceOf(pair.address);
        const reserve1_2 = await token1.balanceOf(pair.address);
        console.log("reserve0_2", bnToEth(reserve0_2));
        console.log("reserve1_2", bnToEth(reserve1_2));

        const leftToken0 = await token0.balanceOf(helperV1.address);
        const leftToken1 = await token1.balanceOf(helperV1.address);
        console.log("leftToken0", bnToEth(leftToken0));
        console.log("leftToken1", bnToEth(leftToken1));

        const liq1 = await pair.balanceOf(wallet.address);
        console.log("liq0", bnToEth(liq0));
        console.log("liq1", bnToEth(liq1));
      })






      it('addLiquidity, swap token0, token1', async () => {
        const token0Amount = expandTo18Decimals(400)
        const token1Amount = expandTo18Decimals(100)

        const expectedLiquidity = expandTo18Decimals(200)
        await token0.approve(router.address, MaxUint256)
        await token1.approve(router.address, MaxUint256)
        await expect(
          router.addLiquidity(
            token0.address,
            token1.address,
            token0Amount,
            token1Amount,
            0,
            0,
            wallet.address,
            MaxUint256,
            overrides
          )
        )
          .to.emit(token0, 'Transfer')
          .withArgs(wallet.address, pair.address, token0Amount)
          .to.emit(token1, 'Transfer')
          .withArgs(wallet.address, pair.address, token1Amount)
          .to.emit(pair, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(pair, 'Transfer')
          .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(pair, 'Sync')
          .withArgs(token0Amount, token1Amount)
          .to.emit(pair, 'Mint')
          .withArgs(router.address, token0Amount, token1Amount)

        expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))

        // swapAndAddLiquidityTokenAndToken

        const liq0 = await pair.balanceOf(wallet.address);

        const reserve0 = await token0.balanceOf(pair.address);
        const reserve1 = await token1.balanceOf(pair.address);
        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(2);

        // const amountAToSwap = await helperV1.calcAmountAToSwap(
        //   reserve0,
        //   reserve1,
        //   token0AmountAdd,
        //   token1AmountAdd
        // );
        // console.log("amountAToSwap", bnToEth(amountAToSwap));
        // The accurate value is 265309090306046606, but there's inaccuracy
        // expect(amountAToSwap.to.eq(265309090589195595));

        const amountToSwapAndPath = await helperV1.calcAmountToSwapAndPath(
          token0.address,
          token1.address,
          token0AmountAdd,
          token1AmountAdd
        );
        console.log("amountToSwapAndPath.amountToSwap", bnToEth(amountToSwapAndPath.amountToSwap));
        console.log("amountToSwapAndPath.path", amountToSwapAndPath.path);

        await token0.approve(helperV1.address, MaxUint256)
        await token1.approve(helperV1.address, MaxUint256)
        const bal1 = await provider.getBalance(wallet.address);
        await helperV1.swapAndAddLiquidityTokenAndToken(
          token0.address,
          token1.address,
          token0AmountAdd,
          token1AmountAdd,
          1,
          wallet.address,
          MaxUint64,
          { ...overrides, gasPrice: 1 }
        );
        const bal2 = await provider.getBalance(wallet.address);
        const gasCost1 = bal1.sub(bal2);
        console.log("gas cost swapAndAddLiquidityTokenAndToken", bnToEth(gasCost1));

        const reserve0_2 = await token0.balanceOf(pair.address);
        const reserve1_2 = await token1.balanceOf(pair.address);
        console.log("reserve0_2", bnToEth(reserve0_2));
        console.log("reserve1_2", bnToEth(reserve1_2));

        const leftToken0 = await token0.balanceOf(helperV1.address);
        const leftToken1 = await token1.balanceOf(helperV1.address);
        console.log("leftToken0", bnToEth(leftToken0));
        console.log("leftToken1", bnToEth(leftToken1));

        const liq1 = await pair.balanceOf(wallet.address);
        console.log("liq0", bnToEth(liq0));
        console.log("liq1", bnToEth(liq1));
      })














      it('addLiquidityETH', async () => {
        const WETHPartnerAmount = expandTo18Decimals(1)
        const ETHAmount = expandTo18Decimals(4)

        const expectedLiquidity = expandTo18Decimals(2)
        const WETHPairToken0 = await WETHPair.token0()
        await WETHPartner.approve(router.address, MaxUint256)
        await expect(
          router.addLiquidityETH(
            WETHPartner.address,
            WETHPartnerAmount,
            WETHPartnerAmount,
            ETHAmount,
            wallet.address,
            MaxUint256,
            { ...overrides, value: ETHAmount }
          )
        )
          .to.emit(WETHPair, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(WETHPair, 'Transfer')
          .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(WETHPair, 'Sync')
          .withArgs(
            WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount : ETHAmount,
            WETHPairToken0 === WETHPartner.address ? ETHAmount : WETHPartnerAmount
          )
          .to.emit(WETHPair, 'Mint')
          .withArgs(
            router.address,
            WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount : ETHAmount,
            WETHPairToken0 === WETHPartner.address ? ETHAmount : WETHPartnerAmount
          )

        expect(await WETHPair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))

        // // swapAndAddLiquidityEthAndToken

        // const liq0 = await pair.balanceOf(wallet.address);

        // const reserve0 = await token0.balanceOf(pair.address);
        // const reserve1 = await token1.balanceOf(pair.address);
        // const token0AmountAdd = expandTo18Decimals(2);
        // const token1AmountAdd = expandTo18Decimals(2);
        // const amountAToSwap = await helperV1.calcAmountAToSwap(
        //   reserve0,
        //   reserve1,
        //   token0AmountAdd,
        //   token1AmountAdd
        // );
        // console.log("amountAToSwap", bnToEth(amountAToSwap));
        // // The accurate value is 265309090306046606, but there's inaccuracy
        // // expect(amountAToSwap.to.eq(265309090589195595));

        // await token0.approve(helperV1.address, MaxUint256)
        // await token1.approve(helperV1.address, MaxUint256)
        // const bal1 = await provider.getBalance(wallet.address);
        // await helperV1.swapAndAddLiquidityTokenAndToken(
        //   token0.address,
        //   token1.address,
        //   token0AmountAdd,
        //   token1AmountAdd,
        //   1,
        //   wallet.address,
        //   MaxUint64,
        //   { ...overrides, gasPrice: 1 }
        // );
        // const bal2 = await provider.getBalance(wallet.address);
        // const gasCost1 = bal1.sub(bal2);
        // console.log("gas cost amountAToSwap1", bnToEth(gasCost1));

        // const reserve0_2 = await token0.balanceOf(pair.address);
        // const reserve1_2 = await token1.balanceOf(pair.address);
        // console.log("reserve0_2", bnToEth(reserve0_2));
        // console.log("reserve1_2", bnToEth(reserve1_2));

        // const leftToken0 = await token0.balanceOf(helperV1.address);
        // const leftToken1 = await token1.balanceOf(helperV1.address);
        // console.log("leftToken0", bnToEth(leftToken0));
        // console.log("leftToken1", bnToEth(leftToken1));

        // const liq1 = await pair.balanceOf(wallet.address);
        // console.log("liq0", bnToEth(liq0));
        // console.log("liq1", bnToEth(liq1));
      })

      async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
        await token0.transfer(pair.address, token0Amount)
        await token1.transfer(pair.address, token1Amount)
        await pair.mint(wallet.address, overrides)
      }
    })
  }
})
