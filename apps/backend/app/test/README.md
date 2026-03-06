"""
Backend API Tests Configuration

This directory contains comprehensive test suites for all backend API endpoints.

## Test Structure

```
app/test/
├── conftest.py          # Shared fixtures and configuration
├── test_items.py        # Items API tests (CRUD + Search)
├── test_favorites.py    # Favorites & View History tests
├── test_users.py        # User Profile API tests
├── test_moderation.py   # Content Moderation tests
└── test_integration.py  # End-to-end integration tests
```

## Running Tests

### Run all tests
```bash
cd apps/backend
pytest app/test/ -v
```

### Run specific test file
```bash
pytest app/test/test_items.py -v
```

### Run with coverage
```bash
pytest app/test/ --cov=app --cov-report=html
```

### Run with markers
```bash
pytest app/test/ -m "not slow" -v
```

## Test Coverage

### Items API (`test_items.py`)
- ✅ POST   /api/v1/items/          - Create item
- ✅ GET    /api/v1/items/          - List items with filters
- ✅ GET    /api/v1/items/{id}      - Get item detail
- ✅ PUT    /api/v1/items/{id}      - Update item
- ✅ DELETE /api/v1/items/{id}      - Delete item
- ✅ Location-based search
- ✅ Price range filtering
- ✅ Category filtering
- ✅ Distance sorting
- ✅ Privacy protection (location fuzzing)

### Favorites API (`test_favorites.py`)
- ✅ POST /api/v1/items/{id}/view         - Record view
- ✅ POST /api/v1/items/{id}/favorite     - Toggle favorite
- ✅ GET  /api/v1/items/{id}/stats        - Get item stats
- ✅ GET  /api/v1/items/user/favorites    - Get user favorites
- ✅ GET  /api/v1/items/user/view-history - Get view history
- ✅ Concurrent favorite handling
- ✅ Anonymous user access

### Users API (`test_users.py`)
- ✅ GET  /api/v1/users/me              - Get my profile
- ✅ GET  /api/v1/users/{id}/public     - Get public profile
- ✅ PUT  /api/v1/users/me              - Update profile
- ✅ POST /api/v1/users/me/avatar       - Upload avatar
- ✅ POST /api/v1/users/admin/approve/{id}   - Admin approve user
- ✅ POST /api/v1/users/admin/reject/{id}    - Admin reject user
- ✅ GET  /api/v1/users/admin/pending        - Get pending users

### Moderation API (`test_moderation.py`)
- ✅ POST /api/v1/moderation/              - Submit for moderation
- ✅ GET  /api/v1/moderation/status/{id}   - Get moderation status
- ✅ GET  /api/v1/moderation/admin/review-queue  - Get review queue
- ✅ POST /api/v1/moderation/admin/review        - Review item
- ✅ GET  /api/v1/moderation/admin/stats         - Get stats

### Integration Tests (`test_integration.py`)
- ✅ Item lifecycle (create → moderate → view → favorite)
- ✅ User profile lifecycle (update → moderate → approve)
- ✅ Admin workflow (queue → review → approve/reject)
- ✅ Error handling and recovery
- ✅ Security scenarios (private items, access control)

## Fixtures

All tests share common fixtures defined in `conftest.py`:

- `mock_user_id` - Mock user UUID
- `mock_admin_id` - Mock admin UUID
- `mock_item_id` - Mock item ID
- `sample_item_data` - Valid item data template
- `sample_profile_data` - Valid profile data template
- `mock_db_result` - Factory for mock database results
- `mock_moderation_result_clean` - Clean moderation result
- `mock_moderation_result_flagged` - Flagged moderation result

## CI/CD Integration

### GitHub Actions
```yaml
name: Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      - name: Run tests
        run: pytest app/test/ -v --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Writing New Tests

### Basic Test Structure
```python
import pytest
from unittest.mock import Mock, AsyncMock

class TestFeatureName:
    """Description of what this test class covers"""
    
    @pytest.mark.asyncio
    async def test_success_case(self, mock_user_id, mock_db_result):
        """Test successful scenario"""
        # Arrange
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_db_result(data))
        
        # Act
        result = await function_to_test(db=mock_db, user_id=mock_user_id)
        
        # Assert
        assert result["key"] == expected_value
    
    @pytest.mark.asyncio
    async def test_error_case(self):
        """Test error handling"""
        with pytest.raises(HTTPException) as exc_info:
            await function_with_error()
        
        assert exc_info.value.status_code == 400
```

### Best Practices
1. Use descriptive test names
2. Test both success and error cases
3. Mock external dependencies (DB, API calls)
4. Use fixtures for common setup
5. Keep tests isolated and idempotent
