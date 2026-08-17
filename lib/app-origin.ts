/** Dashboard 对外 URL，给 MCP 返回的审批直达链接用。 */
export function appOrigin() {
  const explicit = process.env.APP_ORIGIN?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "https://dashboard.koocuu.com";
}

export function profileProposalUrl(id: number) {
  return `${appOrigin()}/profile/proposals/${id}`;
}

export function holdingProposalUrl(id: number) {
  return `${appOrigin()}/invest?proposal=${id}`;
}
