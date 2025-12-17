# Organization Tree - Verification Guide

## Quick Test Steps

### 1. Test Adding Root Unit
1. Click "Add Root" button
2. Dialog should open
3. Level dropdown should show only "Region" (level 1)
4. Fill in:
   - Unit Name: "Test Region"
   - Unit Code: "TR001"
5. Click "Create Unit"
6. ✅ **Expected**: 
   - Dialog closes
   - Success alert appears
   - Tree refreshes automatically
   - New unit appears in tree
   - Unit is selected (highlighted)

### 2. Test Adding Child Unit
1. Hover over an existing unit in the tree
2. Click the "+" button (or use 3-dot menu → "Add Child")
3. Dialog should open with parent name shown
4. Level dropdown should show levels > parent's level
   - If parent is Region (level 1), you should see: Factory, Section, Department, Work Center
5. Fill in:
   - Level: Select "Factory" (or any level > parent)
   - Unit Name: "Test Factory"
   - Unit Code: "TF001"
6. Click "Create Unit"
7. ✅ **Expected**:
   - Dialog closes
   - Success alert appears
   - Tree refreshes automatically
   - New child appears under parent (may need to expand parent)
   - Child unit is selected

### 3. Verify in Browser Console
Open browser DevTools (F12) and check console logs:

**When creating unit:**
```
[Organization] ===== Creating unit ===== 
[Organization] Unit data: {...}
[Organization] Response status: 201
[Organization] ✅ Unit created successfully: {...}
[Organization] Selected new unit ID: X
[useOrgData] ===== Refreshing tree ===== 
[useOrgData] Tree refreshed. Current tree length: X
```

**When tree loads:**
```
[useOrgData] Fetching tree from: /api/org/tree
[useOrgData] Tree data received: {...}
[useOrgData] Setting tree with X root units
```

### 4. Common Issues & Fixes

**Issue**: Dialog doesn't close after creation
- ✅ Fixed: Dialog now closes automatically after successful creation

**Issue**: Tree doesn't refresh after creation
- ✅ Fixed: Tree refresh happens immediately after creation

**Issue**: Wrong levels shown in dropdown
- ✅ Fixed: Level filtering now based on parent's level order

**Issue**: Can't type in input fields
- ✅ Fixed: Removed blocking event handlers

**Issue**: Unit created but not visible in tree
- Check browser console for errors
- Check backend terminal for errors
- Verify tenant_id matches in database
- Try manual refresh (click "Refresh Tree" button)

## Backend Verification

Check backend terminal logs:

**When creating unit:**
```
[OrganizationController] POST /org/units
[OrganizationService] Creating unit: {...}
[OrganizationService] Unit created with ID: X
```

**When fetching tree:**
```
[Controller.getTree] ===== Request received =====
[getTree] ===== START getTree for tenant: ACME =====
[getTree] Total units in org_units table: X
[getTree] Query returned X rows
[getTree] Found X root units after filtering
```

## Database Verification

Run this SQL query to verify units are created:

```sql
SELECT 
    id, 
    name, 
    code, 
    level_key, 
    parent_id, 
    is_active,
    created_at
FROM org_units
WHERE tenant_id = 'YOUR-TENANT-ID'
ORDER BY created_at DESC;
```

## Success Indicators

✅ **All working correctly if:**
1. Dialog opens and closes properly
2. Input fields are interactive
3. Level dropdown shows correct options
4. Success alert appears after creation
5. Tree refreshes automatically
6. New unit appears in tree
7. No errors in browser console
8. No errors in backend terminal
9. Unit appears in database


