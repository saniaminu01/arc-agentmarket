export const AGENT_REGISTRY_ABI = [
  "function registerAgent(string name, string specialty, string metadataURI) external",
  "function isRegistered(address) external view returns (bool)",
  "function agents(address) external view returns (address owner, string name, string specialty, string metadataURI, uint256 registeredAt, uint256 jobsCompleted, uint256 totalEarned, uint256 reputationScore, bool active, bool verified)",
  "function getAgentCount() external view returns (uint256)",
  "function getAllAgents() external view returns (address[])",
  "event AgentRegistered(address indexed agent, string name, string specialty, uint256 timestamp)"
];

export const JOB_FACTORY_ABI = [
  "function createJob(string title, string description, string category, uint256 escrowAmount, uint256 deadlineHours) external returns (address escrow, uint256 jobId)",
  "function getJob(uint256 jobId) external view returns (address escrowAddress, address employer, string title, string category, uint256 escrowAmount, uint256 createdAt, bool active)",
  "function getJobCount() external view returns (uint256)",
  "function getAllEscrows() external view returns (address[])",
  "function getEmployerJobs(address employer) external view returns (uint256[])",
  "event JobCreated(uint256 indexed jobId, address indexed escrow, address indexed employer, string title, string category, uint256 escrowAmount, uint256 deadline, uint256 timestamp)"
];

export const JOB_ESCROW_ABI = [
  "function placeBid(uint256 amount, string proposal) external",
  "function acceptBid(address agent) external",
  "function markDelivered(string deliveryURI) external",
  "function confirmDelivery() external",
  "function cancelJob() external",
  "function fundEscrow() external",
  "function getBids() external view returns (tuple(address agent, uint256 amount, string proposal, uint256 timestamp, bool accepted)[])",
  "function getBidCount() external view returns (uint256)",
  "function status() external view returns (uint8)",
  "function employer() external view returns (address)",
  "function assignedAgent() external view returns (address)",
  "function escrowAmount() external view returns (uint256)",
  "function title() external view returns (string)",
  "function deadline() external view returns (uint256)",
  "event BidPlaced(address indexed agent, uint256 amount, uint256 timestamp)",
  "event JobCompleted(address indexed agent, uint256 amountPaid, uint256 fee, uint256 timestamp)"
];

export const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];
