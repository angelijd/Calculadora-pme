const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const hasFile = fs.existsSync(path.join(__dirname, '..', 'service-account.json'));
  const hasEnvJson = !!process.env.GCP_SERVICE_ACCOUNT_KEY;
  const hasSplitEnv = !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  const hasBigQuery = hasFile || hasEnvJson || hasSplitEnv;

  res.status(200).json({
    bigqueryConfigured: hasBigQuery,
    projectId: 'calculadora-pme'
  });
};
