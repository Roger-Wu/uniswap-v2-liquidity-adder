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

// const MaxUint64 = bigNumberify("18446744073709551615");

enum RouterVersion {
  // UniswapV2Router01 = 'UniswapV2Router01',
  UniswapV2Router02 = 'UniswapV2Router02'
}

function formatBN(bn : BigNumber) {
  return bn.toString(); // / 1e18
}

const gasCosts: string[] = [];

async function swapAndAddLiquidityTokenAndToken(
  token0: Contract,
  token1: Contract,
  pair: Contract,
  wallet: any,
  helperV1_1: Contract,
  provider: MockProvider,
  token0AmountAdd: BigNumber,
  token1AmountAdd: BigNumber
) {
  console.log("token0.address", token0.address);
  console.log("token1.address", token1.address);

  const liq0 = await pair.balanceOf(wallet.address);

  const reserve0 = await token0.balanceOf(pair.address);
  const reserve1 = await token1.balanceOf(pair.address);
  console.log("reserve0", formatBN(reserve0));
  console.log("reserve1", formatBN(reserve1));
  console.log("token0AmountAdd", formatBN(token0AmountAdd));
  console.log("token1AmountAdd", formatBN(token1AmountAdd));
  // const amountAToSwap = await helperV1_1.calcAmountAToSwap(
  //   reserve0,
  //   reserve1,
  //   token0AmountAdd,
  //   token1AmountAdd
  // );
  // console.log("amountAToSwap", formatBN(amountAToSwap));

  await token0.approve(helperV1_1.address, MaxUint256)
  await token1.approve(helperV1_1.address, MaxUint256)
  const bal1 = await provider.getBalance(wallet.address);
  await helperV1_1.swapAndAddLiquidityTokenAndToken(
    token0.address,
    token1.address,
    token0AmountAdd,
    token1AmountAdd,
    1,
    wallet.address,
    { ...overrides, gasPrice: 1 }
  );
  const bal2 = await provider.getBalance(wallet.address);
  const gasCost1 = bal1.sub(bal2);
  console.log("gas cost swapAndAddLiquidityTokenAndToken", formatBN(gasCost1));
  gasCosts.push(formatBN(gasCost1));

  const reserve0_2 = await token0.balanceOf(pair.address);
  const reserve1_2 = await token1.balanceOf(pair.address);
  console.log("reserve0_2", formatBN(reserve0_2));
  console.log("reserve1_2", formatBN(reserve1_2));

  const leftToken0 = await token0.balanceOf(helperV1_1.address);
  const leftToken1 = await token1.balanceOf(helperV1_1.address);
  console.log("leftToken0", formatBN(leftToken0));
  console.log("leftToken1", formatBN(leftToken1));
  const mag = 1000000000;
  let leftToken0Proportion = 0;
  let leftToken1Proportion = 0;
  if (!token0AmountAdd.eq(0)) {
    leftToken0Proportion = (leftToken0.mul(mag).div(token0AmountAdd).toNumber()) / mag;
  }
  if (!token1AmountAdd.eq(0)) {
    leftToken1Proportion = (leftToken1.mul(mag).div(token1AmountAdd).toNumber()) / mag;
  }
  console.log("leftToken0 / token0AmountAdd", leftToken0Proportion);
  console.log("leftToken1 / token1AmountAdd", leftToken1Proportion);

  const liq1 = await pair.balanceOf(wallet.address);
  console.log("liq0", formatBN(liq0));
  console.log("liq1", formatBN(liq1));
  console.log("minted liquidity", formatBN(liq1.sub(liq0)));

  console.log(gasCosts);
}

