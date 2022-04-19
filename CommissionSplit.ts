import {SigningStargateClient, StargateClient} from "@cosmjs/stargate";
import {chainconfig} from "./chainconfig";
import {addresslist} from "./addresslist";
import { Secp256k1HdWallet} from "@cosmjs/amino";
import { coins } from "@cosmjs/launchpad"

//load env variables
import 'dotenv/config'


//log
const winston = require('winston');
const logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.label({ label: 'Validator commission Split' }),
            winston.format.timestamp(),
            winston.format.splat(),
            winston.format.simple(),
            winston.format.json()
        ),
        transports: [
            new winston.transports.Console({ level: 'error' }),
            new winston.transports.File({
                filename: 'SplitCommission.log',
            }),
            new winston.transports.File({
                filename: 'SplitCommissionError.log',
                level: 'error'
            })
        ]
    }
);

//from mnenomic to wallet address
async function getwallet(mnemonic:string,chainid:string){
    let chain=chainconfig[chainid]
    const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: chain.prefix
    });
    return wallet
}

//get signing stargate client
async function getsigningclient(mnemonic:string,chainid:string){
    let chain=chainconfig[chainid]
    const wallet=await getwallet(mnemonic,chainid)
    const client = await SigningStargateClient.connectWithSigner(chain.rpc, wallet, {});
    return client
}

//get stargate client
async function getclient(chainid:string){
    let chain=chainconfig[chainid]
    const client = await StargateClient.connect(chain.rpc);
    return client
}


//query delegations of address for a specific validator
async function queryDelegations(chainid:string,address:string,validator_address:string){
    let client=await getclient(chainid)
    let delegations=await client.getDelegation(address,validator_address)
    return delegations
}

interface delegation{
    delegator_address:string,
    delegation:number
    shares:number //shares of the delegation
}

interface event{
    type:string,
    attributes:any
}



// get the proportion of each address delegation
async function getProportionOfEachaddress(chainid:string){
    let list=addresslist[chainid]
    let validator_address=list.validator_address
    let delegations:delegation[]=[]

    //query each addresses delegations
    for(let i=0;i<list.delegator_address.length;i++){
        let address=list.delegator_address[i]
        let del=await queryDelegations(chainid,address,validator_address)
        if (del != null){
        delegations.push({
            delegator_address:address,
            delegation:Number(del.amount),
            shares:0
        })}
    }

    //calculate the total delegation
    let total_delegation=0
    for(let i=0;i<delegations.length;i++){
        total_delegation+=delegations[i].delegation
    }

    //calculate the shares of each address
    for(let i=0;i<delegations.length;i++){
        delegations[i].shares=(Math.floor(delegations[i].delegation/total_delegation*1000000000000)/1000000000000) //change the decimal to 12 digits
    }
    logger.info("get delegation proportion of each address successfully")
    return delegations

}




//get the Commission and split the reward,mnemonic is the mnemonic of the validator account
async function getCommissionAndSplitReward(mnemonic:string,chainid:string) {
    let chain = chainconfig[chainid]
    let list = addresslist[chainid]
    const wallet = await getwallet(mnemonic, chainid)
    const [{address, pubkey}] = await wallet.getAccounts();

    //get the proportion of each address delegation
    let delegations = await getProportionOfEachaddress(chainid)

    //Withdraw the commission
    let withdrawCommissionMsgs = []
    withdrawCommissionMsgs.push(
        {
            typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission", //message that only withdraw the commission
            value: {
                validatorAddress: list.validator_address,
            },
        },
    )
    //gas fee
    const withdrawCommissionFee = {
        amount: [
            {
                denom: chain.denom,
                amount: chain.min_tx_fee,
            },
        ],
        gas: "500000",
    };
    let client = await getsigningclient(mnemonic, chainid)
    logger.info("start to withdraw commission")
    let withdrawCommissiontx = await client.signAndBroadcast(address, withdrawCommissionMsgs, withdrawCommissionFee, '').catch(err => {
        logger.error("account"+" Withdraw commission may failed, error:"+err)
        throw err
    })
    if (withdrawCommissiontx.code != 0) {
        logger.error("account: " + address + " withdraw commission error,txhash: " + withdrawCommissiontx.transactionHash)
    }
    if (withdrawCommissiontx.code == 0) {
        logger.info("account: " + address + " withdraw Commission successfully,txhash: " + withdrawCommissiontx.transactionHash)
        //get the commission amount

        let rawlog = JSON.parse(withdrawCommissiontx.rawLog as string)
        let events: event[] = rawlog[0].events
        let commission = 0
        for (let i = 0; i < events.length; i++) {
            if (events[i].type == "withdraw_commission") {
                commission = parseInt(events[i].attributes[0].value)
            }
        }
        logger.info("Total commission: " + commission + chain.denom)

        //split the commission
        const sendTokenFee = {
            amount: [
                {
                    denom: chain.denom,
                    amount: chain.min_tx_fee,
                },
            ],
            gas: "" + 200000 * delegations.length,
        };
        let sendmsgs = []
        for (let delegation_for_each_address of delegations) {
            sendmsgs.push({
                typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                value: {
                        fromAddress: address,
                        toAddress: delegation_for_each_address.delegator_address,
                        amount: coins(Math.floor(commission * delegation_for_each_address.shares), chain.denom) //use math.floor to make sure the amount is a safe integer,the disparity between the sending amount and the accurate amount will be 1ucre
                    },
                })
            logger.info("account: " + address + " will send " + Math.floor(commission * delegation_for_each_address.shares) + chain.denom + " to " + delegation_for_each_address.delegator_address)
        }
        let sendtx = await client.signAndBroadcast(address, sendmsgs, sendTokenFee, 'split commission').catch(err => {
            logger.error("Split commission may failed, error:"+err)
            throw err
        });
        if (sendtx.code != 0) {
            logger.error("account: " + address + " split commission error,txhash: " + withdrawCommissiontx.transactionHash + 'total commission: ' + commission + chain.denom)
        }
        if (sendtx.code == 0) {
            logger.info("account: " + address + " split commission successfully,txhash: " + withdrawCommissiontx.transactionHash)
        }
    }

}

if (process.env.MNEMONIC== undefined || process.env.MNEMONIC == "" || process.env.chainid == undefined || process.env.chainid == "") {
    logger.error("MNEMONIC is undefined or empty")
    process.exit(1)
}
else {
    getCommissionAndSplitReward(process.env.MNEMONIC,process.env.chainid)
}




