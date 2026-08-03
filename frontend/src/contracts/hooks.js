import { ethers } from 'ethers';
import { AGENT_REGISTRY_ABI, JOB_FACTORY_ABI, JOB_ESCROW_ABI, USDC_ABI } from './abis.js';

export const CONTRACTS = {
  USDC:          '0x3600000000000000000000000000000000000000',
  AgentRegistry: '0x1440bE7D86338559fEfb200E35D9c189B1790E7F',
  JobFactory:    '0xc63360bB0881F3203FFB4527a5e06b3ca159F259',
};

export const ARC = {
  chainId: '0x' + (5042002).toString(16),
  chainName: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorerUrl: 'https://testnet.arcscan.app',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
};

export async function getSigner() {
  if (!window.ethereum) throw new Error('No wallet detected. Install MetaMask.');
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  return provider.getSigner();
}

export async function getProvider() {
  return new ethers.JsonRpcProvider(ARC.rpcUrl);
}

export async function getJobFactory(signerOrProvider) {
  return new ethers.Contract(CONTRACTS.JobFactory, JOB_FACTORY_ABI, signerOrProvider);
}

export async function getAgentRegistry(signerOrProvider) {
  return new ethers.Contract(CONTRACTS.AgentRegistry, AGENT_REGISTRY_ABI, signerOrProvider);
}

export async function getJobEscrow(address, signerOrProvider) {
  return new ethers.Contract(address, JOB_ESCROW_ABI, signerOrProvider);
}

export async function getUSDC(signerOrProvider) {
  return new ethers.Contract(CONTRACTS.USDC, USDC_ABI, signerOrProvider);
}

// Create a job onchain
export async function createJobOnchain(title, description, category, escrowUsdc, deadlineHours) {
  const signer = await getSigner();
  const factory = await getJobFactory(signer);
  const usdc = await getUSDC(signer);

  // Convert USDC amount to 6 decimals
  const escrowAmount = ethers.parseUnits(String(escrowUsdc), 6);

  // Approve JobFactory to spend USDC
  const approveTx = await usdc.approve(CONTRACTS.JobFactory, escrowAmount);
  await approveTx.wait();

  // Create job
  const tx = await factory.createJob(title, description, category, escrowAmount, deadlineHours);
  const receipt = await tx.wait();

  // Get escrow address from event
  const event = receipt.logs.find(l => {
    try { return factory.interface.parseLog(l)?.name === 'JobCreated'; } catch { return false; }
  });
  const parsed = event ? factory.interface.parseLog(event) : null;
  return { txHash: receipt.hash, escrowAddress: parsed?.args?.escrow, jobId: parsed?.args?.jobId };
}

// Place a bid onchain
export async function placeBidOnchain(escrowAddress, bidUsdc, proposal) {
  const signer = await getSigner();
  const escrow = await getJobEscrow(escrowAddress, signer);
  const bidAmount = ethers.parseUnits(String(bidUsdc), 6);
  const tx = await escrow.placeBid(bidAmount, proposal);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// Register agent onchain
export async function registerAgentOnchain(name, specialty, metadataURI) {
  const signer = await getSigner();
  const registry = await getAgentRegistry(signer);
  const tx = await registry.registerAgent(name, specialty, metadataURI || '');
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// Fetch all jobs from JobFactory
export async function fetchOnchainJobs() {
  try {
    const provider = await getProvider();
    const factory = await getJobFactory(provider);
    const count = await factory.getJobCount();
    const jobs = [];
    for (let i = 0; i < Math.min(Number(count), 20); i++) {
      try {
        const job = await factory.getJob(i);
        jobs.push({
          id: 'onchain-' + i,
          jobId: i,
          escrowAddress: job.escrowAddress,
          title: job.title,
          category: job.category,
          escrow: ethers.formatUnits(job.escrowAmount, 6),
          employer: job.employer,
          status: 'open',
          bids: 0,
          posted: 'onchain',
          tags: [],
          description: 'Posted onchain via JobFactory on Arc Testnet.',
          deadline: 'See contract',
        });
      } catch { continue; }
    }
    return jobs;
  } catch { return []; }
}
