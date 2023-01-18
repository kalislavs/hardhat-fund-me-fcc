// SPDX-License-Identifier: MIT
//pragma
pragma solidity ^0.8.8;
// imports
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";
import "hardhat/console.sol";



// error codes
error FundMe__NotOwner();

//interfaces, libraries, contracts

/** @title A contract for crowd funding
 * @author Adam Kalivoda
 * @notice this contract is to demo a sample funding contract
 * @dev this implements price feeds as our library
 */
contract FundMe {
    // type declarations
    using PriceConverter for uint256;

    // state variables
    mapping(address => uint256) private s_addressToAmountFunded;
    address[] private s_funders;
    address private /* immutable */ i_owner;
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18;
    AggregatorV3Interface private s_priceFeed;

    // events, modifiers
    modifier onlyOwner {
        // require(msg.sender == owner);
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }
    
    // functions
    /// constructor
    /// receive
    /// fallback
    /// external
    /// public
    /// internal 
    /// private
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }
    fallback() external payable {
        fund();
    }

    /** 
    * @notice this function funds the contract
    * @dev this implements price feeds as our library
    */
    function fund() public payable {
        require(msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD, "You need to spend more ETH!");
        // require(PriceConverter.getConversionRate(msg.value) >= MINIMUM_USD, "You need to spend more ETH!");
        s_addressToAmountFunded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }
    
    
    function withdraw() public onlyOwner {
        for (uint256 funderIndex=0; funderIndex < s_funders.length; funderIndex++){
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
            
        }
        s_funders = new address[](0);
        

        (bool callSuccess, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(callSuccess, "Call failed");
    }  

    function cheaperWithdraw() public payable onlyOwner{
        address[] memory funders = s_funders;
        // mappings can't be i  memory
        for(uint256 funderIndex = 0; funderIndex < funders.length; funderIndex++) {
            address funder = funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        (bool success, ) = i_owner.call{value: address(this).balance}("");
        require(success, "Call failed");
    }
    function getOwner() public view returns(address){
        return i_owner;
    }
    function getFunder(uint256 index) public view returns(address){
        return s_funders[index];
    }
     function getAddressToAmountFunded(address funder) public view returns(uint256){
        return s_addressToAmountFunded[funder];
     }
     function getPriceFeed() public view returns(AggregatorV3Interface){
        return s_priceFeed;
     }
}

// Concepts we didn't cover yet (will cover in later sections)
// 1. Enum
// 2. Events
// 3. Try / Catch
// 4. Function Selector
// 5. abi.encode / decode
// 6. Hash with keccak256
// 7. Yul / Assembly
