// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

//CONTRACT: it lets ETH addresses to subscribe and deposit funds associated to other accounts (beneficiaries).
//    At least 1 time each 60 days (can be changed) the subscribed account must renew its subscription otherwise its funds are automatically released
//    to their respective beneficiaries.
//
//EXAMPLE: Mary have two sons: Frank and John. Mary deposits on the contract 30 ETH associated to John's address and 15 ETH associated to Frank's address.
//    Mary passed away (Sadge) and after 60 days her last renew check, her funds are unlocked. If someone (eventually one of her sons) triggers the controlValidSubscription
//    function associated to her address, Mary's sons will receive the funds deposited by their mother when she was alive.

//To IMPLEMENT in future:
// 1- check space optimization over variables
// 2- check fees control over the withdraws and funds release
// 3 - unit testing
// 4 - integration testing
contract Testament {

  uint8 constant MAX_BENEF = 3; //max number of beneficiaries for each subscribed account
  uint constant MAX_DAYS = 60; //max number of days since the last renew

  struct Beneficiary{
    address payable account;
    int amount;
  }

  mapping(address => Beneficiary[MAX_BENEF]) testaments;
  mapping(address => uint8) public isStored; //uint8 is 1 if the address already have been registered, 0 otherwise
  mapping(address => uint) lastChecks; //date of the last check for each account

  //The indexed parameters for logged events will allow you to search for these events using the indexed parameters as filters.
  event LogAccountSubscribed(address _address, uint time);
  event LogAccountUnsubscribed(address _address, uint time);
  event LogTestamentTriggered(address _from, address _to, int _value, uint time);


  modifier onlyRegistered(){
    require(isStored[msg.sender] == 1, "The Sender Account is not registered");
    _;
  }

  address payable ownerAddress;
  constructor(){
    ownerAddress = payable(msg.sender);
  }

  function register() public {
    require(isStored[msg.sender] == 0, "The Account is already registered");
    isStored[msg.sender] = 1;
    lastChecks[msg.sender] = block.timestamp;
    for(uint8 i = 0; i < MAX_BENEF; i++){ //set all amount of beneficiaries at -1 to indicate that are alla empty
      testaments[msg.sender][i].amount = -1;
    }
    emit LogAccountSubscribed(msg.sender, block.timestamp);
  }

  function addBeneficiary(address beneficiary) public payable onlyRegistered{
    int8 addressFound = -1;
    int8 emptySpotFound = -1;
    for(uint8 j = 0; j < MAX_BENEF && addressFound == -1; j++){
      if(testaments[msg.sender][j].account == beneficiary){
        addressFound = int8(j);
      }
      if(testaments[msg.sender][j].amount == -1 && emptySpotFound == -1){
        emptySpotFound = int8(j);
      }
    }
    if(addressFound > -1){
      testaments[msg.sender][uint8(addressFound)].amount = testaments[msg.sender][uint8(addressFound)].amount + int(msg.value);
    } else {
      if(emptySpotFound > -1){
        testaments[msg.sender][uint8(emptySpotFound)].account = payable(beneficiary);
        testaments[msg.sender][uint8(emptySpotFound)].amount =  int(msg.value);
      } else {
        //return error because there isn't enough space
        revert("No slots avaible for a new Beneficiary");
      }
    }
  }
  function getBeneficiaries() public onlyRegistered view returns (Beneficiary[3] memory) {
    return [testaments[msg.sender][0],testaments[msg.sender][1],testaments[msg.sender][2]];
  }

  function sendViaCall(address _from, address _to, int _value) private {
    // Call returns a boolean value indicating success or failure.
    //<address payable>.send(uint256 amount) returns (bool):
    (bool sent, ) = _to.call{value:uint(_value)}("");
    require(sent, "Failed to send Ether");
    emit LogTestamentTriggered(_from, _to, _value, block.timestamp);
  }

  function removeBeneficiary(address _beneficiary) public payable onlyRegistered{
    bool addressFound = false;
    for(uint8 j = 0; j < MAX_BENEF && !addressFound; j++){
      if(testaments[msg.sender][j].account == _beneficiary && testaments[msg.sender][j].amount != -1){
        addressFound = true;
        sendViaCall(payable(testaments[msg.sender][j].account), payable(msg.sender), testaments[msg.sender][j].amount); //send back the amount deposited
        testaments[msg.sender][j].amount = -1; //set the cell as available
      }
    }
    require(addressFound, "The selected beneficiary has not be found");
  }


  function removeAllBeneficiaries() public onlyRegistered{
    for(uint8 j = 0; j < MAX_BENEF; j++){
      if(testaments[msg.sender][j].amount > 0){
        sendViaCall(payable(address(this)), payable(msg.sender), testaments[msg.sender][j].amount); //send back the amount deposited
        testaments[msg.sender][j].amount = -1; //set the cell as avaible
      }
    }
  }

  function activateTestaments(address _toCheck) private{
    for(uint8 j = 0; j < MAX_BENEF; j++){
      if(testaments[_toCheck][j].amount > 0){
        sendViaCall(_toCheck, testaments[_toCheck][j].account, testaments[_toCheck][j].amount);
      }
    }
  }

  function renewSubscribe() public onlyRegistered{
    lastChecks[msg.sender] = block.timestamp;
  }

  function unsubscribe() public onlyRegistered{
    removeAllBeneficiaries();
    cleanMemory(msg.sender);
    emit LogAccountUnsubscribed(msg.sender, block.timestamp);
  }

  function cleanMemory(address _toRemove) private{
    //reset of respective cells after setting their values to zero
    lastChecks[_toRemove] = 0;
    isStored[_toRemove] = 0;
    delete lastChecks[_toRemove];
    delete isStored[_toRemove];
    delete testaments[_toRemove];
    emit LogAccountUnsubscribed(_toRemove, block.timestamp);
  }

  function controlValidSubscription(address _toCheck) public {
    uint maxDaysInSeconds = MAX_DAYS * 60 * 60 * 24;
    if(block.timestamp > lastChecks[_toCheck] + maxDaysInSeconds){ //days can't be applied to MAX_DAYS for some reason, its replaced with 60*60*24 seconds= 1 day
      //activate all its testaments promises and then delete it
      activateTestaments(_toCheck);
      cleanMemory(_toCheck);
    }else{
      revert("Subscribe still valid");
    }
  }
}
