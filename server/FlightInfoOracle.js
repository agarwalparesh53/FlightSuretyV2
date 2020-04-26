// import BigNumber from 'bignumber.js';

module.exports = class FlightInfoOracle {

    static STATUS_CODES = [0, 10, 20, 30, 40, 50];

    constructor(indexes, address) {
        this._indexes= indexes;
        this._address = address;
        console.log(`"Oracle Created ${this._address} : ${this._indexes}"`)
    }

    getFlightStatus(request){
        let validIndex = this._indexes.findIndex(value => request.index === value);
        if (validIndex !== -1) {
            let randomNumber = Math.random() * 1000000;
            return FlightInfoOracle.STATUS_CODES[Math.ceil(randomNumber) % 6];
        }
    }

    getAddress() {
        return this._address;
    }
};

// export default FlightInfoOracle;