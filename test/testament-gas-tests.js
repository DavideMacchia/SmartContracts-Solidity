const Testament = artifacts.require('Testament');
const Web3 = require('web3');
const Web3Utils = require('web3-utils');
const truffleAssert = require('truffle-assertions'); //npm install truffle-assertions
const truffleTestHelper = require("./helpers/truffleTestHelper");
const BN = Web3.utils.BN;

const SECONDS_IN_A_DAY = 60*60*24;

contract("Testament", (accounts) => {
    let testament;

    before(async () => {
        // set up contract with relevant initial state and deploy it
        testament = await Testament.deployed();
    });
    it("Registration Gas Tests", async () => {
        let result = await testament.register({from: accounts[0]});
        let sumGasUsed = parseInt(result.receipt.gasUsed);
        console.log('TOTAL Gas Registration:' + sumGasUsed);
    });
    it("addBeneficiary Gas Tests", async () => {
        let result = await testament.addBeneficiary(accounts[1], {
            from: accounts[0],
            value: Web3Utils.toWei(new BN(1), "ether")
        });
        let sumGasUsed = parseInt(result.receipt.gasUsed);
        console.log('TOTAL Gas addBeneficiary:' + sumGasUsed);
    });
    it("renewSubscribe Gas Tests", async () => {
        let result = await testament.renewSubscribe({from: accounts[0]});
        let sumGasUsed = parseInt(result.receipt.gasUsed);
        console.log('TOTAL Gas renewSubscribe:' + sumGasUsed);
    });
    it("unsubscribe Gas Tests", async () => {
        let result = await testament.unsubscribe({from: accounts[0]});
        let sumGasUsed = parseInt(result.receipt.gasUsed);
        console.log('TOTAL Gas unsubscribe:' + sumGasUsed);
    });

    it("controlValidSubscription Gas Tests", async () => {
        await testament.register({from: accounts[0]});
        await testament.addBeneficiary(accounts[1], {
            from: accounts[0],
            value: Web3Utils.toWei(new BN(1), "ether")
        });
        await truffleTestHelper.advanceTimeAndBlock(SECONDS_IN_A_DAY * 61);
        let result = await testament.controlValidSubscription(accounts[0], {from: accounts[0]}).catch((err) => {
            console.error("ERROR - controlValidSubscription on accounts[0]" + err);
            return false;
        });
        let sumGasUsed = parseInt(result.receipt.gasUsed);
        console.log('TOTAL Gas controlValidSubscription:' + sumGasUsed);
    });
});

