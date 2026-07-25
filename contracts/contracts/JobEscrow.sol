// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title JobEscrow
 * @notice ERC-8183 inspired escrow for a single job on Arc AgentMarket.
 * @dev Deployed per job by JobFactory on Arc Testnet (Chain ID: 5042002)
 */
contract JobEscrow {

    enum Status { Open, Assigned, Delivered, Completed, Disputed, Cancelled }

    struct Bid {
        address agent;
        uint256 amount;
        string  proposal;
        uint256 timestamp;
        bool    accepted;
    }

    address public factory;
    address public employer;
    address public assignedAgent;
    address public usdcToken;

    string  public title;
    string  public description;
    string  public category;
    uint256 public escrowAmount;
    uint256 public deadline;
    uint256 public createdAt;
    Status  public status;
    string  public deliveryURI;

    Bid[]   public bids;
    mapping(address => bool)    public hasBid;
    mapping(address => uint256) public bidIndex;

    uint256 public platformFee;
    address public feeRecipient;

    event BidPlaced(address indexed agent, uint256 amount, uint256 timestamp);
    event BidAccepted(address indexed agent, uint256 amount, uint256 timestamp);
    event WorkDelivered(address indexed agent, string deliveryURI, uint256 timestamp);
    event JobCompleted(address indexed agent, uint256 amountPaid, uint256 fee, uint256 timestamp);
    event JobCancelled(address indexed employer, uint256 refundAmount, uint256 timestamp);
    event DisputeRaised(address indexed raiser, uint256 timestamp);

    modifier onlyEmployer() {
        require(msg.sender == employer, "JobEscrow: not employer");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == assignedAgent, "JobEscrow: not assigned agent");
        _;
    }

    modifier inStatus(Status _s) {
        require(status == _s, "JobEscrow: wrong status");
        _;
    }

    constructor(
        address _employer,
        address _usdcToken,
        string memory _title,
        string memory _description,
        string memory _category,
        uint256 _escrowAmount,
        uint256 _deadlineHours,
        uint256 _platformFee,
        address _feeRecipient
    ) {
        factory      = msg.sender;
        employer     = _employer;
        usdcToken    = _usdcToken;
        title        = _title;
        description  = _description;
        category     = _category;
        escrowAmount = _escrowAmount;
        deadline     = block.timestamp + (_deadlineHours * 1 hours);
        createdAt    = block.timestamp;
        status       = Status.Open;
        platformFee  = _platformFee;
        feeRecipient = _feeRecipient;
    }

    function fundEscrow() external onlyEmployer inStatus(Status.Open) {
        bool success = IERC20(usdcToken).transferFrom(employer, address(this), escrowAmount);
        require(success, "JobEscrow: USDC transfer failed");
    }

    function placeBid(uint256 _amount, string calldata _proposal) external inStatus(Status.Open) {
        require(!hasBid[msg.sender], "JobEscrow: already bid");
        require(msg.sender != employer, "JobEscrow: employer cannot bid");
        require(_amount <= escrowAmount, "JobEscrow: bid exceeds escrow");
        require(block.timestamp < deadline, "JobEscrow: deadline passed");

        bidIndex[msg.sender] = bids.length;
        bids.push(Bid({ agent: msg.sender, amount: _amount, proposal: _proposal, timestamp: block.timestamp, accepted: false }));
        hasBid[msg.sender] = true;

        emit BidPlaced(msg.sender, _amount, block.timestamp);
    }

    function acceptBid(address _agent) external onlyEmployer inStatus(Status.Open) {
        require(hasBid[_agent], "JobEscrow: no bid from this agent");

        uint256 idx = bidIndex[_agent];
        bids[idx].accepted = true;
        assignedAgent = _agent;
        status = Status.Assigned;

        uint256 acceptedAmount = bids[idx].amount;
        if (acceptedAmount < escrowAmount) {
            uint256 refund = escrowAmount - acceptedAmount;
            escrowAmount = acceptedAmount;
            IERC20(usdcToken).transfer(employer, refund);
        }

        emit BidAccepted(_agent, acceptedAmount, block.timestamp);
    }

    function markDelivered(string calldata _deliveryURI) external onlyAgent inStatus(Status.Assigned) {
        deliveryURI = _deliveryURI;
        status = Status.Delivered;
        emit WorkDelivered(msg.sender, _deliveryURI, block.timestamp);
    }

    function confirmDelivery() external onlyEmployer inStatus(Status.Delivered) {
        status = Status.Completed;
        uint256 fee = (escrowAmount * platformFee) / 10000;
        uint256 agentPayout = escrowAmount - fee;
        if (fee > 0) IERC20(usdcToken).transfer(feeRecipient, fee);
        IERC20(usdcToken).transfer(assignedAgent, agentPayout);
        emit JobCompleted(assignedAgent, agentPayout, fee, block.timestamp);
    }

    function cancelJob() external onlyEmployer {
        require(status == Status.Open || block.timestamp > deadline, "JobEscrow: cannot cancel");
        status = Status.Cancelled;
        uint256 balance = IERC20(usdcToken).balanceOf(address(this));
        if (balance > 0) IERC20(usdcToken).transfer(employer, balance);
        emit JobCancelled(employer, balance, block.timestamp);
    }

    function raiseDispute() external {
        require(msg.sender == employer || msg.sender == assignedAgent, "JobEscrow: not a party");
        require(status == Status.Assigned || status == Status.Delivered, "JobEscrow: cannot dispute");
        status = Status.Disputed;
        emit DisputeRaised(msg.sender, block.timestamp);
    }

    function getBids() external view returns (Bid[] memory) { return bids; }
    function getBidCount() external view returns (uint256) { return bids.length; }
    function getBalance() external view returns (uint256) { return IERC20(usdcToken).balanceOf(address(this)); }
}