async function swapAndAddLiquidityEthAndToken(
  _token0: Contract,
  _token1: Contract,
  pair: Contract,
  wallet: any,
  helperV1_1: Contract,
  provider: MockProvider,
  token0AmountAdd: BigNumber,
  token1AmountAdd: BigNumber
) {
  console.log("_token0.address", _token0.address);
  console.log("_token1.address (WETH)", _token1.address);

  const liq0 = await pair.balanceOf(wallet.address);

  const reserve0 = await _token0.balanceOf(pair.address);
  const reserve1 = await _token1.balanceOf(pair.address);
  // const token0AmountAdd = expandTo18Decimals(2);
  // const token1AmountAdd = expandTo18Decimals(2);
  // const amountAToSwap = await helperV1_1.calcAmountAToSwap(
  //   reserve0,
  //   reserve1,
  //   token0AmountAdd,
  //   token1AmountAdd
  // );
  // console.log("amountAToSwap", formatBN(amountAToSwap));

  await _token0.approve(helperV1_1.address, MaxUint256);
  await _token1.approve(helperV1_1.address, MaxUint256);
  const bal1 = await provider.getBalance(wallet.address);
  await helperV1_1.swapAndAddLiquidityEthAndToken(
    _token0.address,
    token0AmountAdd,
    1,
    wallet.address,
    { ...overrides, gasPrice: 1, value: token1AmountAdd }
  );
  const bal2 = await provider.getBalance(wallet.address);
  const gasCost1 = bal1.sub(bal2);
  console.log("gas cost swapAndAddLiquidityEthAndToken", formatBN(gasCost1));
  gasCosts.push(formatBN(gasCost1));

  const reserve0_2 = await _token0.balanceOf(pair.address);
  const reserve1_2 = await _token1.balanceOf(pair.address);
  console.log("reserve0_2", formatBN(reserve0_2));
  console.log("reserve1_2", formatBN(reserve1_2));

  const leftToken0 = await _token0.balanceOf(helperV1_1.address);
  const leftToken1 = await _token1.balanceOf(helperV1_1.address);
  console.log("leftToken0", formatBN(leftToken0));
  console.log("leftToken1", formatBN(leftToken1));
  const mag = 1000000000;
  let leftToken0Proportion = 0;
  let leftToken1Proportion = 0;
  if (!token0AmountAdd.eq(0)) {
    leftToken0Proportion = (leftToken0.mul(mag).div(token0AmountAdd).toNumber()) / mag;
  }
  if (!token1AmountAdd.eq(0)) {
    leftToken1Proportion = (leftToken1.mul(mag).div(token1AmountAdd).toNumber()) / mag;
  }
  console.log("leftToken0 / token0AmountAdd", leftToken0Proportion);
  console.log("leftToken1 / token1AmountAdd", leftToken1Proportion);

  const liq1 = await pair.balanceOf(wallet.address);
  console.log("liq0", formatBN(liq0));
  console.log("liq1", formatBN(liq1));
  console.log("minted liquidity", formatBN(liq1.sub(liq0)));

  console.log("gasCosts", gasCosts);
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
    let helperV1_1: Contract
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
      helperV1_1 = fixture.helperV1_1
    })

    afterEach(async function() {
      expect(await provider.getBalance(router.address)).to.eq(Zero)
    })

    describe(routerVersion, () => {
      it('factory, router, WETH', async () => {
        expect(await helperV1_1._uniswapV2FactoryAddress()).to.eq(factory.address)
        expect(await helperV1_1._uniswapV2Router02Address()).to.eq(router02.address)
        expect(await helperV1_1._wethAddress()).to.eq(WETH.address)
      })

      it('addLiquidity CB > DA', async () => {
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

        // swapAndAddLiquidity

        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(2);
        await swapAndAddLiquidityTokenAndToken(
          token0, token1, pair, wallet, helperV1_1, provider,
          token0AmountAdd, token1AmountAdd
        );
      })

      it('addLiquidity CB < DA', async () => {
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

        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(2);
        await swapAndAddLiquidityTokenAndToken(
          token0, token1, pair, wallet, helperV1_1, provider,
          token0AmountAdd, token1AmountAdd
        );
      })

      it('addLiquidity CB = DA', async () => {
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

        const token0AmountAdd = token0Amount;
        const token1AmountAdd = token1Amount;
        await swapAndAddLiquidityTokenAndToken(
          token0, token1, pair, wallet, helperV1_1, provider,
          token0AmountAdd, token1AmountAdd
        );
      })

      it('addLiquidity CB > DA D = 0', async () => {
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

        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(0);
        await swapAndAddLiquidityTokenAndToken(
          token0, token1, pair, wallet, helperV1_1, provider,
          token0AmountAdd, token1AmountAdd
        );
      })

      it('addLiquidity CB < DA C = 0', async () => {
        const token0Amount = expandTo18Decimals(40)
        const token1Amount = expandTo18Decimals(10)

        const expectedLiquidity = expandTo18Decimals(20)
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

        const token0AmountAdd = expandTo18Decimals(0);
        const token1AmountAdd = expandTo18Decimals(2);
        await swapAndAddLiquidityTokenAndToken(
          token0, token1, pair, wallet, helperV1_1, provider,
          token0AmountAdd, token1AmountAdd
        );
      })



      it('swapAndAddLiquidityEthAndToken CB > DA', async () => {
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

        // swapAndAddLiquidityEthAndToken

        const _token0 = WETHPartner;
        const _token1 = WETH;
        const pair = WETHPair;
        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(2);

        await swapAndAddLiquidityEthAndToken(
          _token0,
          _token1,
          pair,
          wallet,
          helperV1_1,
          provider,
          token0AmountAdd,
          token1AmountAdd
        );
      })

      it('swapAndAddLiquidityEthAndToken CB < DA', async () => {
        const WETHPartnerAmount = expandTo18Decimals(40)
        const ETHAmount = expandTo18Decimals(10)

        const expectedLiquidity = expandTo18Decimals(20)
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

        // swapAndAddLiquidityEthAndToken

        const _token0 = WETHPartner;
        const _token1 = WETH;
        const pair = WETHPair;
        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(2);

        await swapAndAddLiquidityEthAndToken(
          _token0,
          _token1,
          pair,
          wallet,
          helperV1_1,
          provider,
          token0AmountAdd,
          token1AmountAdd
        );
      })

      it('swapAndAddLiquidityEthAndToken CB = DA', async () => {
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

        // swapAndAddLiquidityEthAndToken

        const _token0 = WETHPartner;
        const _token1 = WETH;
        const pair = WETHPair;
        const token0AmountAdd = expandTo18Decimals(1);
        const token1AmountAdd = expandTo18Decimals(4);

        await swapAndAddLiquidityEthAndToken(
          _token0,
          _token1,
          pair,
          wallet,
          helperV1_1,
          provider,
          token0AmountAdd,
          token1AmountAdd
        );
      })

      it('swapAndAddLiquidityEthAndToken CB > DA D = 0', async () => {
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

        // swapAndAddLiquidityEthAndToken

        const _token0 = WETHPartner;
        const _token1 = WETH;
        const pair = WETHPair;
        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(0);

        await swapAndAddLiquidityEthAndToken(
          _token0,
          _token1,
          pair,
          wallet,
          helperV1_1,
          provider,
          token0AmountAdd,
          token1AmountAdd
        );
      })

      it('swapAndAddLiquidityEthAndToken CB < DA C = 0', async () => {
        const WETHPartnerAmount = expandTo18Decimals(40)
        const ETHAmount = expandTo18Decimals(10)

        const expectedLiquidity = expandTo18Decimals(20)
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

        // swapAndAddLiquidityEthAndToken

        const _token0 = WETHPartner;
        const _token1 = WETH;
        const pair = WETHPair;
        const token0AmountAdd = expandTo18Decimals(0);
        const token1AmountAdd = expandTo18Decimals(2);

        await swapAndAddLiquidityEthAndToken(
          _token0,
          _token1,
          pair,
          wallet,
          helperV1_1,
          provider,
          token0AmountAdd,
          token1AmountAdd
        );
      })

      it('swapAndAddLiquidityEthAndToken small D, C = 0', async () => {
        const WETHPartnerAmount = expandTo18Decimals(2)
        const ETHAmount = expandTo18Decimals(3)

        const expectedLiquidity = bigNumberify("2449489742783178098")
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

        // swapAndAddLiquidityTokenAndToken

        const _token0 = WETHPartner;
        const _token1 = WETH;
        const pair = WETHPair;

        console.log("_token0.address", _token0.address);
        console.log("_token1.address (WETH)", _token1.address);

        const liq0 = await pair.balanceOf(wallet.address);

        const reserve0 = await _token0.balanceOf(pair.address);
        const reserve1 = await _token1.balanceOf(pair.address);
        const token0AmountAdd = expandTo18Decimals(0);

        // const token1AmountAdd = bigNumberify(100000000); // subtraction overflow
        // const token1AmountAdd = bigNumberify(1000000000); // won't underflow, 387741395 left in contract
        // const token1AmountAdd = expandTo18Decimals(1); // won't underflow, 516988236 left in contract
        const token1AmountAdd = bigNumberify(1000);
        const amountAToSwap = await helperV1_1.calcAmountAToSwap(
          reserve1,
          reserve0,
          token1AmountAdd,
          token0AmountAdd
        );
        console.log("amountAToSwap", formatBN(amountAToSwap));

        await _token0.approve(helperV1_1.address, MaxUint256);
        await _token1.approve(helperV1_1.address, MaxUint256);
        const bal1 = await provider.getBalance(wallet.address);
        await helperV1_1.swapAndAddLiquidityEthAndToken(
          _token0.address,
          token0AmountAdd,
          1,
          wallet.address,
          { ...overrides, gasPrice: 1, value: token1AmountAdd }
        );
        const bal2 = await provider.getBalance(wallet.address);
        const gasCost1 = bal1.sub(bal2);
        console.log("gas cost swapAndAddLiquidityEthAndToken", formatBN(gasCost1));

        const reserve0_2 = await _token0.balanceOf(pair.address);
        const reserve1_2 = await _token1.balanceOf(pair.address);
        console.log("reserve0_2", formatBN(reserve0_2));
        console.log("reserve1_2", formatBN(reserve1_2));

        const leftToken0 = await _token0.balanceOf(helperV1_1.address);
        const leftToken1 = await _token1.balanceOf(helperV1_1.address);
        console.log("leftToken0", formatBN(leftToken0));
        console.log("leftToken1", formatBN(leftToken1));

        const liq1 = await pair.balanceOf(wallet.address);
        console.log("liq0", formatBN(liq0));
        console.log("liq1", formatBN(liq1));
        console.log("minted liquidity", formatBN(liq1.sub(liq0)));
      })

      it('addLiquidity twice', async () => {
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

        // const reserve0 = await token0.balanceOf(pair.address);
        // const reserve1 = await token1.balanceOf(pair.address);
        const token0AmountAdd = expandTo18Decimals(2);
        const token1AmountAdd = expandTo18Decimals(2);
        // const amountAToSwap = await helperV1_1.calcAmountAToSwap(
        //   reserve0,
        //   reserve1,
        //   token0AmountAdd,
        //   token1AmountAdd
        // );
        // console.log("amountAToSwap", formatBN(amountAToSwap));

        await token0.approve(helperV1_1.address, MaxUint256)
        await token1.approve(helperV1_1.address, MaxUint256)
        const bal1 = await provider.getBalance(wallet.address);
        await helperV1_1.swapAndAddLiquidityTokenAndToken(
          token0.address,
          token1.address,
          token0AmountAdd,
          token1AmountAdd,
          1,
          wallet.address,
          { ...overrides, gasPrice: 1 }
        );
        const bal2 = await provider.getBalance(wallet.address);
        const gasCost1 = bal1.sub(bal2);
        // console.log("gas cost swapAndAddLiquidityTokenAndToken", formatBN(gasCost1));

        await helperV1_1.swapAndAddLiquidityTokenAndToken(
          token0.address,
          token1.address,
          token0AmountAdd,
          token1AmountAdd,
          1,
          wallet.address,
          { ...overrides, gasPrice: 1 }
        );

        const reserve0_2 = await token0.balanceOf(pair.address);
        const reserve1_2 = await token1.balanceOf(pair.address);
        console.log("reserve0_2", formatBN(reserve0_2));
        console.log("reserve1_2", formatBN(reserve1_2));

        const leftToken0 = await token0.balanceOf(helperV1_1.address);
        const leftToken1 = await token1.balanceOf(helperV1_1.address);
        console.log("leftToken0", formatBN(leftToken0));
        console.log("leftToken1", formatBN(leftToken1));

        const liq1 = await pair.balanceOf(wallet.address);
        console.log("liq0", formatBN(liq0));
        console.log("liq1", formatBN(liq1));
        console.log("minted liquidity", formatBN(liq1.sub(liq0)));
      })

      it('emergencyWithdrawErc20', async () => {
        const token0Amount = expandTo18Decimals(2);

        const token0Balance0 = await token0.balanceOf(wallet.address);
        console.log("token0Balance0", formatBN(token0Balance0));

        await token0.transfer(helperV1_1.address, token0Amount);
        const token0Balance1 = await token0.balanceOf(wallet.address);
        console.log("token0Balance1", formatBN(token0Balance1));

        await helperV1_1.emergencyWithdrawErc20(token0.address);
        const token0Balance2 = await token0.balanceOf(wallet.address);
        console.log("token0Balance2", formatBN(token0Balance2));

        expect(token0Balance1).to.lt(token0Balance0);
        expect(token0Balance0).to.equal(token0Balance2);
      })

      it('emergencyWithdrawEther', async () => {
        const amount = expandTo18Decimals(2);

        const ethBalance0 = await provider.getBalance(wallet.address)
        console.log("ethBalance0", formatBN(ethBalance0));

        await wallet.sendTransaction({to: helperV1_1.address, gasPrice: 0, value: amount});
        const ethBalance1 = await provider.getBalance(wallet.address)
        console.log("ethBalance1", formatBN(ethBalance1));

        await helperV1_1.emergencyWithdrawEther();
        const ethBalance2 = await provider.getBalance(wallet.address)
        console.log("ethBalance2", formatBN(ethBalance2));

        expect(ethBalance1).to.lt(ethBalance0);
        expect(ethBalance2).to.gt(ethBalance1);
      })

      async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
        await token0.transfer(pair.address, token0Amount)
        await token1.transfer(pair.address, token1Amount)
        await pair.mint(wallet.address, overrides)
      }
    })
  }
})
