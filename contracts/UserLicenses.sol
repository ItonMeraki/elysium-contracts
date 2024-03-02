// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.10;

import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


interface IElysiumERC20 { 
    function burn(uint256 tAmount) external; 
    function excludeFromFee(address account) external;
}

/**
 * @title UserLicenses
 */
contract UserLicenses is Initializable, AccessControlUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public token;

    uint256 public constant ELYS = 10 ** 18;

    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    // User => VerificationPlan
    mapping(address => VerificationPlan) public registry;

    VerificationScheme[3] public availableSchemes;

    enum VerificationPlan {
        Null,
        Special,
        Ambassador
    }

    struct VerificationScheme {
        VerificationPlan plan;
        uint256 tokenAmountRequired;
    }

    event Verified(address user, VerificationScheme scheme, string domainName );
    event VerificationCanceled(address user, VerificationScheme scheme);

    /**
     * @dev Initializes the contract with the specified token.
     * @param token_ The address of the ERC20 token contract.
     */
    function initialize(address token_) public initializer {
        __Context_init_unchained();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        token = IERC20Upgradeable(token_);
        availableSchemes[1] = VerificationScheme({
            plan: VerificationPlan.Special,
            tokenAmountRequired: 7000 * ELYS
        });
        availableSchemes[2] = VerificationScheme({
            plan: VerificationPlan.Ambassador,
            tokenAmountRequired: 250000 * ELYS
        });
    }

    /**
     * @dev Verifies the user's plan and burns the required tokens.
     * @param plan The verification plan.
     * @param domainName The domain name associated with the verification.
     */
    function verifyPlan(VerificationPlan plan, string memory domainName) external {
        require(registry[msg.sender] < plan, "Downgrade is not available");
        uint256 tokenAmountRequired = availableSchemes[uint256(plan)]
            .tokenAmountRequired;
        if (
            registry[msg.sender] != VerificationPlan.Null &&
            registry[msg.sender] != plan
        )
            tokenAmountRequired -= availableSchemes[
                uint256(registry[msg.sender])
            ].tokenAmountRequired;
            
        token.safeTransferFrom(msg.sender, address(this), tokenAmountRequired);
        IElysiumERC20(address(token)).burn(tokenAmountRequired);
        registry[msg.sender] = plan;
        IElysiumERC20(address(token)).excludeFromFee(msg.sender);
        emit Verified(msg.sender, availableSchemes[uint256(plan)], domainName);
    }

    /**
     * @dev Cancels user verification by a moderator.
     * @param user The address of the user to cancel verification for.
     */
    function cancelUserVerification(address user) external {
        require(
            hasRole(MODERATOR_ROLE, msg.sender),
            "Caller is not a moderator"
        );
        emit VerificationCanceled(
            user,
            availableSchemes[uint256(registry[user])]
        );
        registry[user] = VerificationPlan.Null;
    }

    /**
     * @dev Edits the verification plan with the specified parameters.
     * @param plan The verification plan to edit.
     * @param tokenAmountRequired The required token amount for the plan.
     */
    function editVerificationPlan(
        VerificationPlan plan,
        uint256 tokenAmountRequired
    ) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(
            plan != VerificationPlan.Null,
            "Default plan is not available for edit"
        );
        availableSchemes[uint256(plan)] = VerificationScheme({
            plan: plan,
            tokenAmountRequired: tokenAmountRequired
        });
    }

    /**
     * @dev Gets the verification plan for the specified user.
     * @param user The address of the user.
     * @return plan The user's verification plan.
     */
    function getUserPlan(
        address user
    ) external view returns (VerificationPlan plan) {
        return registry[user];
    }

    /**
     * @dev Gets all available verification schemes.
     * @return schemes An array containing all available verification schemes.
     */
    function getAllVerificationSchemes()
        external
        view
        returns (VerificationScheme[3] memory schemes)
    {
        return availableSchemes;
    }

    /**
     * @dev Gets the verification scheme at the specified index.
     * @param index The index of the verification scheme.
     * @return scheme The verification scheme at the specified index.
     */
    function getVerificationSchemeByIndex(
        uint256 index
    ) external view returns (VerificationScheme memory scheme) {
        return availableSchemes[index];
    }
}
