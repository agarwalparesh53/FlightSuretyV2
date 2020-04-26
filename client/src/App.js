import React, { Component } from "react";
import FlightSuretyApp from "./contracts/FlightSuretyApp.json";
import getWeb3 from "./getWeb3";

import "./App.css";

import Config from './config.json';

class App extends Component {
  state = {
      storageValue: 0,
      web3: null,
      accounts: null,
      contract: null,
      allFlights: {},
      allAirlines: {},
      allInsurances: {},
      isOperational: null,
      credit: null,
      selectedAirline: null,
      amount: 1000
  };

    componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const instance = new web3.eth.Contract(
        FlightSuretyApp.abi,
        Config.localhost.appAddress
      );

      console.log(instance);
      console.log(accounts);
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runExample);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  getAllFlights= async () => {
      const { web3, accounts, contract } = this.state;
      try {
          let flights = [];
          await contract.methods.getFlights().call({from: accounts[0]},
              (error, result) => {
                  console.log(error, result);
                  flights = result;
                  this.setState({"flights": flights});
              });

          await flights.forEach(flight => {
                contract.methods.getFlightInfo(flight).call((error, response) => {
                    console.log(response);
                    var allFlights = this.state.allFlights;
                    var flightInfo = {
                        airlineAddress: response[0],
                        flightKey: response[1],
                        flightStatus: response[2],
                        flightTime: parseInt(response[3])
                    };
                    allFlights[flight] = flightInfo;
                    this.setState({allFlights: allFlights});
                });
          });
          // const flight = this.state.allFlights[flights[0]];
      } catch (e) {
          console.log(e);
      }
  };

  getAllAirlines = async () => {
      const { accounts, contract } = this.state;
      var airlines;
      await contract.methods.getAllAirlines()
          .call({from: accounts[0]}, (error, result) => {
              airlines = result;
          });

      airlines.forEach(airline => {
          contract.methods.getAirlineInfo()
              .call({from: airline}, (error, result) => {
                  const airlineInfo = {
                      address: airline,
                      airlineCode: result.airlineCode,
                      isApproved: result.status == 2,
                      isFunded: result.status == 3
                  };
                  var allAirlines = this.state.allAirlines;
                  allAirlines[airline] = airlineInfo;
                  this.setState({allAirlines: allAirlines});
                  this.setState({selectedAirline: airlines[0]})
              });
      });

  };

  getIsOperational = async () => {
      const { accounts, contract } = this.state;
      try {
          await contract.methods.isOperational().call({from: accounts[0]},
              (error, result) => {
                  // console.log(error, result);
                  this.setState({isOperational: result});
              });
      } catch (e) {
          console.log(e);
      }
  };

  getAllInsurances = async () => {
      const { web3, accounts, contract } = this.state;
      try {
          var insurances = [];
          await contract.methods.getPassengerInsurances().call({from: accounts[0]},
              (error, result) => {
                    console.log(error, result);
                    insurances = result;
                    insurances.forEach(insurance => {
                        contract.methods.getPassengerInsurance(insurance).call({from: accounts[0]}, (error, response) => {
                            var insuranceInfo = {
                                amount: response[0],
                                status: response[1]
                            };
                            var allInsurances = this.state.allInsurances;
                            allInsurances[insurance] = insuranceInfo;
                            this.setState({allInsurances: allInsurances});
                        });
                    });
              });
      } catch (e) {
          console.log(e);
      }
  };

  fetchFlightStatus = async (airlineAddress, airlineCode, timestamp) => {
      const { web3, accounts, contract } = this.state;
      try {
          contract.methods.fetchFlightStatus(airlineAddress, airlineCode, timestamp)
              .send({ from: accounts[0]}, (error, result) => {
                  console.log("sending fetch flight status request");
                  console.log(error, result);
              });
      } catch (e) {
          console.log(e);
      }
  };


  getCredit = async () => {
      const { web3, accounts, contract } = this.state;

      try {
          await contract.methods.getPassengerCredit().call({from: accounts[0]},
              (error, result) => {
                  console.log(error, result);
                  this.setState({credit: result});
              });
      } catch (e) {
          console.log(e);
      }

  };

  runExample = async () => {
    const { web3, accounts, contract } = this.state;

    // Stores a given value, 5 by default.
    // await contract.methods.set(5).send({ from: accounts[0] });

    // Registration logic
    console.log(contract.methods);

    this.getIsOperational();

    this.getAllFlights();

    this.getAllAirlines();

    this.getAllInsurances();

    this.getCredit();

    // const response = await contract.methods.getAllAirlines().call({from: accounts[0]});

    //   this.forceUpdate();
    // // Update state with the result.
    // this.setState({ storageValue: response });
  };

  buyInsurance = async (flightKey) => {
      console.log("Purchase happened");
      const { allFlights, allAirlines, contract, web3, amount, accounts } = this.state;
      const flight = allFlights[flightKey];
      await contract.methods.buyInsurance(flightKey, amount).send({from: accounts[0], value: web3.utils.toWei("1", "ether")});
      console.log("Purchase happened");
  };

  displayPurchaseInsurance = () => {
      const { allAirlines, allFlights } = this.state;

      return  (
          <div>
              <h2>Choose from a list of flights to purchase insurance</h2>
              <select onChange={(event) => this.setState({selectedAirline: event.target.value})}>
                  {
                      Object.keys(allAirlines).map((key, index) => {
                      return (
                          <option key={index} value={key}>{allAirlines[key].airlineCode}</option>
                      );
                  })}
              </select>
              <input type="number" min="10000" max="20000" step={100} value={this.state.amount} onChange={(event) => this.setState({amount: event.target.value})}/>
              <label>Amount for the insurance</label>
              <br></br>
              <ul>
                  {
                      Object.keys(allFlights).filter((key) => this.state.selectedAirline == allFlights[key].airlineAddress)
                          .filter((key) => !this.state.allInsurances[key])
                          .map((key, index) => {
                          return (
                              <div key={index}>
                                  <div>
                                      <span>{allAirlines[this.state.selectedAirline].airlineCode}{index} </span>
                                      <span>{allFlights[key].flightTime * 1000} </span>
                                      <button onClick={() => this.buyInsurance(key)}>Buy Insurance</button>
                                  </div>
                                  {/*<span>{new Date(allFlights[key].flightTime * 1000)} </span>*/}
                              </div>
                          );
                  })
                  }
              </ul>
          </div>
      );
  };

  displayCurrentInsurances = () => {
      const {allFlights, allAirlines, allInsurances} = this.state;
    return (
        <div>
            <h2>Current Insurance schemes purchased</h2>
            <table className="InsuranceDetails">
                <thead>
                <th>Airline Code</th>
                <th>Flight Status</th>
                <th>Flight Time</th>
                <th>Amount of insurance</th>
                <th>Fetch Action</th>
                <th>Claim Action</th>
                </thead>
            {
                Object.keys(allInsurances).map((insurance, index) => {
                    return (<tr>
                        <td>{allAirlines[allFlights[insurance].airlineAddress].airlineCode}</td>
                        <td>{allFlights[insurance].flightStatus}</td>
                        <td>{allFlights[insurance].flightTime}</td>
                        <td>{allInsurances[insurance].amount}$</td>
                        <td>{allInsurances[insurance].status == 2 ? ' CLAIMED ' :
                            allInsurances[insurance].status == 1 ? ' EXPIRED ': ' ACTIVE '}</td>
                        <td><button onClick={() => this.fetchFlightStatus(allFlights[insurance].airlineAddress,
                                allAirlines[allFlights[insurance].airlineAddress].airlineCode,
                                allFlights[insurance].flightTime)}>
                            Fetch Flight Status</button></td>
                        <td><button onClick={() => this.claimInsurance(insurance)} disabled={allFlights[insurance].flightStatus != 20 || allInsurances[insurance].status == 2}>Claim Insurance</button></td>
                    </tr>);
                })
            }
            </table>
        </div>
    )
  };

  displayCurrentCredit = () => {
      return (
          <div>
              <h2>Total available credit for payout: {this.state.credit}</h2>
              <button onClick={() => this.requestPayout()}>Request payout</button>
          </div>
      );
  };

    displayCreditAllInsuress = () => {
        return (
            <button onClick={() => this.creditAllInsurees()}>Credit All Insurees</button>
        )
    };

    requestPayout = async () => {
        const { contract, accounts } = this.state;
        await contract.methods.payPassenger().send({from: accounts[0]});
    };

    creditAllInsurees = async () => {
        const { contract, accounts } = this.state;
        await contract.methods.creditInsurees().send({from: accounts[0]});
    };

    claimInsurance = async (flightKey) => {
        const { contract, accounts } = this.state;
        await contract.methods.claimPassengerInsurance(flightKey).send({from: accounts[0]});
    }

  render() {
    if (!this.getIsOperational()) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
          {this.displayPurchaseInsurance()}
          {this.displayCurrentInsurances()}
          {/*{this.displayCreditAllInsuress()}*/}
          {this.displayCurrentCredit()}
      </div>
    );
  }
}

export default App;
