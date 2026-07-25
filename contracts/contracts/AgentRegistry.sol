// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentRegistry
 * @notice ERC-8004 inspired onchain identity registry for AI agents on Arc Network.
 * @dev Deployed on Arc Testnet (Chain ID: 5042002)
 */
contract AgentRegistry {

    struct Agent {
        address owner;
        string  name;
        string  specialty;
        string  metadataURI;
        uint256 registeredAt;
        uint256 jobsCompleted;
        uint256 totalEarned;
        uint256 reputationScore;
        bool    active;
        bool    verified;
    }

    address public owner;
    uint256 public agentCount;

    mapping(address => Agent)   public agents;
    mapping(address => bool)    public isRegistered;
    mapping(string  => address) public nameToAgent;
    address[] public agentList;

    event AgentRegistered(address indexed agent, string name, string specialty, uint256 timestamp);
    event AgentVerified(address indexed agent, bool verified);
    event ReputationUpdated(address indexed agent, uint256 oldScore, uint256 newScore);
    event JobRecorded(address indexed agent, uint256 jobsCompleted, uint256 totalEarned);

    modifier onlyOwner() {
        require(msg.sender == owner, "AgentRegistry: not owner");
        _;
    }

    modifier onlyRegistered() {
        require(isRegistered[msg.sender], "AgentRegistry: not registered");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerAgent(
        string calldata _name,
        string calldata _specialty,
        string calldata _metadataURI
    ) external {
        require(!isRegistered[msg.sender], "AgentRegistry: already registered");
        require(bytes(_name).length > 0, "AgentRegistry: name required");
        require(nameToAgent[_name] == address(0), "AgentRegistry: name taken");

        agents[msg.sender] = Agent({
            owner:           msg.sender,
            name:            _name,
            specialty:       _specialty,
            metadataURI:     _metadataURI,
            registeredAt:    block.timestamp,
            jobsCompleted:   0,
            totalEarned:     0,
            reputationScore: 500,
            active:          true,
            verified:        false
        });

        isRegistered[msg.sender]  = true;
        nameToAgent[_name]        = msg.sender;
        agentList.push(msg.sender);
        agentCount++;

        emit AgentRegistered(msg.sender, _name, _specialty, block.timestamp);
    }

    function updateMetadata(string calldata _metadataURI) external onlyRegistered {
        agents[msg.sender].metadataURI = _metadataURI;
    }

    function recordJobCompletion(
        address _agent,
        uint256 _amountEarned,
        uint256 _reputationDelta
    ) external onlyOwner {
        require(isRegistered[_agent], "AgentRegistry: agent not found");
        Agent storage a = agents[_agent];
        a.jobsCompleted++;
        a.totalEarned += _amountEarned;
        uint256 oldScore = a.reputationScore;
        a.reputationScore = (a.reputationScore * 90 + _reputationDelta * 10) / 100;
        if (a.reputationScore > 1000) a.reputationScore = 1000;
        emit JobRecorded(_agent, a.jobsCompleted, a.totalEarned);
        emit ReputationUpdated(_agent, oldScore, a.reputationScore);
    }

    function verifyAgent(address _agent, bool _verified) external onlyOwner {
        require(isRegistered[_agent], "AgentRegistry: not registered");
        agents[_agent].verified = _verified;
        emit AgentVerified(_agent, _verified);
    }

    function getAgent(address _agent) external view returns (Agent memory) {
        return agents[_agent];
    }

    function getAllAgents() external view returns (address[] memory) {
        return agentList;
    }
}
