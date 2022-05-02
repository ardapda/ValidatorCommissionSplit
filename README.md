# ValidatorCommissionSplit
Split cosmos chain validator commission to specific addresses according their delegations

## Prerequisites
1. You have installed [Nodejs]( https://nodejs.org/en/)
2. You have installed [ts-node](https://www.npmjs.com/package/ts-node)
```
npm install -g typescript
npm install -g ts-node
```

## Set up

1. `git clone https://github.com/silentnoname/ValidatorCommissionSplit`
2. `cd ValidatorCommissionSplit`
3. `npm install`
4. Edit the `chainconfig.ts` to add your custom chain and network config
5. Edit the `addresslist.ts` , add your validator address ,and the delegators addresses that you want to split the commission to. Also you can add addresses for your custom chains.
6. `cp .env.example .env`
7. Input your validator account mnemonic chainid and timeout to `.env` file

## Run

`ts-node CommissionSplit.ts`

## Log

Info log`SplitCommission.log` and Error log`SplitCommissionError.log` will be at same directory with `CommissionSplit.ts`

## Troubleshooting

If you're using Ubuntu 20.04, you may need to add the following line on top of utf8.js under node_modules/@cosmjs/encoding/

```
const {TextDecoder, TextEncoder} = require("util");
```