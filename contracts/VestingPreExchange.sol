// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.10;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title VestingPreExchange
 */
contract VestingPreExchange is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public token;
    CliffList[6] public cliffList;

    uint256 public preExchangeStartTime;
    uint256 public totalVestedAmount = 1200000000 * ELYS;
    uint256 public totalAvailableAmount = totalVestedAmount;

    uint256 public constant MONTH = 2592000;
    uint256 public constant YEAR = 31536000;
    uint256 public constant ELYS = 10 ** 18;

    address public trustedWorker;

    mapping(address => IndividualVesting) individualSchemes;

    struct IndividualVesting {
        // uint256 startTime;
        uint256 totalAmount;
        uint256 availableAmount;
        IndividualCliffs[6] cliffs;
    }

    struct IndividualCliffs {
        uint256 startTime;
        uint256 amount;
        bool processed;
    }

    struct CliffList {
        uint256 timeShift;
        uint256 percent;
    }

    event TokensClaimed(address indexed receiver, uint256 amount);

    /**
     * @dev Constructor function to initialize the contract with the specified token address.
     * @param token_ The address of the ERC20 token that this contract will interact with.
     */
    constructor(address token_) {
        token = IERC20(token_);
    }

    /**
     * @dev Initializes the contract with the specified pre-exchange start time and vesting cliff list.
     * @param preExchangeTime The timestamp indicating the start time of the pre-exchange period.
     * @notice This function can only be called by the contract owner.
     * @notice The total vested amount of tokens will be transferred from the owner to this contract.
     * @notice The cliff list defines the percentage of tokens that can be released at each cliff time.
     * @notice The cliff times are defined as multiples of 1 month, starting from the pre-exchange start time.
     * @notice The sum of all cliff percentages must equal 100%.
     * @notice The pre-exchange start time must be in the future, otherwise the function will revert.
     */
    function init(uint256 preExchangeTime) external onlyOwner {
        preExchangeStartTime = preExchangeTime;
        token.safeTransferFrom(msg.sender, address(this), totalVestedAmount);
        require(block.timestamp < preExchangeStartTime, "Invalid start time");
        cliffList[0] = CliffList({
            timeShift: preExchangeStartTime,
            percent: 2500
        }); //25%
        cliffList[1] = CliffList({timeShift: (4 * MONTH), percent: 1500}); //15%
        cliffList[2] = CliffList({timeShift: (8 * MONTH), percent: 1500}); //15%
        cliffList[3] = CliffList({timeShift: (12 * MONTH), percent: 1500}); //15%
        cliffList[4] = CliffList({timeShift: (16 * MONTH), percent: 1500}); //15%
        cliffList[5] = CliffList({timeShift: (20 * MONTH), percent: 1500}); //15%
    }

    /**
     * @dev Adds a user to the vesting scheme with the specified vesting amount.
     * @param user The address of the user to be added to the vesting scheme.
     * @param vestedAmount The total amount of tokens that will be vested for the user.
     * @notice This function can only be called by the contract owner.
     * @notice The total available amount of tokens must be greater than or equal to the vested amount, otherwise the function will revert.
     * @notice The vesting scheme for the user will be initialized with the pre-exchange start time and the cliff list.
     * @notice The cliff list defines the percentage of tokens that can be released at each cliff time.
     * @notice The cliff times are defined as multiples of 1 month, starting from the pre-exchange start time.
     * @notice The sum of all cliff percentages must equal 100%.
     * @notice If the current time is before the pre-exchange start time, the first cliff will be set to the pre-exchange start time.
     * @notice The function will release the first cliff of tokens to the user if the current time is after the pre-exchange start time.
     * @notice If the total amount of tokens that can be released at all cliff times is less than the vested amount, the difference will be added to the last cliff time.
     * @notice The total vested amount must equal the sum of all vested amounts at each cliff time, otherwise the function will revert.
     */
    function addUser(address user, uint256 vestedAmount) external onlyOwner {
        require(
            totalAvailableAmount >= vestedAmount,
            "Insufficient remaming amount"
        );
        uint256 startTime;
        if (block.timestamp <= preExchangeStartTime) {
            startTime = preExchangeStartTime;
        } else {
            startTime = block.timestamp;
        }
        individualSchemes[user].totalAmount = vestedAmount;
        individualSchemes[user].cliffs[0] = IndividualCliffs({
            startTime: startTime,
            amount: getPercentValue(vestedAmount, cliffList[0].percent),
            processed: false
        }); //25%
        individualSchemes[user].cliffs[1] = IndividualCliffs({
            startTime: startTime + cliffList[1].timeShift,
            amount: getPercentValue(vestedAmount, cliffList[1].percent),
            processed: false
        }); //15%
        individualSchemes[user].cliffs[2] = IndividualCliffs({
            startTime: startTime + cliffList[2].timeShift,
            amount: getPercentValue(vestedAmount, cliffList[2].percent),
            processed: false
        }); //15%
        individualSchemes[user].cliffs[3] = IndividualCliffs({
            startTime: startTime + cliffList[3].timeShift,
            amount: getPercentValue(vestedAmount, cliffList[3].percent),
            processed: false
        }); //15%
        individualSchemes[user].cliffs[4] = IndividualCliffs({
            startTime: startTime + cliffList[4].timeShift,
            amount: getPercentValue(vestedAmount, cliffList[4].percent),
            processed: false
        }); //15%
        individualSchemes[user].cliffs[5] = IndividualCliffs({
            startTime: startTime + cliffList[5].timeShift,
            amount: getPercentValue(vestedAmount, cliffList[5].percent),
            processed: false
        }); //15%

        uint256 calculatedTotalVested;
        for (uint256 i = 0; i < cliffList.length; i++) {
            calculatedTotalVested += individualSchemes[user].cliffs[i].amount;
        }
        if (calculatedTotalVested < vestedAmount)
            individualSchemes[user].cliffs[5].amount +=
                vestedAmount -
                calculatedTotalVested;
        require(
            calculatedTotalVested == vestedAmount,
            "Invalid total vested amount"
        );

        if (block.timestamp >= preExchangeStartTime) {
            claimTokens(user, individualSchemes[user].cliffs[0].amount);
        }
    }

    /**
     * @dev Function to claim vested tokens for a specified receiver.
     * Can only be called by the trusted worker, original receiver, or contract owner.
     * @param receiver Address of the receiver of the vested tokens
     * @param amount Amount of vested tokens to be claimed
     */
    function claimTokens(address receiver, uint256 amount) public nonReentrant {
        require(
            msg.sender == trustedWorker ||
                msg.sender == receiver ||
                msg.sender == this.owner(),
            "Only the trusted address or the receiver can call this function"
        );

        for (uint256 i = 0; i < cliffList.length; i++) {
            if (
                !individualSchemes[receiver].cliffs[i].processed &&
                getCurrentTime() >=
                individualSchemes[receiver].cliffs[i].startTime
            ) {
                individualSchemes[receiver]
                    .availableAmount += individualSchemes[receiver]
                    .cliffs[i]
                    .amount;
                individualSchemes[receiver].cliffs[i].processed = true;
            }
        }

        require(
            individualSchemes[receiver].availableAmount - amount >= 0,
            "Claimed amount is not available"
        );

        individualSchemes[receiver].availableAmount -= amount;
        totalAvailableAmount -= amount;
        token.safeTransfer(receiver, amount);

        emit TokensClaimed(receiver, amount);
    }

    /**
     * @dev Transfers all remaining tokens to the specified receiver address.
     * @param receiver The address to which the remaining tokens will be transferred.
     * Requirements:
     * - Only the contract owner can call this function.
     * - The current block timestamp must be greater than or equal to the preExchangeStartTime plus one year.
     * - There must be remaining tokens to transfer.
     */
    function claimAllRemainig(address receiver) external onlyOwner {
        require(block.timestamp >= preExchangeStartTime + YEAR, "Invalid time");
        require(totalAvailableAmount > 0, "Nothing left");
        token.safeTransfer(receiver, totalAvailableAmount);
    }

    /**
     * @dev Sets a new trusted worker address that can call the claimTokens function on behalf of users.
     * @param newTrustedWorker The address of the new trusted worker.
     */
    function setTrustedWorker(address newTrustedWorker) external onlyOwner {
        trustedWorker = newTrustedWorker;
    }

    /**
     * @dev Retrieves the vesting scheme of an individual user.
     * @param user The address of the user to retrieve the vesting scheme for.
     * @return IndividualVesting A struct containing the vesting scheme for the user.
     */
    function getIndividualVestingScheme(
        address user
    ) external view returns (IndividualVesting memory) {
        return individualSchemes[user];
    }

    /**
     * @dev Returns the current timestamp.
     * @return The current timestamp.
     */
    function getCurrentTime() private view returns (uint256) {
        return block.timestamp;
    }

    /**
     * @dev Calculates the percentage of a given amount.
     * @param totalAmount The total amount.
     * @param basePercent The percentage to calculate.
     * @return percentAmount The calculated percentage of the given amount.
     */
    function getPercentValue(
        uint256 totalAmount,
        uint256 basePercent
    ) private pure returns (uint256 percentAmount) {
        require(totalAmount >= 10, "Amount is too small");
        percentAmount = (totalAmount * basePercent) / 10000;
    }
}
