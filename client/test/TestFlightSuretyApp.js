var FlightSuretyData = artifacts.require("FlightSuretyData");
var FlightSuretyApp = artifacts.require("FlightSuretyApp");

var Big = require("big.js");
const web3 = require('web3');
const truffleAssert = require('truffle-assertions');

contract('FlightSuretyApp', function(accounts) {
    web3.utils.defaultAccount = accounts[0];
    const owner1 = accounts[0];
    const owner2 = accounts[11];
    const airline1  = accounts[1];
    const airline2 = accounts[2];
    const airline3 = accounts[3];
    const airline4 = accounts[4];
    const airline5 = accounts[11];
    const airline6 = accounts[13];
    const passenger1 = accounts[7];
    const passenger2 = accounts[8];

    var dataContract;
    var appContract;

    before(async () => {
        dataContract = await FlightSuretyData.deployed({from: owner1, value: web3.utils.toWei('10', "ether")});
        appContract = await FlightSuretyApp.deployed(dataContract.address, {from: owner1});

        await dataContract.setAuthorizedUser(appContract.address, true, {from: owner1});
    });

    it("Testing Contract owner can be changed", async() => {
        await dataContract.setContractOwner(owner2, {from: owner1});
        await dataContract.isOperational({from: owner2});
    });

    it(`(multiparty) has correct initial isOperational() value`, async function () {
        assert.equal(await dataContract.isOperational(), true, "Incorrect initial operating status value for flightSuretyData");
    });

    // AIRLINES

    it('First Airline 4 airlines funded and approved', async function () {
        const allAirlines = await appContract.getAllAirlines({from: appContract.address});

        // console.log(allAirlines);
        assert.equal(allAirlines.length, 4, "First airline")

        allAirlines.map(async airline => {
            const status = 3;
            const airlineInfo = await appContract.getAirlineInfo({from: airline});
            const airlineStatus = parseInt(new Big(airlineInfo['1']));
            assert(airlineStatus == status, "Airline should be funded");
            return true;
        })
    });

    it('Need 50% approval for fifth airline', async function () {
        var allAirlines = await appContract.getAllAirlines({from: appContract.address});

        // register new airline
        await appContract.registerAirline("UAL", {from: airline5});
        allAirlines = await appContract.getAllAirlines({from: appContract.address});
        assert.equal(allAirlines.length, 5, "We should have 5 airlines now");

        const airlineInfo = await appContract.getAirlineInfo({from: airline5});
        const airlineStatus = parseInt(new Big(airlineInfo['1']));
        assert(airlineStatus == 1, "Airline should be registered");

        const approvalCount = parseInt(new Big(airlineInfo['3']));
        const totalApproved = parseInt(new Big(airlineInfo['4']));
        console.log("Total Approved", totalApproved);
        console.log("Approval count", approvalCount);
        assert(approvalCount == 2, "Should require 2 airlines approval");
    });

    it('Next airline is approved by 2 airlines and duplicate approvals doesnt work', async function () {

        await appContract.registerAirline("KPL", {from: airline6});
        allAirlines = await appContract.getAllAirlines({from: appContract.address});
        assert.equal(allAirlines.length, 6, "We should have 5 airlines now");

        try {
            await appContract.approveAirline(airline5, {from: airline6});
        } catch (e) {
            console.log("Expected this to fail");
        }

        var airlineInfo = await appContract.getAirlineInfo({from: airline5});
        var airlineStatus = parseInt(new Big(airlineInfo['1']));
        console.log("AirlineStatus1: ", airlineStatus);
        assert(airlineStatus == 1, "Airline should be funded");

        await appContract.approveAirline(airline5, {from: airline3});

        try {
            await appContract.approveAirline(airline5, {from: airline3});
        } catch (e) {
            console.log("Approval duplicate not allowed")
        }

        airlineInfo = await appContract.getAirlineInfo({from: airline5});
        airlineStatus = parseInt(new Big(airlineInfo['1']));
        console.log(airlineStatus);
        console.log("AirlineStatus2: ", airlineStatus);
        assert(airlineStatus == 2, "Airline should be funded");
    });


    // PASSENGERS
    it('Passenger can buy an insurance', async function () {
        var airlineInfo = await appContract.getAirlineInfo({from: airline1});
        await appContract.registerFlight(airlineInfo[2], Math.ceil(new Date().getTime() / 1000), {from: airline1});

        var flights = await appContract.getFlights();
        console.log(flights);
        await appContract.buyInsurance(flights[0], 99, {from: passenger1});

        const passengerData = await appContract.getPassengerInsurance(flights[0]);
        const insuranceStatus = (passengerData['1']);
        assert(insuranceStatus == 0, "Insurance should be outstanding for now.");
    });

    it('Passenger claims an insurance', async function () {
        var flights = await appContract.getFlights();

        const flight = await appContract.getFlightInfo(flights[0]);
        const scheduledTime = parseInt(new Big(flight['3']));
        console.log("Scheduled Time: " , scheduledTime);

        var credit = (await appContract.getPassengerCredit({from: passenger1}));
        assert(credit == 0);

        await dataContract.updateFlightStatus(flights[0], scheduledTime, 20, {from: owner2});

        const passengerData = await appContract.getPassengerInsurance(flights[0]);
        const insuranceStatus = parseInt(new Big(passengerData['1']));
        assert(insuranceStatus == 0, "Insurance should be outstanding for now.");

        await appContract.claimPassengerInsurance(flights[0], {from: passenger1});

        var updatedCredit = (await appContract.getPassengerCredit({from: passenger1}));
        console.log("UPDATED CREDIT", updatedCredit);
        assert(updatedCredit > 100);

    });

});