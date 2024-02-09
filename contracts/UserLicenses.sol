// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.10;

import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


interface IElysiumERC20 { function burn(uint256 tAmount) external; }

/**
 * @title UserLicenses
 */
contract UserLicenses is Initializable, OwnableUpgradeable, AccessControlUpgradeable {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    IERC20Upgradeable public token;

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

    function initialize(address token_) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        token = IERC20Upgradeable(token_);
        availableSchemes[1] = VerificationScheme({
            plan: VerificationPlan.Special,
            tokenAmountRequired: 7000 ether
        });
        availableSchemes[2] = VerificationScheme({
            plan: VerificationPlan.Ambassador,
            tokenAmountRequired: 250000 ether
        });
    }

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
        emit Verified(msg.sender, availableSchemes[uint256(plan) - 1], domainName);
    }

    function cancelUserVerification(address user) external {
        require(
            hasRole(MODERATOR_ROLE, msg.sender),
            "Caller is not a moderator"
        );
        emit VerificationCanceled(
            user,
            availableSchemes[uint256(registry[user]) - 1]
        );
        registry[user] = VerificationPlan.Null;
        // token.safeTransfer(user, tokenAmountRequired);
        //TODO transfer tokens??? where?
    }

    function editVerificationPlan(
        VerificationPlan plan,
        uint256 tokenAmountRequired
    ) external onlyOwner {
        require(
            plan != VerificationPlan.Null,
            "Default plan is not available for edit"
        );
        availableSchemes[uint256(plan)] = VerificationScheme({
            plan: plan,
            tokenAmountRequired: tokenAmountRequired
        });
    }

    function getUserPlan(
        address user
    ) external view returns (VerificationPlan plan) {
        return registry[user];
    }

    function getAllVerificationSchemes()
        external
        view
        returns (VerificationScheme[3] memory schemes)
    {
        return availableSchemes;
    }

    function getVerificationSchemeByIndex(
        uint256 index
    ) external view returns (VerificationScheme memory scheme) {
        return availableSchemes[index];
    }
}
