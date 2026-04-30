/**
 * Global error handler to ensure we don't swallow errors and return 
 * appropriate standard formats.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Server error:', err);

  const statusCode = err.status || 500;
  const message = err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({ error: message });
};
