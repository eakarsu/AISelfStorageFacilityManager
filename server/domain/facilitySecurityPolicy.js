const STAGES = Object.freeze(['received','evidence_validated','triaged','manager_review','action_approved','dispatched','resolved','closed','deleted']);
const acknowledged = (receipt) => Boolean(receipt && receipt.provider && receipt.receipt_id && receipt.status === 'acknowledged' && !Number.isNaN(new Date(receipt.acknowledged_at).valueOf()));

function validateEvidence(input) {
  for (const field of ['event_ref','facility_ref','source_ref','source_version','checksum','permission_version','captured_at']) {
    if (!input[field]) throw new Error(`${field} is required`);
  }
  const capturedAt = new Date(input.captured_at);
  if (Number.isNaN(capturedAt.valueOf())) throw new Error('captured_at is invalid');
  if (!['low','medium','high','critical'].includes(input.severity)) throw new Error('valid severity is required');
  return { ...input, captured_at: capturedAt.toISOString(), isolated_content: true };
}

function validateAnswer({ authorized_source_refs, citations, conflicts, answer }) {
  if (!Array.isArray(authorized_source_refs) || !Array.isArray(citations) || !Array.isArray(conflicts)) throw new Error('permission and citation evidence required');
  if (citations.some((citation) => !authorized_source_refs.includes(citation.source_ref) || !citation.source_version || !citation.locator)) throw new Error('unauthorized or unresolved citation');
  if (!answer || !citations.length || conflicts.length) return { abstain: true, answer: null, reason: conflicts.length ? 'conflicting_evidence' : 'insufficient_evidence' };
  return { abstain: false, answer };
}

function validateTransition(from, to, context = {}) {
  const allowed = { received:['evidence_validated','deleted'], evidence_validated:['triaged','deleted'], triaged:['manager_review'], manager_review:['action_approved','closed'], action_approved:['dispatched'], dispatched:['resolved'], resolved:['closed'], closed:['deleted'], deleted:[] };
  if (!allowed[from]?.includes(to)) throw new Error('invalid facility security transition');
  if (['action_approved','dispatched','closed','deleted'].includes(to) && !['facility_manager','security_manager','admin'].includes(context.role)) throw new Error('facility authority required');
  if (to === 'action_approved' && (!context.evidenceCount || context.actorId === context.createdBy)) throw new Error('independent evidence approval required');
  if (to === 'dispatched' && !acknowledged(context.providerReceipt)) throw new Error('typed acknowledged dispatch receipt required');
  if (to === 'closed' && !context.disposition) throw new Error('human disposition required');
  if (to === 'deleted' && !context.deletionReceipts?.length) throw new Error('deletion receipts required');
  return true;
}

module.exports = { STAGES, validateEvidence, validateAnswer, validateTransition };
