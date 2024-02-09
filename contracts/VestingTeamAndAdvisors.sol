// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.10;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title VestingTeamAndAdvisors
 * @dev A contract that implements vesting schedule for team and advisors of a project.
 */
contract VestingTeamAndAdvisors is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev The token being vested.
     */
    IERC20 public token;

    /**
     * @dev The address of the beneficiary (team/advisors).
     */
    address public beneficiary;

    /**
     * @dev The timestamp of TGE (Token Generation Event) start time.
     */
    uint256 public tgeStartTime;

    /**
     * @dev The total amount of tokens that will be vested.
     */
    uint256 public constant totalVestedAmount = 750000000 ether;

    /**
     * @dev The total amount of tokens that are available for claim.
     */
    uint256 public totalAvailableAmount;

    /**
     * @dev The duration of a month in seconds.
     */
    uint256 public constant MONTH = 2592000;

    /**
     * @dev The duration of a year in seconds.
     */
    uint256 public constant YEAR = 31536000;

    /**
     * @dev A list of cliffs that defines the vesting schedule.
     */
    struct CliffList {
        uint256 startTime;
        uint256 amount;
        bool processed;
    }
    CliffList[6] public cliff;

    /**
     * @dev Emitted when tokens are claimed.
     * @param receiver The address of the receiver of claimed tokens.
     * @param amount The amount of tokens claimed.
     */
    event TokensClaimed(address receiver, uint256 amount);

    /**
     * @dev Initializes the contract by setting the TGE start time and beneficiary address, and transferring the total vested amount of tokens to this contract.
     * @param tgeTime The timestamp of TGE start time.
     * @param receiver The address of the beneficiary (team/advisors).
     */
    function init(uint256 tgeTime, address receiver) external onlyOwner {
        tgeStartTime = tgeTime;
        beneficiary = receiver;
        token.safeTransferFrom(msg.sender, address(this), totalVestedAmount);
        require(block.timestamp < tgeStartTime, "Invalid start time");
        cliff[0] = CliffList({
            startTime: tgeStartTime + YEAR,
            amount: 225000000 ether,
            processed: false
        }); //30%
        cliff[1] = CliffList({
            startTime: tgeStartTime + YEAR + (5 * MONTH),
            amount: 75000000 ether,
            processed: false
        }); //10%
        cliff[2] = CliffList({
            startTime: tgeStartTime + (2 * YEAR),
            amount: 75000000 ether,
            processed: false
        }); //10%
        cliff[3] = CliffList({
            startTime: tgeStartTime + (2 * YEAR) + (5 * MONTH),
            amount: 112500000 ether,
            processed: false
        }); //15%
        cliff[4] = CliffList({
            startTime: tgeStartTime + (3 * YEAR),
            amount: 112500000 ether,
            processed: false
        }); //15%
        cliff[5] = CliffList({
            startTime: tgeStartTime + (3 * YEAR) + (5 * MONTH),
            amount: 150000000 ether,
            processed: false
        }); //20%

        uint256 calculatedTotalVested;
        for (uint256 i = 0; i < cliff.length; i++) {
            calculatedTotalVested += cliff[i].amount;
        }
        require(
            calculatedTotalVested == totalVestedAmount,
            "Invalid total vested amount"
        );
    }

    /**
     * @dev Constructor function for initializing the contract state variables.
     * @param token_ The address of the ERC20 token contract.
     */
    constructor(address token_) {
        token = IERC20(token_);
    }

    /**
     * @dev Function to claim tokens by the beneficiary.
     * The tokens can only be claimed if the current time is after the cliff start time
     * and the claimed amount is available.
     * @param receiver The address of the receiver of the tokens.
     * @param amount The amount of tokens to be claimed.
     */
    function claimTokens(
        address receiver,
        uint256 amount
    ) external nonReentrant {
        require(msg.sender == beneficiary, "Only beneficiary");

        for (uint256 i = 0; i < cliff.length; i++) {
            if (!cliff[i].processed && getCurrentTime() >= cliff[i].startTime) {
                totalAvailableAmount += cliff[i].amount;
                cliff[i].processed = true;
            }
        }
        require(
            totalAvailableAmount - amount >= 0,
            "Claimed amount is not available"
        );
        totalAvailableAmount -= amount;
        token.safeTransfer(receiver, amount);
        emit TokensClaimed(receiver, amount);
    }

    /**
     * @dev Set the address of the beneficiary.
     * @param newBeneficiary The address of the beneficiary to be set.
     */
    function setBeneficiary(address newBeneficiary) public onlyOwner {
        beneficiary = newBeneficiary;
    }

    /**
     * @dev Internal function to get the current time.
     * @return uint256 The current timestamp.
     */
    function getCurrentTime() private view returns (uint256) {
        return block.timestamp;
    }
}
