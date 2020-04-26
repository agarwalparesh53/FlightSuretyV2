pragma solidity >=0.4.21 <0.7.0;

import "./SafeMath.sol";
import "./IsOperational.sol";

contract FlightSuretyData is IsOperational {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AIRLINE_REGISTERED(address airlineAddress);
    event AIRLINE_APPROVED(address airlineAddress, address approvingAirline, bool approved);
    event AIRLINE_FUNDED(address airlineAddress);

    event FLIGHT_ADDED(address airlineAddress, bytes32 flightKey, uint256 timestamp);
    event FLIGHT_STATUS_UPDATED(address airlineAddress, bytes32 flightKey, bool late);

    event PASSENGER_INSURANCE_PURCHASED(address passengerAddress, address airlineAddress, bytes32 flightKey, uint256 amount);
    event PASSENGER_INSURANCE_CLAIMED(address passengerAddress, address airlineAddress, bytes32 flightKey, uint256 amount);
    event PASSENGER_PAYOUT(address passengerAddress, uint256 amount);

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    constructor()
    IsOperational(msg.sender, "Data")
    public
    {

    }

    function creditInsurees()
    requireIsOperational
    requireContractOwner
    external
    {
        for (uint8 i = 0; i < allFlightKeys.length; i++)
        {
            Flight storage flight = flightInfo[allFlightKeys[i]];
            if (flight.statusCode != 0) {
                for (uint8 j = 0; j< passengers.length; j++) {
                    address passengerAddress = passengers[j];
                    if (flight.statusCode == 20 && passengerInsurances[passengerAddress][allFlightKeys[i]].amount > 0) {

                            uint256 amount = SafeMath.div(SafeMath.mul(passengerInsurances[passengerAddress][allFlightKeys[i]].amount, 3), 2);
                            require(amount > 0, "amount to be added should be positive");
                            passengerCredit[passengerAddress] = SafeMath.add(passengerCredit[passengerAddress], amount);
                            passengerInsurances[passengerAddress][allFlightKeys[i]].insuranceStatus = 2;
                    } else {
                        passengerInsurances[passengerAddress][allFlightKeys[i]].insuranceStatus = 1;
                    }
                }
            }
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(address passengerAddress)
    requireIsOperational
    requireContractOwner
    payable
    external
    {
        require(passengerCredit[passengerAddress] > 0, "There should be some money to payout.");
        uint256 amount = payout(passengerAddress);
        address(uint160(passengerAddress)).transfer(amount);
        emit PASSENGER_PAYOUT(passengerAddress, amount);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund(uint256 amount)
    public
    payable
    requireIsOperational
    requireContractOwner
    {
        address(this).transfer(amount);
    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp)
    pure
    internal
    returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
    external
    payable
    {
    }

    /********************************************************************************************/
    /*                                       Airline Operations                                */
    /********************************************************************************************/

    struct Flight {
        address airlineAddress;
        bytes32 flightIdentifier;
        uint8 statusCode;
        uint256 scheduledFlightTime;
    }

    struct Airline {
        address airlineAddress;
        // 1 = registered, 2 = approved, 3 = funded and Live
        uint8 airlineStatus;
        string airlineCode;
        uint256 requiredApprovalsCount;
        uint256 totalApprovals;
    }

    mapping(bytes32 => Flight) internal flightInfo;

    bytes32[] internal allFlightKeys;

    mapping(address => Airline) internal airlineInfo;

    address[] internal allAirlines;

    mapping(address => mapping(address => bool)) approvals;

    uint256 totalApprovedAirlines = 0;

    modifier isFunded(address airlineAddress)
    {
        require(airlineInfo[airlineAddress].airlineStatus == 3, "Airline must be funded");
        _;
    }

    modifier isRegistered(address airlineAddress)
    {
        require(airlineInfo[airlineAddress].airlineStatus == 1, "Airline must be registered");
        _;
    }

    modifier isApproved(address airlineAddress)
    {
        require(airlineInfo[airlineAddress].airlineStatus == 2, "Airline must be approved");
        _;
    }

    modifier existingAirline(address airlineAddress)
    {
        require(airlineInfo[airlineAddress].airlineAddress != address(0), "Airline must exist");
        _;
    }

    modifier nonExistingAirline(address airlineAddress)
    {
        require(airlineInfo[airlineAddress].airlineAddress == address(0), "Airline must not exist");
        _;
    }

    modifier hasNotVotedAlready(address airlineAddress, address newAirlineAddress)
    {
        require(approvals[newAirlineAddress][airlineAddress] == false, "Can not vote for an airline twice");
        _;
    }

    // register an airline
    function registerAirline(address airlineAddress, string calldata airlineCode)
    requireIsOperational
    requireContractOwner
    nonExistingAirline(airlineAddress)
    external
    {
        airlineInfo[airlineAddress] = Airline(airlineAddress, 1, airlineCode, 0, 0);
        allAirlines.push(airlineAddress);

        if (totalApprovedAirlines == 0) {
            airlineInfo[airlineAddress].airlineStatus = 2;
            emit AIRLINE_APPROVED(airlineAddress, airlineAddress, true);
            totalApprovedAirlines = 1;
        }

       else if(totalApprovedAirlines < 4)
       {
           airlineInfo[airlineAddress].requiredApprovalsCount = 1;
       }

        else if (totalApprovedAirlines >= 4) {
            airlineInfo[airlineAddress].requiredApprovalsCount = SafeMath.div(totalApprovedAirlines, 2);
        }

        emit AIRLINE_REGISTERED(airlineAddress);

    }

    // add a flight for the airline
    function addFlight(address airlineAddress, bytes32 flightIdentifier, uint256 timestamp)
    requireIsOperational
    requireContractOwner
    isFunded(airlineAddress)
    external
    {
        Flight memory flight = Flight(airlineAddress, flightIdentifier, 0 ,timestamp);
        flightInfo[flightIdentifier] = flight;
        allFlightKeys.push(flightIdentifier);
        emit FLIGHT_ADDED(airlineAddress, flightIdentifier, timestamp);
    }

    // update the flight status
    function updateFlightStatus(bytes32 flightIdentifier, uint256 timestamp, uint8 statusCode)
    requireIsOperational
    requireContractOwner
    external
    {
        require(isValidFlight(flightIdentifier, timestamp), "A flight should exist");
        flightInfo[flightIdentifier].statusCode = statusCode;
        emit FLIGHT_STATUS_UPDATED(flightInfo[flightIdentifier].airlineAddress, flightIdentifier, statusCode == 20);
    }

    // check if the given flight is a valid flight
    function isValidFlight(bytes32 flightIdentifier, uint256 timestamp)
    public
    view
    returns(bool)
    {
        return flightInfo[flightIdentifier].scheduledFlightTime == timestamp;
    }

    // method to pay registration fee
    function payRegistrationFee(address airlineAddress)
    isApproved(airlineAddress)
    external
    {
        airlineInfo[airlineAddress].airlineStatus = 3;
        emit AIRLINE_FUNDED(airlineAddress);
    }

    function approveAirline(address airlineAddress, address newAirlineAddress)
    requireIsOperational
    requireContractOwner
    isFunded(airlineAddress)
    hasNotVotedAlready(airlineAddress, newAirlineAddress)
    external
    {
        airlineInfo[newAirlineAddress].totalApprovals = airlineInfo[newAirlineAddress].totalApprovals + 1;
        if (airlineInfo[newAirlineAddress].totalApprovals >= airlineInfo[newAirlineAddress].requiredApprovalsCount)
        {
            airlineInfo[newAirlineAddress].airlineStatus = 2;
            totalApprovedAirlines = SafeMath.add(totalApprovedAirlines, 1);
        }

        emit AIRLINE_APPROVED(airlineAddress, airlineAddress, airlineInfo[newAirlineAddress].airlineStatus == 2);
    }

    function getFlights()
    external
    view
    returns(bytes32[] memory)
    {
        return allFlightKeys;
    }

    function getFlightInfo(bytes32 flightIdentifier)
    external
    view
    returns(address, bytes32, uint8, uint256)
    {
        Flight storage flight = flightInfo[flightIdentifier];
        return (flight.airlineAddress, flight.flightIdentifier, flight.statusCode, flight.scheduledFlightTime);
    }

    function getAllAirlines()
    external
    view
    returns(address[] memory)
    {
        return allAirlines;
    }

    function getAirlineInfo(address airlineAddress)
    external
    view
    returns(address, uint8, string memory, uint256, uint256)
    {
        Airline storage airline = airlineInfo[airlineAddress];
        return (airline.airlineAddress, airline.airlineStatus, airline.airlineCode, airline.requiredApprovalsCount, airline.totalApprovals);
    }

    /********************************************************************************************/
    /*                                       PASSENGER Functions                                */
    /********************************************************************************************/

    struct Insurance {
        // flight number
        bytes32 flightIdentifier;
        // amount
        uint256 amount;
        // status (0 = purchased, 1 = expired, 2 = claimed)
        uint8 insuranceStatus;
    }

    // mapping (passengerAddress => insuranceId)
    mapping(address => mapping(bytes32 => Insurance)) private passengerInsurances;

    // mapping (passengerAddress => remainingFundsToCredit)
    mapping(address => uint256) private passengerCredit;

    // stores the passenger insuranceKeys
    mapping(address => bytes32[]) private passengerInsuranceKeys;

    mapping(address => bool) private passengerRegistered;

    address[] private passengers;

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier hasEnoughFunds(uint256 amount)
    {
        require(amount > 0 ether, "Insurance Policy needs some amount");
        require(amount  < 1 ether, "Total amount should be less than 1 ether");
        _;
    }

    modifier hasInsurance(address passengerAddress, bytes32 flightIdentifier)
    {
        require(passengerInsurances[passengerAddress][flightIdentifier].amount > 0, "passenger should have the insurance");
        _;
    }

    modifier duplicateInsurance(address passengerAddress, bytes32 flightIdentifier)
    {
        require(passengerInsurances[passengerAddress][flightIdentifier].amount == 0, "can not buy duplicate insurance");
        _;
    }

    // passenger can buy insurance using this method
    function buyInsuranceInternal(address passengerAddress, bytes32 flightIdentifier, uint256 amount)
    external
    payable
    requireIsOperational
    requireContractOwner
    duplicateInsurance(passengerAddress, flightIdentifier)
    hasEnoughFunds(amount)
    {
        address(this).transfer(amount);
        if (passengerRegistered[passengerAddress] == false) {
            passengers.push(passengerAddress);
        }
        passengerInsurances[passengerAddress][flightIdentifier] = Insurance(flightIdentifier, uint256(amount), 0);
        passengerInsuranceKeys[passengerAddress].push(flightIdentifier);
    }

    // passenger can claim insurance for a flight
    function claimInsurance(address passengerAddress, bytes32 flightIdentifier)
    external
    requireIsOperational
    requireContractOwner
    hasInsurance(passengerAddress, flightIdentifier)
    {
        if (flightInfo[flightIdentifier].statusCode == 20)
        {
            uint256 amount = SafeMath.div(SafeMath.mul(passengerInsurances[passengerAddress][flightIdentifier].amount, 3), 2);
            passengerCredit[passengerAddress] = passengerCredit[passengerAddress] + amount;
            passengerInsurances[passengerAddress][flightIdentifier].insuranceStatus = 2;
        }
    }

    function payout(address passengerAddress)
    internal
    returns(uint256)
    {
        uint256 amount = passengerCredit[passengerAddress];
        passengerCredit[passengerAddress] = 0;
        return amount;
    }

    function getPassengerInsurances(address passengerAddress)
    external
    view
    returns(bytes32[] memory)
    {
        return passengerInsuranceKeys[passengerAddress];
    }

    function getPassengerInsurance(address passengerAddress, bytes32 flightIdentifier)
    external
    view
    returns(uint256, uint8)
    {
        Insurance storage insurance = passengerInsurances[passengerAddress][flightIdentifier];
        return (insurance.amount, insurance.insuranceStatus);
    }

    function getPassengerCredit(address passengerAddress)
    external
    view
    returns(uint256)
    {
        return passengerCredit[passengerAddress];
    }
}

