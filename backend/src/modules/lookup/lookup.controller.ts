import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LookupService } from './lookup.service';
import { LookupRequest } from './lookup.service';

@Controller('lookup')
export class LookupController {
  constructor(private lookupService: LookupService) {}

  @Post(':key')
  @UseGuards(AuthGuard('jwt'))
  async getLookup(
    @Request() req: any,
    @Body() body: LookupRequest,
  ) {
    const tenantId = req.user.tenant_id;
    const tenantCode = req.tenantCode;

    const result = await this.lookupService.getLookup(
      tenantId,
      tenantCode,
      body,
    );

    return {
      success: true,
      data: result,
    };
  }
}

