# Uniswap V2 Helper

This tool helps you add any ratio of tokens or ETH to a Uniswap pair.

## Introduction

This is not an official tool.<br />

This tool helps you add any ratio of tokens or ETH to a Uniswap pair.<br />
With this tool, for example, if there are 1 ETH + 400 DAI in a pair,<br />
you can add (1 ETH + 100 DAI) or (1 ETH + 0 DAI) or (0 ETH + 100 DAI) to the pool in one transaction.<br />
Behind the scenes, the contract swaps part of your token (or ETH) to the other token (or ETH) and then adds them all to the pair.<br />
The contract will find the best amount to swap to maximize the amount added into the pair with [this formula](https://www.wolframalpha.com/input/?i=solve+%28C+-+x%29+*+%28B+%2B+D%29+%3D+%28A+%2B+C%29+*+%28D+%2B+y%29%2C+%281000+*+A+%2B+997+*+x%29+*+%28B+-+y%29+%3D+1000+*+A+*+B).<br />

The contract is tested but not fully audited,<br />
but if there's a serious flaw in our contract,<br />
Uniswap's Router will still revert the transaction,<br />
so your funds will be safe.<br />
Still, use at your own risk.<br />

There is no extra fee because we don't want to waste more gas just to charge ourselves. 😄<br />

## Uniswap V2

[![Actions Status](https://github.com/Uniswap/uniswap-v2-periphery/workflows/CI/badge.svg)](https://github.com/Uniswap/uniswap-v2-periphery/actions)
[![npm](https://img.shields.io/npm/v/@uniswap/v2-periphery?style=flat-square)](https://npmjs.com/package/@uniswap/v2-periphery)

In-depth documentation on Uniswap V2 is available at [uniswap.org](https://uniswap.org/docs).

The built contract artifacts can be browsed via [unpkg.com](https://unpkg.com/browse/@uniswap/v2-periphery@latest/).

## Local Development

The following assumes the use of `node@>=10`.

## Install Dependencies

`yarn`

## Compile Contracts

`yarn compile`

## Run Tests

`yarn test`
