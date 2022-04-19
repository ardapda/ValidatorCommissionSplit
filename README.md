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
4. `cp .env.example .env`
5. Input your validator account mnemonic to `.env` file
6. Edit the `chainconfig.ts` to add your custom chain and network config
7. Edit the `addresslist.ts` , add your validator addresses ,and the address that you want to split the commission to. Also you can add address for your custom chains.

## Run

`ts-node CommissionSplit.ts` 

## Log

Info log`SplitCommission.log` and Error log`SplitCommissionError.log` will be at same directory with `CommissionSplit.ts`

