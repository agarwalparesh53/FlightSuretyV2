const FlightSuretyApp = require('../build/contracts/FlightSuretyApp.json');
const Config = require('./config.json');
const Web3 = require('web3');
const express = require('express');
const FlightInfoOracleApp = require('./FlightInfoOracleApp');

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
init();

async function init() {
    const NUMBER_OF_ORACLES = 20;
    let flightInfoOracleApp = new FlightInfoOracleApp(NUMBER_OF_ORACLES, flightSuretyApp, web3);
    const accounts = await web3.eth.getAccounts();
    await flightInfoOracleApp.init();

   flightSuretyApp.events.OracleRequest({fromBlock: 0}, async (error, event) => {
       if (error) return console.log(error);
       console.log(event.returnValues);
       await flightInfoOracleApp.getFlightStatus(event.returnValues);
   })

}

const app = express();
module.exports = app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});
//
// export default app;


