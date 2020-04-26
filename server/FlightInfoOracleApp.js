const FlightInfoOracle = require('./FlightInfoOracle');

module.exports = class FlightInfoOracleApp {

    constructor(numberOfOracles, flightSuretyApp, web3) {
        this._numberOfOracles = numberOfOracles;
        this._oracles = [];
        this._flightSuretyApp = flightSuretyApp;
        this._web3 = web3;
    }

    // register the required oracles
    async init(){
        let accounts = await this._web3.eth.getAccounts();
        console.log(accounts);
        for (let c = 0; c < this._numberOfOracles; c++) {
            try{
                let oracle = await this.createOracle(accounts[c]);
                this._oracles.push(oracle);
            } catch (e) {
                console.error("Could not register oracle");
            }
        }

        console.log(`"Registered ${this._oracles.length}"`);
    }

    // create an oracle
    async createOracle(account){
        console.log("Trying to register oracle for " + account);
        await this._flightSuretyApp.methods.registerOracle().send({
            from: account,
            value: this._web3.utils.toWei("1", "ether"),
            gas: 4712388
        }).then((response, error) => {});
        let indexString;
        const indexes = await this._flightSuretyApp.methods.getMyIndexes().call({from: account});
        console.log(indexes);
        return new FlightInfoOracle(indexes, account);
    }

    // get the overall flight status for all
    async getFlightStatus(request){
        if (this._oracles.length === 0) return;

        console.log(`"Get Flight Status Request ${request.index} ,  ${request.flight}, ${request.airline}, ${request.timestamp}"`);

        this._oracles.map(async oracle => {
            const statusCode = oracle.getFlightStatus(request);
            if (statusCode) {
                this._flightSuretyApp.methods.submitOracleResponse(request.index, request.airline, request.flight, request.timestamp, statusCode)
                    .send({ from: oracle.getAddress(), gas: 4712388})
                    .then(() => {
                        console.log("Oracle responded with " + statusCode);
                    }).catch((err) => console.log("Oracle response rejected", statusCode));
            }
        });
    }
};

// export default FlightInfoOracleApp;