/**
 * Sanitizes and validates the incoming query input.
 */
export const validateQuery = (req, res, next) => {
  const { query, knowledgeLevel } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is missing or invalid.' });
  }

  const sanitizedQuery = query.trim().substring(0, 500); // hard limit to 500 chars limit abuse
  if (sanitizedQuery.length === 0) {
    return res.status(400).json({ error: 'Query cannot be empty.' });
  }
  
  // Update req.body with sanitized values
  req.body.query = sanitizedQuery;

  const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
  if (knowledgeLevel && !validLevels.includes(knowledgeLevel)) {
    return res.status(400).json({ error: 'Invalid knowledge level.' });
  }

  next();
};
