const express = require('express');
const pool = require('../db');
const { validateEvidence, validateAnswer, validateTransition } = require('../domain/facilitySecurityPolicy');
const router = express.Router();

const tenantOf = (req) => String(req.user.tenant_id || req.user.facility_id || req.user.id);
router.post('/cases', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const evidence = validateEvidence(req.body.evidence || {});
    if (!req.body.idempotency_key) throw new Error('idempotency_key is required');
    const tenant = tenantOf(req);
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM facility_security_cases WHERE tenant_id=$1 AND idempotency_key=$2', [tenant, req.body.idempotency_key]);
    if (found.rows[0]) { await client.query('ROLLBACK'); return res.status(200).json(found.rows[0]); }
    const result = await client.query(
      `INSERT INTO facility_security_cases(tenant_id,facility_id,subject_id,idempotency_key,severity,payload,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenant, evidence.facility_ref, String(req.user.id), req.body.idempotency_key, evidence.severity, req.body.payload || {}, String(req.user.id)]
    );
    await client.query(
      `INSERT INTO facility_security_evidence(tenant_id,case_id,source_type,source_ref,source_version,checksum,permission_scope,captured_at,retention_until,metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [tenant, result.rows[0].id, req.body.evidence.source_type || 'security_event', evidence.source_ref, evidence.source_version, evidence.checksum, evidence.permission_version, evidence.captured_at, req.body.evidence.retention_until || null, evidence]
    );
    await client.query('INSERT INTO facility_security_audit(tenant_id,case_id,actor_id,action,to_stage,payload) VALUES($1,$2,$3,$4,$5,$6)', [tenant,result.rows[0].id,String(req.user.id),'case.created','received',{ evidence_ref: evidence.source_ref }]);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); next(error); } finally { client.release(); }
});

router.get('/cases/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM facility_security_cases WHERE id=$1 AND tenant_id=$2', [req.params.id,tenantOf(req)]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Case not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post('/cases/:id/answer', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const tenant=tenantOf(req); await client.query('BEGIN');
    const recent=await client.query("SELECT COUNT(*) FROM facility_security_audit WHERE tenant_id=$1 AND actor_id=$2 AND action IN ('answer.grounded','answer.abstained') AND occurred_at > NOW()-INTERVAL '1 minute'",[tenant,String(req.user.id)]);
    if(Number(recent.rows[0].count)>=30){await client.query('ROLLBACK');return res.status(429).json({error:'Grounded-answer rate limit exceeded',retryable:true});}
    const owned=await client.query('SELECT * FROM facility_security_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,tenant]);
    if(!owned.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({error:'Case not found'}); }
    const evidence=await client.query('SELECT id,source_ref,source_version FROM facility_security_evidence WHERE case_id=$1 AND tenant_id=$2',[req.params.id,tenant]);
    const byRef=new Map(evidence.rows.map(row=>[row.source_ref,row]));
    const result=validateAnswer({...req.body,authorized_source_refs:evidence.rows.map(row=>row.source_ref)});
    for(const citation of req.body.citations || []) {
      const source=byRef.get(citation.source_ref);
      if(source) await client.query('INSERT INTO facility_security_citations(tenant_id,case_id,evidence_id,excerpt,authorized,conflict) VALUES($1,$2,$3,$4,TRUE,FALSE)',[tenant,req.params.id,source.id,citation.locator]);
    }
    await client.query(`UPDATE facility_security_cases SET payload=jsonb_set(payload,'{grounded_answer}',$1::jsonb,TRUE),updated_at=NOW() WHERE id=$2`,[JSON.stringify(result),req.params.id]);
    await client.query('INSERT INTO facility_security_audit(tenant_id,case_id,actor_id,action,payload) VALUES($1,$2,$3,$4,$5)',[tenant,req.params.id,String(req.user.id),result.abstain?'answer.abstained':'answer.grounded',{citation_count:(req.body.citations||[]).length,reason:result.reason||null}]);
    await client.query('COMMIT'); res.json(result);
  } catch(error) { await client.query('ROLLBACK').catch(()=>{}); next(error); } finally { client.release(); }
});

router.post('/cases/:id/feedback', async (req,res,next) => {
  try {
    const tenant=tenantOf(req),rating=Number(req.body.rating);
    if(![-1,1].includes(rating)) return res.status(400).json({error:'rating must be -1 or 1'});
    const owned=await pool.query('SELECT id FROM facility_security_cases WHERE id=$1 AND tenant_id=$2',[req.params.id,tenant]);
    if(!owned.rows[0]) return res.status(404).json({error:'Case not found'});
    const result=await pool.query(`INSERT INTO facility_security_feedback(tenant_id,case_id,actor_id,rating,reason) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(tenant_id,case_id,actor_id) DO UPDATE SET rating=EXCLUDED.rating,reason=EXCLUDED.reason,created_at=NOW() RETURNING *`,[tenant,req.params.id,String(req.user.id),rating,req.body.reason||null]);
    res.status(201).json(result.rows[0]);
  } catch(error){next(error);}
});

router.post('/cases/:id/transition', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const tenant = tenantOf(req); await client.query('BEGIN');
    const found = await client.query('SELECT * FROM facility_security_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id,tenant]);
    const current = found.rows[0]; if (!current) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Case not found' }); }
    if (Number(req.body.version) !== current.version) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Stale workflow version' }); }
    const evidenceCount = Number((await client.query('SELECT COUNT(*) FROM facility_security_evidence WHERE case_id=$1 AND tenant_id=$2',[current.id,tenant])).rows[0].count);
    const context = { ...req.body.context, role:req.user.role, actorId:String(req.user.id), createdBy:current.created_by, evidenceCount };
    validateTransition(current.stage, req.body.to_stage, context);
    const updated = await client.query('UPDATE facility_security_cases SET stage=$1,version=version+1,assigned_to=COALESCE($2,assigned_to),updated_at=NOW() WHERE id=$3 RETURNING *',[req.body.to_stage,req.body.assigned_to || null,current.id]);
    const receipt=req.body.context?.providerReceipt;
    if(receipt?.provider&&receipt?.receipt_id) await client.query(`INSERT INTO facility_security_deliveries(tenant_id,case_id,provider,operation,idempotency_key,status,receipt)
      VALUES($1,$2,$3,$4,$5,'acknowledged',$6) ON CONFLICT(tenant_id,provider,idempotency_key) DO NOTHING`,[tenant,current.id,receipt.provider,req.body.to_stage,receipt.receipt_id,receipt]);
    await client.query('INSERT INTO facility_security_audit(tenant_id,case_id,actor_id,action,from_stage,to_stage,payload) VALUES($1,$2,$3,$4,$5,$6,$7)',[tenant,current.id,String(req.user.id),'case.transitioned',current.stage,req.body.to_stage,req.body.context || {}]);
    await client.query('COMMIT'); res.json(updated.rows[0]);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); next(error); } finally { client.release(); }
});
module.exports = router;
