// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.10;

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IElysiumERC20 {
    function burn(uint256 tAmount) external;
}

/**
 * @title UserLicenses
 */
contract UserLicenses is Ownable, AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    IERC20 public token;

    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    // User => VerificationPlan
    mapping(address => VerificationPlan) public registry;

    VerificationScheme[3] public availableSchemes;

    enum VerificationPlan {
        Null,
        Standart,
        Special,
        Ambassador
    }

    struct VerificationScheme {
        VerificationPlan plan;
        uint256 tokenAmountRequired;
    }

    event Verified(address user, VerificationScheme scheme);
    event VerificationCanceled(address user, VerificationScheme scheme);

    constructor(address token_) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        token = IERC20(token_);
        availableSchemes[0] = VerificationScheme({
            plan: VerificationPlan.Standart,
            tokenAmountRequired: 3000 ether
        });
        availableSchemes[1] = VerificationScheme({
            plan: VerificationPlan.Special,
            tokenAmountRequired: 77777 ether
        });
        availableSchemes[2] = VerificationScheme({
            plan: VerificationPlan.Ambassador,
            tokenAmountRequired: 250000 ether
        });
    }

    function verifyPlan(VerificationPlan plan) external {
        require(registry[msg.sender] < plan, "Downgrade is not available");
        uint256 tokenAmountRequired = availableSchemes[uint256(plan) - 1]
            .tokenAmountRequired;
        if (
            registry[msg.sender] != VerificationPlan.Null &&
            registry[msg.sender] != plan
        )
            tokenAmountRequired -= availableSchemes[
                uint256(registry[msg.sender]) - 1
            ].tokenAmountRequired;
        token.safeTransferFrom(msg.sender, address(this), tokenAmountRequired);
        IElysiumERC20(address(token)).burn(tokenAmountRequired);
        registry[msg.sender] = plan;
        emit Verified(msg.sender, availableSchemes[uint256(plan) - 1]);
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
