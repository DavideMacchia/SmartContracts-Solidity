const Testament = artifacts.require('Testament');
const Web3 = require('web3');
const Web3Utils = require('web3-utils');
const truffleAssert = require('truffle-assertions'); //npm install truffle-assertions
const truffleTestHelper = require("./helpers/truffleTestHelper");
const BN = Web3.utils.BN;

contract("Testament", (accounts) => {
    //const web3 = new Web3(Web3.givenProvider || "http://localhost:7545");
    //web3.eth.getAccounts().then(console.log); to print all the accounts

    let testament;

    before(async () => {
        // set up contract with relevant initial state and deploy it
        testament = await Testament.deployed();
    });
    it("'Registration' Tests:", async () => {
        let result_1 = await testament.register({from: accounts[0]});
        let result_2 = await testament.register({from: accounts[1]});
        //test on returns
        assert.notEqual(result_1, "The Account is already registered", "Account already registered.");
        assert.notEqual(result_2, "The Account is already registered", "Account already registered.");

        //test on events
        truffleAssert.eventEmitted(result_1, 'Registered', (ev) => { //Registered is the name of the event emitted
            assert.equal(ev._registeredAddress, accounts[0], 'EVENT - Account registration error');
            return true;
        });
        truffleAssert.eventEmitted(result_2, 'Registered', (ev) => {
            assert.equal(ev._registeredAddress, accounts[1], 'EVENT - Account registration error');
            return true;
        });
    });
    it("addBeneficiary Tests:", async () => {
        await testament.addBeneficiary(accounts[2], {from: accounts[0], value:Web3Utils.toWei(new BN(1), "ether")});
        await testament.addBeneficiary(accounts[3], {from: accounts[0], value:Web3Utils.toWei(new BN(2), "ether")});
        await testament.addBeneficiary(accounts[4], {from: accounts[0], value:Web3Utils.toWei(new BN(3), "ether")});
        await testament.addBeneficiary(accounts[2], {from: accounts[0], value:Web3Utils.toWei(new BN(2), "ether")});
    });
    it("getBeneficiaries Tests - 1:", async () => {
        let result = await testament.getBeneficiaries({from: accounts[0]}).catch((err) => {
            console.error("ERROR getBeneficiaries: " +err);
            return false;
        });
        console.log(result);
        return true;
    });
    it("controlValidSubscription Tests:", async () => {
        const SECONDS_IN_A_DAY = 60*60*24;
        await truffleTestHelper.advanceTimeAndBlock(SECONDS_IN_A_DAY * 50); //skip blockchain time by 50 days

        await testament.controlValidSubscription(accounts[0], {from: accounts[6]}).catch((err) => {
            console.error("ERROR controlValidSubscription: " +err);
            return false;
        });

        await truffleTestHelper.advanceTimeAndBlock(SECONDS_IN_A_DAY * 20);
        let result = await testament.controlValidSubscription(accounts[0], {from: accounts[6]}).catch((err) => {
            console.error("ERROR controlValidSubscription: " +err);
        });
        truffleAssert.eventEmitted(result, 'TestamentTriggered', (ev) => {
            //assert.equal(ev._from, accounts[0], 'EVENT1 - Testament triggered error, _from');
            //assert.equal(ev._to, accounts[2], 'EVENT1 - Testament triggered error, _to');
            return true;
        });
    });
    /*
    //can't work
    it("getBeneficiaries Tests - 2:", async () => {
        let result = await testament.getBeneficiaries({from: accounts[0]}).catch((err) => {
            console.error("ERROR getBeneficiaries: " +err);
            return false;
        });
        console.log(result);
        return true;

    });
    */

});
