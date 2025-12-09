/**
 * EXAMPLE: How to use tenant connection in controllers
 * 
 * This is a reference implementation showing different ways to access tenant database
 */

import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantConnectionGuard } from '../guards/tenant-connection.guard';
import { TenantConnection } from '../decorators/tenant-connection.decorator';
import * as sql from 'mssql';

// ============================================
// OPTION 1: Using Guard + Decorator (Recommended)
// ============================================
@Controller('example')
@UseGuards(AuthGuard('jwt'), TenantConnectionGuard) // Apply guards at controller level
export class ExampleTenantController {
  
  @Get('employees')
  async getEmployees(@TenantConnection() pool: sql.ConnectionPool) {
    // pool is automatically injected - it's the tenant database connection
    const result = await pool
      .request()
      .query('SELECT * FROM employees WHERE is_active = 1');
    
    return {
      success: true,
      data: result.recordset,
    };
  }

  @Get('employees/:id')
  async getEmployeeById(
    @TenantConnection() pool: sql.ConnectionPool,
    @Request() req: any, // Access tenantCode if needed
  ) {
    const employeeId = req.params.id;
    const tenantCode = req.tenantCode; // Also available in request
    
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, employeeId)
      .query('SELECT * FROM employees WHERE id = @id');
    
    return {
      success: true,
      data: result.recordset[0],
      tenantCode, // Just for demonstration
    };
  }

  @Post('employees')
  async createEmployee(
    @TenantConnection() pool: sql.ConnectionPool,
    @Body() body: { name: string; email: string },
  ) {
    const result = await pool
      .request()
      .input('name', sql.NVarChar, body.name)
      .input('email', sql.NVarChar, body.email)
      .query(`
        INSERT INTO employees (name, email, is_active, created_at)
        OUTPUT INSERTED.*
        VALUES (@name, @email, 1, GETDATE())
      `);
    
    return {
      success: true,
      data: result.recordset[0],
    };
  }
}

// ============================================
// OPTION 2: Using Guard at Method Level
// ============================================
@Controller('example2')
export class ExampleTenantController2 {
  
  @Get('data')
  @UseGuards(AuthGuard('jwt'), TenantConnectionGuard) // Apply guards at method level
  async getData(@TenantConnection() pool: sql.ConnectionPool) {
    const result = await pool.request().query('SELECT * FROM some_table');
    return result.recordset;
  }
}

