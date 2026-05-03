# Code Quality Improvements - Integration Guide

## 🎯 Quick Reference

### Error Throwing

```javascript
// ❌ OLD: Generic errors
throw new Error('Something went wrong');

// ✅ NEW: Specific, typed errors
import { ValidationError, NotFoundError, AuthenticationError } from '../utils/errors.js';

throw new ValidationError('Email is invalid', { field: 'email', received: 'bad@' });
throw new NotFoundError('User', userId);
throw new AuthenticationError('Token expired');
```

### Input Validation

```javascript
// ❌ OLD: Inline validation
const validateInput = (input) => {
  if (!input) throw new Error('Required');
  if (input.length > 500) throw new Error('Too long');
  return input.trim();
};

// ✅ NEW: Use validation utilities
import { validateString, validateChoice, validateEpic } from '../utils/validation.js';

const query = validateString(input, { maxLength: 500 });
const level = validateChoice(userLevel, ['Beginner', 'Intermediate', 'Advanced'], 'level');
const epic = validateEpic(epicNumber);
```

### Route Handler Responses

```javascript
// ❌ OLD: Manual response building
app.get('/users/:id', (req, res) => {
  const user = db.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, data: user });
});

// ✅ NEW: Use response helpers
import { asyncHandler } from '../utils/common.js';
import { sendSuccess, sendNotFound } from '../utils/response.js';

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await db.getUser(req.params.id);
  if (!user) return sendNotFound(res, 'User', req.params.id);
  sendSuccess(res, user);
}));
```

### Asynchronous Error Handling

```javascript
// ❌ OLD: Try-catch in every handler
app.post('/data', (req, res) => {
  try {
    const result = await processData(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ NEW: asyncHandler wrapper
import { asyncHandler } from '../utils/common.js';

app.post('/data', asyncHandler(async (req, res) => {
  const result = await processData(req.body);
  sendSuccess(res, result);
  // Errors automatically pass to error middleware
}));
```

### External API Calls with Retry

```javascript
// ❌ OLD: Manual retry logic
const fetchWithRetry = async (url, maxAttempts = 3) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fetch(url);
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      await sleep(Math.pow(2, i) * 100);
    }
  }
};

// ✅ NEW: Use retryWithBackoff
import { retryWithBackoff } from '../utils/common.js';

const response = await retryWithBackoff(
  () => fetch(url),
  { maxAttempts: 3, delayMs: 100, backoffMultiplier: 2 }
);
```

### Service Implementation

```javascript
// ❌ OLD: Repetitive service boilerplate
class UserService {
  async getUser(id) {
    try {
      console.log('Fetching user...');
      const result = await db.getUser(id);
      console.log('User fetched');
      return result;
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  }
}

// ✅ NEW: Extend BaseService
import { CacheableService } from '../utils/serviceFactory.js';

class UserService extends CacheableService {
  constructor() {
    super('UserService');
  }

  async getUser(id) {
    return this.getOrCompute(`user:${id}`, async () => {
      return this.executeWithRetry('fetch-user', () => db.getUser(id));
    }, 3600);
  }
}
```

### Constants Usage

```javascript
// ❌ OLD: Magic values scattered everywhere
if (query.length > 500) {
  throw new Error('Query too long');
}

const page = Math.floor(offset / 20) + 1;

if (duration > 200) {
  console.warn('Slow query');
}

// ✅ NEW: Use constants
import { MAX_QUERY_LENGTH, DEFAULT_PAGE_SIZE, SLOW_QUERY_THRESHOLD_MS } from '../config/constants.js';

if (query.length > MAX_QUERY_LENGTH) {
  throw new ValidationError('Query too long', { max: MAX_QUERY_LENGTH });
}

const page = Math.floor(offset / DEFAULT_PAGE_SIZE) + 1;

if (duration > SLOW_QUERY_THRESHOLD_MS) {
  logger.warn('Slow query', { durationMs: duration });
}
```

---

## 🔄 Migration Path

### Phase 1: Foundation (Week 1)
- [ ] Import and review all new utility modules
- [ ] Update error handler middleware
- [ ] Update validation middleware
- [ ] Run existing tests to ensure compatibility

### Phase 2: Routes (Week 2)
- [ ] Convert route handlers to use `asyncHandler`
- [ ] Replace manual responses with response helpers
- [ ] Update error handling in routes

### Phase 3: Services (Week 3)
- [ ] Refactor services to extend `BaseService`/`CacheableService`
- [ ] Replace manual retry logic with `executeWithRetry`
- [ ] Update logging to use service context

