export const chainconfig: { [key: string]: any } = {
    "crescent-1":{
        name:'crescent',
        rpc:'https://crescent-rpc.polkachu.com/',
        rest_api:'https://crescent-api.polkachu.com/',
        symbol:'CRE',
        denom: "ucre",
        min_tx_fee: "0",
        prefix:"cre"
    },
    "mooncat-1-1":{
        name:'mooncat',
        rpc:'http://localhost:26657/',
        rest_api:'http://localhost:1317/',
        symbol:'CRE',
        denom: "ucre",
        min_tx_fee: "0",
        prefix:"cre"
    },
}