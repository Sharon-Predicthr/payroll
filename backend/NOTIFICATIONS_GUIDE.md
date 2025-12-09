# How to Create Notifications for System Events

This guide explains how to create notifications when system events occur (e.g., new employee added, payroll completed, etc.).

## Step 1: Import NotificationsModule

In the module where you want to create notifications, import `NotificationsModule`:

```typescript
// employees.module.ts (or payroll.module.ts, etc.)
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [
    NotificationsModule, // Add this import
    // ... other imports
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
```

## Step 2: Inject NotificationsService

In your service class, inject `NotificationsService`. You may also need `TenantResolverService` if you need to convert tenantCode to tenantId:

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantResolverService } from '../auth/tenant-resolver.service';

@Injectable()
export class EmployeesService {
  constructor(
    // ... other services
    private notificationsService: NotificationsService,
    private tenantResolverService: TenantResolverService, // Already available if you import AuthModule
  ) {}
}
```

**Note:** If your module already imports `AuthModule` (like `EmployeesModule` does), you already have access to `TenantResolverService`.

## Step 3: Create Notifications When Events Occur

### Example 1: New Employee Added

```typescript
async createEmployee(employeeData: any, tenantCode: string, userId: string) {
  // ... create employee logic
  const newEmployee = await this.createEmployeeInDb(employeeData);
  
  // Get tenant ID from tenant code (using TenantResolverService or NotificationsService)
  const tenantId = await this.notificationsService.getTenantIdFromCode(tenantCode);
  // OR if you have TenantResolverService:
  // const tenantId = await this.tenantResolverService.getTenantIdFromCode(tenantCode);
  
  // Create notification
  await this.notificationsService.createNotification(
    tenantId,
    userId,
    'employees', // notification type
    'New Employee Added',
    `${employeeData.first_name} ${employeeData.last_name} has been added to the system as a ${employeeData.position} in the ${employeeData.department} department.`,
    {
      employeeId: newEmployee.id,
      employeeCode: newEmployee.employee_code,
      department: employeeData.department,
      position: employeeData.position,
    }
  );
  
  return newEmployee;
}
```

### Example 2: Payroll Process Completed

```typescript
async processPayroll(payrollData: any, tenantCode: string, userId: string) {
  // ... process payroll logic
  const payroll = await this.processPayrollInDb(payrollData);
  
  // Get tenant ID
  const tenantId = await this.tenantResolverService.getTenantIdFromCode(tenantCode);
  
  // Create notification
  await this.notificationsService.createNotification(
    tenantId,
    userId,
    'payroll',
    'Payroll Run Completed',
    `Payroll for ${payroll.period} has been processed successfully for ${payroll.employee_count} employees. Total amount: $${payroll.total_amount.toLocaleString()}`,
    {
      payrollId: payroll.id,
      period: payroll.period,
      employeeCount: payroll.employee_count,
      totalAmount: payroll.total_amount,
      status: 'completed',
    }
  );
  
  return payroll;
}
```

### Example 3: Employee Contract Expiring

```typescript
async checkExpiringContracts(tenantCode: string, userId: string) {
  // ... find expiring contracts
  const expiringContracts = await this.findExpiringContracts();
  
  const tenantId = await this.tenantResolverService.getTenantIdFromCode(tenantCode);
  
  for (const contract of expiringContracts) {
    await this.notificationsService.createNotification(
      tenantId,
      userId,
      'employees',
      'Employee Contract Expiring',
      `${contract.employee_name}'s contract will expire in ${contract.days_until_expiry} days. Please review and renew if needed.`,
      {
        employeeId: contract.employee_id,
        contractId: contract.id,
        expiryDate: contract.expiry_date,
        daysUntilExpiry: contract.days_until_expiry,
      }
    );
  }
}
```

### Example 4: Document Generated

```typescript
async generatePayslip(employeeId: string, period: string, tenantCode: string, userId: string) {
  // ... generate payslip logic
  const payslip = await this.generatePayslipInDb(employeeId, period);
  
  const tenantId = await this.tenantResolverService.getTenantIdFromCode(tenantCode);
  
  await this.notificationsService.createNotification(
    tenantId,
    userId,
    'documents',
    'Payslip Generated',
    `Payslip for employee ID ${employeeId} has been generated for ${period} and is ready for download.`,
    {
      employeeId: employeeId,
      payslipId: payslip.id,
      period: period,
      downloadUrl: `/payslips/${payslip.id}`,
    }
  );
  
  return payslip;
}
```

### Example 5: System Error/Alert

```typescript
async handleSystemError(error: Error, tenantCode: string, userId: string) {
  const tenantId = await this.tenantResolverService.getTenantIdFromCode(tenantCode);
  
  await this.notificationsService.createNotification(
    tenantId,
    userId,
    'system',
    'System Error Detected',
    `An error occurred: ${error.message}. Please check the system logs for more details.`,
    {
      errorType: error.constructor.name,
      errorMessage: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    }
  );
}
```

## Notification Types

Use these standard types for consistency:
- `'payroll'` - Payroll-related notifications
- `'employees'` - Employee-related notifications
- `'documents'` - Document generation/download notifications
- `'system'` - System alerts, errors, maintenance
- `'integrations'` - Third-party integration notifications

## Getting tenantId and userId

### From Controller (with Request object):

```typescript
@Post('employees')
@UseGuards(AuthGuard('jwt'))
async createEmployee(
  @Body() employeeData: any,
  @Req() req: Request,
) {
  const userId = req.user.sub; // User ID from JWT
  const tenantCode = req.user.tenantCode; // Tenant code from JWT
  
  // Get tenant ID
  const tenantId = await this.tenantResolverService.getTenantIdFromCode(tenantCode);
  
  // Create employee and notification
  return this.employeesService.createEmployee(employeeData, tenantCode, userId);
}
```

### From Service (if you already have tenantCode):

```typescript
// If you have tenantCode, get tenantId:
const tenantId = await this.tenantResolverService.getTenantIdFromCode(tenantCode);

// If you need to notify multiple users, you'll need their user IDs
// For now, notifications are per-user, so use the userId of the user who triggered the action
```

## Helper Method (Optional)

You can create a helper method in your service to simplify notification creation:

```typescript
private async notify(
  tenantCode: string,
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: any,
) {
  try {
    const tenantId = await this.tenantResolverService.getTenantIdFromCode(tenantCode);
    await this.notificationsService.createNotification(
      tenantId,
      userId,
      type,
      title,
      message,
      metadata,
    );
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to create notification:', error);
  }
}

// Then use it:
await this.notify(
  tenantCode,
  userId,
  'employees',
  'New Employee Added',
  'Employee has been added successfully.',
  { employeeId: '123' }
);
```

## Important Notes

1. **Don't block main operations**: Wrap notification creation in try-catch so failures don't break your main business logic
2. **Use meaningful titles and messages**: Keep titles short (< 200 chars) and messages descriptive
3. **Include relevant metadata**: Add useful data in metadata for future reference or actions
4. **Use appropriate types**: Stick to standard notification types for consistency
5. **Get tenantId correctly**: Always use `getTenantIdFromCode()` to convert tenantCode to tenantId

