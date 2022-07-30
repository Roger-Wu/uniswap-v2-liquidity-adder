# Uniswap V2 Liquidity Adder

This tool allows you to add tokens or ETH to a Uniswap V2 pair in any proportion.

## DApp

https://uniswap-helper.netlify.app/#/add

## Introduction

This is not an official tool.<br />

This tool allows you to add tokens or ETH to a Uniswap V2 pair in any proportion.<br />

For example, no matter how much ETH and DAI are in the pool of ETH-DAI pair,<br />
you can still add any amount of ETH and DAI to the pool in one transaction, such as [1 ETH + 100 DAI] or [1 ETH + 0 DAI] or [0 ETH + 100 DAI].<br />
Behind the scenes, the contract swaps part of your token (or ETH) to the other token (or ETH) and then adds them all to the pair.<br />
The amount to swap is calculated with [this formula](https://www.wolframalpha.com/input/?i=solve+%28C+-+x%29+*+%28B+%2B+D%29+%3D+%28A+%2B+C%29+*+%28D+%2B+y%29%2C+%281000+*+A+%2B+997+*+x%29+*+%28B+-+y%29+%3D+1000+*+A+*+B) to maximize the funds added into the pool.

The contract has been tested but not fully audited;<br />
however, if there's a serious flaw in our contract,<br />
Uniswap's Router will revert the transaction,<br />
ensuring that your funds are safe.<br />
Nevertheless, use at your own risk.<br />

We don't charge an additional fee because we don't want to waste more gas charging ourselves. 😄<br />

## Local Development

The following assumes the use of `node@>=10`.

## Install Dependencies

`yarn`

## Compile Contracts

`yarn compile`

## Run Tests

`yarn test`
