// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JobEscrow.sol";

/**
 * @title JobFactory
 * @notice Factory that deploys JobEscrow instances for Arc AgentMarket.
 * @dev Deployed on Arc Testnet (Chain ID: 5042002)
 */
contract JobFactory {

    struct JobRecord {
        address escrowAddress;
        address employer;
        string  title;
        string  category;
        uint256 escrowAmount;
        uint256 createdAt;
        bool    active;
    }

    address public owner;
    address public usdcToken;
    address public agentRegistry;
    address public feeRecipient;
    uint256 public platformFee;
    uint256 public jobCount;

    mapping(uint256 => JobRecord)  public jobs;
    mapping(address => uint256[])  public employerJobs;
    address[] public allEscrows;

    event JobCreated(
        uint256 indexed jobId,
        address indexed escrow,
        address indexed employer,
        string  title,
        string  category,
        uint256 escrowAmount,
        uint256 deadline,
        uint256 timestamp
    );

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    modifier onlyOwner() {
        require(msg.sender == owner, "JobFactory: not owner");
        _;
    }

    constructor(
        address _usdcToken,
        address _agentRegistry,
        address _feeRecipient,
        uint256 _platformFee
    ) {
        owner         = msg.sender;
        usdcToken     = _usdcToken;
        agentRegistry = _agentRegistry;
        feeRecipient  = _feeRecipient;
        platformFee   = _platformFee;
    }

    function createJob(
        string calldata _title,
        string calldata _description,
        string calldata _category,
        uint256 _escrowAmount,
        uint256 _deadlineHours
    ) external returns (address escrow, uint256 jobId) {
        require(bytes(_title).length > 0, "JobFactory: title required");
        require(_escrowAmount > 0,        "JobFactory: escrow required");
        require(_deadlineHours >= 1,      "JobFactory: min 1h deadline");
        require(_deadlineHours <= 720,    "JobFactory: max 30d deadline");

        JobEscrow newEscrow = new JobEscrow(
            msg.sender,
            usdcToken,
            _title,
            _description,
            _category,
            _escrowAmount,
            _deadlineHours,
            platformFee,
            feeRecipient
        );

        escrow = address(newEscrow);
        jobId  = jobCount++;

        jobs[jobId] = JobRecord({
            escrowAddress: escrow,
            employer:      msg.sender,
            title:         _title,
            category:      _category,
            escrowAmount:  _escrowAmount,
            createdAt:     block.timestamp,
            active:        true
        });

        employerJobs[msg.sender].push(jobId);
        allEscrows.push(escrow);

        emit JobCreated(
            jobId, escrow, msg.sender,
            _title, _category, _escrowAmount,
            block.timestamp + (_deadlineHours * 1 hours),
            block.timestamp
        );

        return (escrow, jobId);
    }

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "JobFactory: max 5%");
        emit PlatformFeeUpdated(platformFee, _fee);
        platformFee = _fee;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        feeRecipient = _recipient;
    }

    function setAgentRegistry(address _registry) external onlyOwner {
        agentRegistry = _registry;
    }

    function getJob(uint256 _jobId) external view returns (JobRecord memory) {
        return jobs[_jobId];
    }

    function getEmployerJobs(address _employer) external view returns (uint256[] memory) {
        return employerJobs[_employer];
    }

    function getAllEscrows() external view returns (address[] memory) {
        return allEscrows;
    }

    function getJobCount() external view returns (uint256) {
        return jobCount;
    }
}