### Phase 4: Testing (Week 4)
- [ ] Add unit tests for utility functions
- [ ] Add integration tests for new error handling
- [ ] Verify consistency across all endpoints

---

## 📋 Checklist for Each New Feature

When implementing a new route or service:

- [ ] Define valid inputs and constraints (in constants if shared)
- [ ] Use validation utilities to validate inputs
- [ ] Throw appropriate custom error types
- [ ] Use response helpers for all responses
- [ ] Wrap async handlers with `asyncHandler()`
- [ ] For external calls, use `retryWithBackoff()`
- [ ] Add JSDoc comments with parameter types
- [ ] Consider if data should be cached
- [ ] Add performance measurements for slow operations
- [ ] Include structured logging with context

---

## ⚠️ Common Pitfalls to Avoid

```javascript
// ❌ DON'T: Inline error construction
throw new Error('Bad request');

// ✅ DO: Use typed error classes
throw new ValidationError('Invalid input', { field, expected, received });

// ❌ DON'T: Inconsistent response formats
res.json({ data: result }); // sometimes
res.json({ user: result }); // sometimes
res.json(result); // sometimes

// ✅ DO: Always use response helpers
sendSuccess(res, result);

// ❌ DON'T: Duplicate validation logic
if (!email || !email.includes('@')) { ... }
// ... same check in another file ...

// ✅ DO: Use validation utilities
validateEmail(email);

// ❌ DON'T: Silent failures
try {
  await operation();
} catch (err) {
  // no logging, no error thrown
}

// ✅ DO: Always log and properly throw
try {
  await operation();
} catch (err) {
  logger.error('Operation failed', { error: err.message });
  throw new ExternalServiceError('service', err.message);
}

// ❌ DON'T: Catch all errors the same
try {
  await operation();
} catch (err) {
  res.status(500).json({ error: err.message });
}

// ✅ DO: Handle different error types
try {
  await operation();
} catch (err) {
  if (err instanceof ValidationError) {
    sendValidationError(res, err.message, err.context);
  } else if (err instanceof NotFoundError) {
    sendNotFound(res, err.context.resourceType);
  } else {
    throw err; // Let asyncHandler pass to error middleware
  }
}
```

---

## 🧪 Testing with New Utilities

```javascript
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { validateString, validateEpic } from '../utils/validation.js';
import { asyncHandler } from '../utils/common.js';

describe('Validation Utilities', () => {
  it('should validate strings', () => {
    expect(validateString('hello')).toBe('hello');
    expect(() => validateString('')).toThrow(ValidationError);
    expect(() => validateString('a'.repeat(501))).toThrow(ValidationError);
  });

  it('should validate EPIC format', () => {
    expect(validateEpic('ABC1234567')).toBe('ABC1234567');
    expect(() => validateEpic('invalid')).toThrow(ValidationError);
  });
});

describe('Error Handling', () => {
  it('should throw ValidationError with context', () => {
    try {
      throw new ValidationError('Invalid email', { field: 'email' });
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.context.field).toBe('email');
    }
  });
});

describe('Service Patterns', () => {
  it('should cache results', async () => {
    const service = new CacheableService('test');
    let callCount = 0;

    const result1 = await service.getOrCompute('key', async () => {
      callCount++;
      return 'data';
    });

    const result2 = await service.getOrCompute('key', async () => {
      callCount++;
      return 'data';
    });

    expect(result1).toBe(result2);
    expect(callCount).toBe(1); // Only called once
  });
});
```

---

## 📞 Support & Questions

When in doubt:
1. Check `src/utils/` for available utilities
2. Review existing implementations in `src/services/` and `src/middleware/`
3. Refer to `DOCS/CODE_QUALITY_IMPROVEMENTS.md` for detailed documentation
4. Check test files in `tests/` for usage examples

---

## 🚀 Performance Considerations

- **Caching:** Use `CacheableService` for frequently accessed data (3600s default TTL)
- **Retries:** Use `retryWithBackoff()` for transient failures with exponential backoff
- **Validation:** Validation happens early to fail fast (before expensive operations)
- **Logging:** Structured logging is optimized for Cloud Logging (minimal overhead)
- **Error Handling:** Error construction is lightweight (no heavy stack processing in hot paths)

---

**Last Updated:** May 3, 2026  
**For Questions:** Refer to CODE_QUALITY_IMPROVEMENTS.md
