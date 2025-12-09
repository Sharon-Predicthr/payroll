import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';

@Controller('jobs')
@UseGuards(AuthGuard('jwt'))
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * GET /api/jobs
   * List jobs with filtering and pagination
   */
  @Get()
  async listJobs(@Query() filter: ListJobsDto, @Req() req: Request) {
    // TODO: Add permission check - only admin users should access this
    // For now, we'll allow any authenticated user
    
    // If tenant_id is not provided, filter by user's tenant
    if (!filter.tenant_id && req.user?.tenantCode) {
      // Get tenant ID from tenant code
      const tenantId = await this.jobsService.getTenantIdFromCode(req.user.tenantCode);
      filter.tenant_id = tenantId;
    }

    const result = await this.jobsService.listJobs(filter);
    return {
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * GET /api/jobs/:id
   * Get job by ID
   */
  @Get(':id')
  async getJob(@Param('id', ParseIntPipe) id: number) {
    const job = await this.jobsService.getJobById(id);
    return {
      success: true,
      data: job,
    };
  }

  /**
   * GET /api/jobs/:id/runs
   * Get job run history
   */
  @Get(':id/runs')
  async getJobRuns(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const runs = await this.jobsService.getJobRuns(id, limitNum);
    return {
      success: true,
      data: runs,
    };
  }

  /**
   * POST /api/jobs
   * Create a new scheduled job
   */
  @Post()
  async createJob(@Body() dto: CreateJobDto, @Req() req: Request) {
    // TODO: Add permission check - only admin users should create jobs
    
    // If tenant_id is not provided, use user's tenant
    if (!dto.tenant_id && req.user?.tenantCode) {
      const tenantId = await this.jobsService.getTenantIdFromCode(req.user.tenantCode);
      dto.tenant_id = tenantId;
    }

    const job = await this.jobsService.createJob(dto);
    return {
      success: true,
      data: job,
      message: 'Job created successfully',
    };
  }

  /**
   * PATCH /api/jobs/:id
   * Update an existing job
   */
  @Patch(':id')
  async updateJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobDto,
  ) {
    // TODO: Add permission check - only admin users should update jobs
    
    const job = await this.jobsService.updateJob(id, dto);
    return {
      success: true,
      data: job,
      message: 'Job updated successfully',
    };
  }
}

