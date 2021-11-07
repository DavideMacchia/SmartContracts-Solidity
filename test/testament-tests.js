const Testament = artifacts.require('Testament');
const Web3 = require('web3');
const Web3Utils = require('web3-utils');
const truffleAssert = require('truffle-assertions'); //npm install truffle-assertions
const truffleTestHelper = require("./helpers/truffleTestHelper");
const BN = Web3.utils.BN;

const SECONDS_IN_A_DAY = 60*60*24;

contract("Testament", (accounts) => {
    //const web3 = new Web3(Web3.givenProvider || "http://localhost:7545");
    //web3.eth.getAccounts().then(console.log); to print all the accounts

    let testament;

    before(async () => {
        // set up contract with relevant initial state and deploy it
        testament = await Testament.deployed();
    });
    it("Registration Tests", async () => {
        let result_1 = await testament.register({from: accounts[0]});
        let result_2 = await testament.register({from: accounts[1]});
        //test on returns
        assert.notEqual(result_1, "The Account is already registered", "ERROR - Account is already registered.");
        assert.notEqual(result_2, "The Account is already registered", "ERROR - Account is already registered.");

        //test on events
        truffleAssert.eventEmitted(result_1, 'LogAccountSubscribed', (ev) => { //Registered is the name of the event emitted
            assert.equal(ev._address, accounts[0], 'ERROR EVENT - LogAccountSubscribed');
            return true;
        });
        truffleAssert.eventEmitted(result_2, 'LogAccountSubscribed', (ev) => {
            assert.equal(ev._address, accounts[1], 'ERROR EVENT - LogAccountSubscribed');
            return true;
        });
    });
    it("addBeneficiary & getBeneficiaries Tests", async () => {
        //2 times for the beneficiary accounts[2], in total it should receives 3 Ethers
        await testament.addBeneficiary(accounts[2], {from: accounts[0], value:Web3Utils.toWei(new BN(1), "ether")});
        await testament.addBeneficiary(accounts[3], {from: accounts[0], value:Web3Utils.toWei(new BN(2), "ether")});
        await testament.addBeneficiary(accounts[4], {from: accounts[0], value:Web3Utils.toWei(new BN(3), "ether")});
        await testament.addBeneficiary(accounts[2], {from: accounts[0], value:Web3Utils.toWei(new BN(2), "ether")});

        let result = await testament.getBeneficiaries({from: accounts[0]}).catch((err) => {
            console.error("ERROR getBeneficiaries: " +err);
            return false;
        });

        //control event emitted are correct
        assert.equal(result[0].account, accounts[2], "ERROR - Not valid account in subscription");
        assert.equal(result[0].amount, Web3Utils.toWei(new BN(3), "ether"), "ERROR - Not valid amount in subscription");

        assert.equal(result[1].account, accounts[3], "ERROR - Not valid account in subscription");
        assert.equal(result[1].amount, Web3Utils.toWei(new BN(2), "ether"), "ERROR - Not valid amount in subscription");

        assert.equal(result[2].account, accounts[4], "ERROR - Not valid account in subscription");
        assert.equal(result[2].amount, Web3Utils.toWei(new BN(3), "ether"), "ERROR - Not valid amount in subscription");
    });
    it("renewSubscribe & controlValidSubscription Tests", async () => {
        //check accounts[1] instead of accounts[0] because it has no beneficiaries
        await truffleTestHelper.advanceTimeAndBlock(SECONDS_IN_A_DAY * 40);
        await testament.renewSubscribe({from: accounts[1]}).catch((err) => {
            console.error("ERROR renewSubscribe: " +err);
            return false;
        });
        //skip 61 days in the blockchain so the accounts[1]'s subscription shouldn't be subscribed anymore if renewSubscribe call wasn't there
        await truffleTestHelper.advanceTimeAndBlock(SECONDS_IN_A_DAY * 21);
        await testament.controlValidSubscription(accounts[1], {from: accounts[6]})
            //.then(assert(false) /* fail if doesn't return an error and then enters here in the "then" */)
            .catch((err) => {
                //not the cleanest way to do this
                assert.equal(err, "Error: Returned error: VM Exception while processing transaction: revert Subscribe still valid -- Reason given: Subscribe still valid.",
                    "ERROR - Subscription isn't valid anymore, error in the smart contract not occurred");
            });
    });
    it("activateTestaments Tests", async () => {
        //store the 3 beneficiaries' account balance for the comparison later
        let balance1 = await web3.eth.getBalance(accounts[2]);
        let balance2 = await web3.eth.getBalance(accounts[3]);
        let balance3 = await web3.eth.getBalance(accounts[4]);

        //skipped 61 days in the blockchain, then accounts[0] isn't subscribed anymore
        //3 events emitted:
        let result = await testament.controlValidSubscription(accounts[0], {from: accounts[6]}).catch((err) => {
            console.error("ERROR - controlValidSubscription on accounts[0]" + err);
            return false;
        });

        //result.logs[0].args get the first event emitted
        assert.equal(result.logs[0].args._from, accounts[0], 'ERROR EVENT 1 - LogTestamentTriggered, _from');
        assert.equal(result.logs[0].args._to, accounts[2], 'ERROR EVENT 1 - LogTestamentTriggered, _to');

        assert.equal(result.logs[1].args._from, accounts[0], 'ERROR EVENT 2 - LogTestamentTriggered, _from');
        assert.equal(result.logs[1].args._to, accounts[3], 'ERROR EVENT1 2 - LogTestamentTriggered, _to');

        assert.equal(result.logs[2].args._from, accounts[0], 'ERROR EVENT 3 - LogTestamentTriggered, _from');
        assert.equal(result.logs[2].args._to, accounts[4], 'ERROR EVENT 3 - LogTestamentTriggered, _to');

        //assert money received comparing their balance before and after
        let balanceUpdated1 = await web3.eth.getBalance(accounts[2]);
        let balanceUpdated2= await web3.eth.getBalance(accounts[3]);
        let balanceUpdated3 = await web3.eth.getBalance(accounts[4]);

        assert.equal(Number(balanceUpdated1), Number(Web3Utils.toWei(new BN(3), "ether")) + Number(balance1), 'ERROR EVENT 1 - LogTestamentTriggered, final balance not correct');
        assert.equal(Number(balanceUpdated2), Number(Web3Utils.toWei(new BN(2), "ether")) + Number(balance2), 'ERROR EVENT 2 - LogTestamentTriggered, final balance not correct');
        assert.equal(Number(balanceUpdated3), Number(Web3Utils.toWei(new BN(3), "ether")) + Number(balance3), 'ERROR EVENT 3 - LogTestamentTriggered, final balance not correct');

    });
    it("cleanMemory Tests", async () => {
        let result = await testament.isStored(accounts[0], {from: accounts[6]}).catch((err) => {
            console.error("ERROR - cleanMemory on accounts[0]" + err);
            return false;
        });
        //memory is clean if the value is zero
        assert.equal(result.words[0], 0, 'ERROR - cleanMemory');
    });
});
