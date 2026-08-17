export const PROPOSAL_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export function isProposalStale(createdAt: Date, now = Date.now()) {
  return now - createdAt.getTime() > PROPOSAL_STALE_MS;
}

export function staleApproveError() {
  return "该提案已超过 7 天，数据可能过期，不能直接批准。请让 AI 按当前数据重新提交。";
}
