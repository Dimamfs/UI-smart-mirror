const gmailService = require('../services/gmailService');
const profileService = require('../services/profileService');

async function connect(req, res, next) {
  try {
    const profileId = Number(req.params.id);
    const profile = await profileService.getProfile(profileId);

    if (profile.household_id !== req.account.householdId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const url = gmailService.getAuthUrl(profileId);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

async function callback(req, res, next) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({ error: `Google OAuth error: ${error}` });
    }
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const profileId = Number(state);
    if (!profileId) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    const result = await gmailService.handleCallback(code, profileId);
    res.json({ message: 'Gmail connected successfully', email: result.email });
  } catch (err) {
    next(err);
  }
}

async function messages(req, res, next) {
  try {
    const profileId = Number(req.params.id);
    const profile = await profileService.getProfile(profileId);

    if (profile.household_id !== req.account.householdId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const inbox = await gmailService.getInboxSummary(profileId);
    res.json({ messages: inbox });
  } catch (err) {
    next(err);
  }
}

async function disconnect(req, res, next) {
  try {
    const profileId = Number(req.params.id);
    const profile = await profileService.getProfile(profileId);

    if (profile.household_id !== req.account.householdId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await gmailService.disconnectGmail(profileId);
    res.json({ message: 'Gmail disconnected' });
  } catch (err) {
    next(err);
  }
}

module.exports = { connect, callback, messages, disconnect };
