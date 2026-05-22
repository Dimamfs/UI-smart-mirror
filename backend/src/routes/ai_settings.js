const router = require('express').Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/ai-settings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = await getDb();
    const row = await db.get(
      'SELECT settings FROM mirror_ai_settings WHERE household_id = ?',
      req.account.householdId
    );
    const settings = row ? JSON.parse(row.settings) : {};
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/ai-settings
router.put('/', authenticate, async (req, res, next) => {
  try {
    const db = await getDb();
    const incoming = req.body.settings || {};

    const existing = await db.get(
      'SELECT settings FROM mirror_ai_settings WHERE household_id = ?',
      req.account.householdId
    );
    const current = existing ? JSON.parse(existing.settings) : {};
    const merged = { ...current, ...incoming };

    await db.run(
      `INSERT INTO mirror_ai_settings (household_id, settings, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(household_id) DO UPDATE SET
         settings   = excluded.settings,
         updated_at = CURRENT_TIMESTAMP`,
      req.account.householdId,
      JSON.stringify(merged)
    );

    res.json({ settings: merged });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
