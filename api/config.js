module.exports = (req, res) => {
  const hasBigQuery = !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  res.status(200).json({
    bigqueryConfigured: hasBigQuery,
    projectId: process.env.GOOGLE_PROJECT_ID || ''
  });
};
