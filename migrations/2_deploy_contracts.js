const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const SimpleStorage = artifacts.require("SimpleStorage");

const fs = require('fs');
const web3 = require("web3");

module.exports = function(deployer, network, accounts) {
  // deployer.deploy(SimpleStorage);
  deployer.deploy(FlightSuretyData)
      .then(dataInstance => {
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address);
      })
      .then(deployer => {
        return FlightSuretyData.deployed();
      }).then(dataInstance => {
    dataInstance.setAuthorizedUser(FlightSuretyApp.address, true);
    return FlightSuretyApp.deployed();
  }).then(async appInstance => {
    await appInstance.fund({value: web3.utils.toWei('20', 'ether')});
    await appInstance.registerAirline("AAL", {from: accounts[1]});
    await appInstance.registerAirline("UA", {from: accounts[2]});
    await appInstance.registerAirline("DELTA", {from: accounts[3]});
    await appInstance.registerAirline("Air India", {from: accounts[4]});
    await appInstance.fund({value: web3.utils.toWei('10', 'ether')});

    await appInstance.payRegistrationFee({from: accounts[1], value: web3.utils.toWei('10', 'ether')});

    await appInstance.approveAirline(accounts[2], {from: accounts[1]});
    await appInstance.approveAirline(accounts[3], {from: accounts[1]});
    await appInstance.approveAirline(accounts[4], {from: accounts[1]});

    await appInstance.payRegistrationFee({from: accounts[2], value: web3.utils.toWei('10', 'ether')});
    await appInstance.payRegistrationFee({from: accounts[3], value: web3.utils.toWei('10', 'ether')});
    await appInstance.payRegistrationFee({from: accounts[4], value: web3.utils.toWei('10', 'ether')});


    for (var x =0; x< 10; x++) {
      await appInstance.registerFlight('AAL', Math.ceil(new Date().getTime() / 1000) + x * 10, {from: accounts[1]});

      await appInstance.registerFlight('UA', Math.ceil(new Date().getTime() / 1000) + x * 10, {from: accounts[2]});
      await appInstance.registerFlight('DELTA', Math.ceil(new Date().getTime() / 1000) + x * 10, {from: accounts[3]});
      await appInstance.registerFlight('Air India', Math.ceil(new Date().getTime() / 1000) + x * 10, {from: accounts[4]});
    }
    // we will add some flights later
  }).then(result => {
    let config = {
      localhost: {
        url: 'http://localhost:8545',
        dataAddress: FlightSuretyData.address,
        appAddress: FlightSuretyApp.address,
        allAccounts: accounts
      }
    };
    fs.writeFileSync(__dirname + '/../client/src/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
    fs.writeFileSync(__dirname + '/../server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
  }).catch(err =>{
    console.log(err);
  });
}