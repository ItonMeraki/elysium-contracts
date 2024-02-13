// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.10;

import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "hardhat/console.sol";

interface IUserLicenses {
    enum VerificationPlan {
        Null,
        Special,
        Ambassador
    }

    function getUserPlan(
        address user
    ) external view returns (VerificationPlan plan);
}

/**
 * @title ReputationLicenses
 */
contract ReputationLicenses is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public token;
    IUserLicenses public verifier;

    StakingScheme[] public availableSchemes;
    // schemeId => schemeId
    mapping(uint256 => UserStake) public stakeRegistry;

    uint256 public totalStakes;
    // user => stakeId[]
    mapping(address => uint256[]) public userStakes;
    // user => nonce
    mapping(address => CountersUpgradeable.Counter) private _nonces;

    address public trustedSigner;
    address public penaltyIncomeVault;

    uint256 public constant MONTH = 2592000;
    uint256 public constant PAYOUT_FREQUENCY = MONTH;

    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    enum LicenseType {
        Unlicensed,
        Commercial,
        Verification
    }

    struct StakingScheme {
        LicenseType licenseType;
        IUserLicenses.VerificationPlan access;
        uint256 duration;
        uint256 tokenAmount;
        uint256 apr;
    }

    struct UserStake {
        address user;
        uint256 startTime;
        uint256 lastPayoutNumber;
        bool canceled;
        StakingScheme scheme;
        bytes32 locationId;
        string domainName;
    }

    event StakeCreated(uint256 indexed stakeId, address indexed user);
    event StakeCanceled(uint256 indexed stakeId, address indexed user, bool withPenalty);
    event RewardsClaimed(uint256 indexed stakeId, address indexed user, uint256 indexed payoutAmount);

    /**
     * @dev The constructor function initializes the contract with an ERC20 token and a verifier contract.
     * It also adds six staking schemes with different access, duration, token amount and APR.
     * @param token_ The address of the ERC20 token used for staking and rewards.
     * @param verifier_ The address of the verifier contract used for user verification.
     */
    function initialize(address token_, address verifier_) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        token = IERC20Upgradeable(token_);
        verifier = IUserLicenses(verifier_);
        addStakingScheme(
            StakingScheme({
                licenseType: LicenseType.Verification,
                access: IUserLicenses.VerificationPlan.Special,
                duration: 6 * MONTH,
                tokenAmount: 7000 ether,
                apr: 11 //11%
            })
        );
        addStakingScheme(
            StakingScheme({
                licenseType: LicenseType.Verification,
                access: IUserLicenses.VerificationPlan.Ambassador,
                duration: 6 * MONTH,
                tokenAmount: 7000 ether,
                apr: 11 //11%
            })
        );
        addStakingScheme(
            StakingScheme({
                licenseType: LicenseType.Verification,
                access: IUserLicenses.VerificationPlan.Special,
                duration: 12 * MONTH,
                tokenAmount: 13000 ether,
                apr: 19 //19%
            })
        );
        addStakingScheme(
            StakingScheme({
                licenseType: LicenseType.Verification,
                access: IUserLicenses.VerificationPlan.Ambassador,
                duration: 12 * MONTH,
                tokenAmount: 13000 ether,
                apr: 19 //19%
            })
        );
        addStakingScheme(
            StakingScheme({
                licenseType: LicenseType.Commercial,
                access: IUserLicenses.VerificationPlan.Ambassador,
                duration: 6 * MONTH,
                tokenAmount: 27000 ether,
                apr: 21 //21%
            })
        );
        addStakingScheme(
            StakingScheme({
                licenseType: LicenseType.Commercial,
                access: IUserLicenses.VerificationPlan.Ambassador,
                duration: 12 * MONTH,
                tokenAmount: 27000 ether,
                apr: 27 //27%
            })
        );
        addStakingScheme(
            StakingScheme({
                licenseType: LicenseType.Commercial,
                access: IUserLicenses.VerificationPlan.Ambassador,
                duration: 36 * MONTH,
                tokenAmount: 27000 ether,
                apr: 39 //39%
            })
        );
    }


    /**
     * @dev Removes the staking scheme with the given ID from the available schemes list.
     * Can only be called by the owner of the contract.
     * @param schemeId ID of the staking scheme to remove from the available schemes list.
     */
    function removeAvailableScheme(uint256 schemeId) external onlyOwner {
        availableSchemes[schemeId] = availableSchemes[
            availableSchemes.length - 1
        ];
        availableSchemes.pop();
    }

    /**
     * @notice Allows the owner to edit an existing available staking scheme.
     * @dev The staking scheme can only be edited if it already exists.
     * @param schemeId The ID of the staking scheme to edit.
     * @param access The access level for the staking scheme.
     * @param duration The duration of the staking scheme, in seconds.
     * @param tokenAmount The amount of tokens required to participate in the staking scheme.
     * @param apr The Annual Percentage Rate (APR) for the staking scheme, in percentage points.
     * @dev The duration must be a multiple of the payout frequency.
     * @dev The token amount and APR cannot be zero.
     * @dev Emits a StakingSchemeUpdated event.
     */
    function editAvailableStakingScheme(
        uint256 schemeId,
        IUserLicenses.VerificationPlan access,
        LicenseType licenseType,
        uint256 duration,
        uint256 tokenAmount,
        uint256 apr
    ) external onlyOwner {
        require(
            availableSchemes[schemeId].duration != 0,
            "Only existing schemes"
        );
        require(duration % PAYOUT_FREQUENCY == 0, "Invalid duration (null)");
        require(tokenAmount != 0, "Invalid token amount (null)");
        require(apr != 0, "Invalid apr (null)");
        availableSchemes[schemeId] = StakingScheme({
            licenseType: licenseType,
            access: access,
            duration: duration,
            tokenAmount: tokenAmount,
            apr: apr
        });
    }

    /**
     * @dev Allows a user to stake tokens according to a specified staking scheme.
     * @param schemeId The index of the staking scheme to use.
     * @param locationId A bytes32 identifier for the location associated with this stake.
     * @param v The recovery id of the signature.
     * @param r The first 32 bytes of the signature.
     * @param s The second 32 bytes of the signature.
     * Requirements:
     * - The signature must be valid and match the `trustedSigner` address.
     * - The user must have a verification plan that matches the access level of the specified staking scheme.
     * - The staking scheme must exist in the `availableSchemes` array.
     * - The duration of the staking scheme must be divisible by `PAYOUT_FREQUENCY`.
     * - The `tokenAmount` and `apr` values of the staking scheme must not be zero.
     * - The user must have approved the contract to transfer `tokenAmount` tokens on their behalf.
     * Effects:
     * - The specified amount of tokens will be transferred from the user to the contract.
     * - A new `UserStake` object will be created and added to the `userStakes` mapping.
     * - The `totalStakes` counter will be incremented.
     * Emits:
     * - `NewStake` event with the ID of the newly created stake and the user's address.
     */
    function stakeTokens(
        uint256 schemeId,
        bytes32 locationId,
        string memory domainName,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        bytes32 structHash = keccak256(
            abi.encodePacked(
                this.stakeTokens.selector,
                address(this),
                msg.sender,
                schemeId,
                locationId,
                domainName,
                _useNonce(msg.sender)
            )
        );

        address signer = ECDSAUpgradeable.recover(
            ECDSAUpgradeable.toEthSignedMessageHash(structHash),
            v,
            r,
            s
        );
        require(signer == trustedSigner, "Invalid signature");

        IUserLicenses.VerificationPlan userPlan = verifier.getUserPlan(
            msg.sender
        );
         
        require(
            userPlan == availableSchemes[schemeId].access,
            "Invalid verification plan"
        );
        uint256 amountToStake = availableSchemes[schemeId].tokenAmount;
        token.safeTransferFrom(msg.sender, address(this), amountToStake);
        stakeRegistry[totalStakes] = UserStake({
            user: msg.sender,
            startTime: block.timestamp,
            lastPayoutNumber: 0,
            canceled: false,
            scheme: availableSchemes[schemeId],
            locationId: locationId,
            domainName: domainName
        });
        userStakes[msg.sender].push(totalStakes);
        emit StakeCreated(totalStakes, msg.sender);
        totalStakes += 1;
    }

    /**
     * @dev Allows a user to claim rewards for a particular stake.
     * @param stakeId The ID of the stake to claim rewards for.
     * Requirements:
     * - The caller must be the user associated with the stake.
     * - The stake must not be canceled.
     * - The stake must not have already been fully paid out.
     * - The amount of tokens to be paid out must be greater than zero.
     * Effects:
     * - Transfers tokens from the contract to the user.
     */
    function claimRewards(uint256 stakeId) external nonReentrant {
        UserStake storage userStake = stakeRegistry[stakeId];
        require(msg.sender == userStake.user, "Invalid user");
        require(!userStake.canceled, "Canceled");
        uint256 payoutTotalNumber = userStake.scheme.duration / PAYOUT_FREQUENCY;
        uint256 payoutSingleAmount = countProfit(
            userStake.scheme.tokenAmount,
            userStake.scheme.apr
        ) / payoutTotalNumber;
        uint256 payoutNumberCurrent = (block.timestamp - userStake.startTime) /
            PAYOUT_FREQUENCY;
        require(
            userStake.lastPayoutNumber < payoutTotalNumber,
            "Already paid out"
        );
        if (payoutNumberCurrent > payoutTotalNumber)
            payoutNumberCurrent = payoutTotalNumber;
        uint256 payoutAmount = payoutSingleAmount *
            (payoutNumberCurrent - userStake.lastPayoutNumber);
        userStake.lastPayoutNumber = payoutNumberCurrent;
        if (payoutNumberCurrent == payoutTotalNumber)
            payoutAmount += userStake.scheme.tokenAmount;
        if (
            payoutNumberCurrent == payoutTotalNumber &&
            (payoutSingleAmount *
                payoutTotalNumber +
                userStake.scheme.tokenAmount) <
            ((userStake.scheme.tokenAmount * (100 + userStake.scheme.apr)) /
                100)
        ) {
            payoutAmount +=
                ((userStake.scheme.tokenAmount * (100 + userStake.scheme.apr)) /
                    100 -
                    userStake.scheme.tokenAmount) -
                (payoutSingleAmount * payoutTotalNumber);
        }
        token.safeTransfer(msg.sender, payoutAmount);
        emit RewardsClaimed(stakeId, msg.sender, payoutAmount);
    }

    /**
     * @dev Cancels a user stake.
     * @param stakeId The ID of the stake to cancel.
     * @param penaltyPercent The percentage of penalty to apply (0 for no penalty).
     * Requirements:
     * - The caller must have the `MODERATOR_ROLE`.
     */
    function cancelUserStake(uint256 stakeId, uint256 penaltyPercent) external {
        require(
            hasRole(MODERATOR_ROLE, msg.sender),
            "Caller is not a moderator"
        );
        stakeRegistry[stakeId].canceled = true;
        uint256 penaltyAmount = 0;

        if (penaltyPercent > 0) {
            penaltyAmount =
                (stakeRegistry[stakeId].scheme.tokenAmount * penaltyPercent) /
                100;
            token.safeTransfer(
                stakeRegistry[stakeId].user,
                stakeRegistry[stakeId].scheme.tokenAmount - penaltyAmount
            );
            token.safeTransfer(penaltyIncomeVault, penaltyAmount);
        } else {
            token.safeTransfer(
                stakeRegistry[stakeId].user,
                stakeRegistry[stakeId].scheme.tokenAmount
            );
        }
        emit StakeCanceled(
            stakeId,
            stakeRegistry[stakeId].user,
            penaltyPercent > 0
        );
    }

    /**
     * @dev Sets the trusted signer address.
     * @param newTrustedSigner The address of the new trusted signer.
     * Requirements:
     * - The caller must be the contract owner.
     */
    function setTrustedSigner(address newTrustedSigner) external onlyOwner {
        trustedSigner = newTrustedSigner;
    }

    /**
     * @dev Sets the address of the penalty income vault.
     * @param newPenaltyIncomeVault The address of the penalty income vault.
     */
    function setPenaltyIncomeVault(
        address newPenaltyIncomeVault
    ) external onlyOwner {
        penaltyIncomeVault = newPenaltyIncomeVault;
    }

    /**
     * @dev Returns all the available staking schemes
     * @return schemes An array of all available staking schemes
     */
    function getAllSchemes() external view returns (StakingScheme[] memory schemes) {
        return availableSchemes;
    }

    /**
     * @dev Returns all the stakes for a given user
     * @param user Address of the user
     * @return uint256 An array of stake IDs for the given user
     */
    function getAllUserStakes(address user) external view returns (uint256[] memory) {
        return userStakes[user];
    }

    /**
     * @dev Returns the details of a specific stake
     * @param stakeId ID of the stake
     * @return UserStake The details of the stake
     */
    function getStakeById(uint256 stakeId) external view returns (UserStake memory) {
        return stakeRegistry[stakeId];
    }

    /**
     * @dev Returns the current nonce for the given owner
     * @param owner Address of the owner
     * @return uint256 The current nonce for the given owner
     */
    function nonces(address owner) external view returns (uint256) {
        return _nonces[owner].current();
    }

    /**
     * @dev Adds a staking scheme.
     * @param scheme The staking scheme to add.
     * Requirements:
     * - The caller must be the contract owner.
     */
    function addStakingScheme(StakingScheme memory scheme) public onlyOwner {
        availableSchemes.push(scheme);
    }
    
    /**
     * @dev Increments and returns the current nonce for the given owner
     * @param owner Address of the owner
     * @return current The current nonce for the given owner
     */
    function _useNonce(address owner) private returns (uint256 current) {
        CountersUpgradeable.Counter storage nonce = _nonces[owner];
        current = nonce.current();
        nonce.increment();
    }

    /**
     * @dev Calculates the profit based on the staked amount and APR
     * @param stakedAmount The amount staked
     * @param apr The annual percentage rate
     * @return profit The profit based on the staked amount and APR
     */
    function countProfit(
        uint256 stakedAmount,
        uint256 apr
    ) private pure returns (uint256 profit) {
        require(stakedAmount >= 10, "Staked amount is too small");
        profit = (stakedAmount * apr) / 100;
        return profit;
    }
}
